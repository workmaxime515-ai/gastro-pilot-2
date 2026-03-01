import { prisma } from "@/lib/db";
import { safeDivide, roundTo } from "@/lib/math";
import { logger } from "@/lib/logger";
import type { CandidateSuggestion } from "./types";

interface AnomalyResult {
  type: "revenue_drop" | "waste_spike" | "temp_violation" | "cash_discrepancy" | "demand_surge";
  severity: "warning" | "critical";
  metric: string;
  currentValue: number;
  expectedValue: number;
  zScore: number;
  message: string;
}

function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

function stdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Detect anomalies across all metrics and generate emergency suggestions.
 */
export async function detectAnomalies(): Promise<{
  anomalies: AnomalyResult[];
  suggestions: CandidateSuggestion[];
}> {
  const anomalies: AnomalyResult[] = [];
  const suggestions: CandidateSuggestion[] = [];

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days28Ago = new Date(today);
  days28Ago.setDate(days28Ago.getDate() - 28);

  try {
    const [dayCloses, wasteLogs, tempLogs, cashCounts] = await Promise.all([
      prisma.dayClose.findMany({ where: { date: { gte: days28Ago } }, orderBy: { date: "asc" } }),
      prisma.wasteLog.findMany({ where: { date: { gte: days28Ago } }, include: { product: true } }),
      prisma.tempLog.findMany({ where: { recordedAt: { gte: new Date(Date.now() - 24 * 3600000) } } }),
      prisma.cashCount.findMany({ where: { date: { gte: days28Ago } }, orderBy: { date: "desc" }, take: 7 }),
    ]);

    // --- Revenue anomaly ---
    if (dayCloses.length >= 7) {
      const revenues = dayCloses.map((dc) => dc.totalRevenue);
      const mean = safeDivide(revenues.reduce((s, r) => s + r, 0), revenues.length);
      const sd = stdDev(revenues, mean);

      const latest = dayCloses[dayCloses.length - 1];
      if (latest) {
        const z = zScore(latest.totalRevenue, mean, sd);

        if (z < -2) {
          anomalies.push({
            type: "revenue_drop",
            severity: z < -3 ? "critical" : "warning",
            metric: "Tagesumsatz",
            currentValue: latest.totalRevenue,
            expectedValue: roundTo(mean),
            zScore: roundTo(z, 2),
            message: `Umsatz (${latest.totalRevenue.toFixed(0)} EUR) liegt ${Math.abs(roundTo(z, 1))} Standardabweichungen unter dem Durchschnitt (${mean.toFixed(0)} EUR).`,
          });

          suggestions.push({
            type: "risk",
            category: "emergency",
            title: `Ungewoehnlich niedriger Umsatz: ${latest.totalRevenue.toFixed(0)} EUR`,
            description: `Der gestrige Umsatz war deutlich unter dem 28-Tage-Durchschnitt von ${mean.toFixed(0)} EUR. Ursache pruefen.`,
            timing: "Sofort",
            reasoning: `Z-Score: ${z.toFixed(2)} (< -2 = Anomalie). Ø 28 Tage: ${mean.toFixed(0)} EUR. Gestern: ${latest.totalRevenue.toFixed(0)} EUR.`,
            expectedImpact: { revenue: Math.round(mean - latest.totalRevenue) },
            confidence: 85,
            riskLevel: "high",
            difficulty: "medium",
            inactionRisk: "Wiederholter Umsatzverlust wenn Ursache nicht identifiziert wird.",
          });
        }

        if (z > 2) {
          anomalies.push({
            type: "demand_surge",
            severity: "warning",
            metric: "Tagesumsatz",
            currentValue: latest.totalRevenue,
            expectedValue: roundTo(mean),
            zScore: roundTo(z, 2),
            message: `Umsatz-Spitze: ${latest.totalRevenue.toFixed(0)} EUR (${roundTo(z, 1)}σ ueber Durchschnitt).`,
          });
        }
      }
    }

    // --- Waste anomaly ---
    const wasteByDate = new Map<string, number>();
    for (const w of wasteLogs) {
      const dateKey = new Date(w.date).toISOString().split("T")[0];
      wasteByDate.set(dateKey, (wasteByDate.get(dateKey) ?? 0) + w.quantity);
    }

    const wasteValues = Array.from(wasteByDate.values());
    if (wasteValues.length >= 7) {
      const mean = safeDivide(wasteValues.reduce((s, v) => s + v, 0), wasteValues.length);
      const sd = stdDev(wasteValues, mean);
      const latest = wasteValues[wasteValues.length - 1];

      if (latest !== undefined) {
        const z = zScore(latest, mean, sd);

        if (z > 2) {
          anomalies.push({
            type: "waste_spike",
            severity: z > 3 ? "critical" : "warning",
            metric: "Tagesabfall",
            currentValue: latest,
            expectedValue: roundTo(mean),
            zScore: roundTo(z, 2),
            message: `Abfall-Spitze: ${latest} Stueck (${roundTo(z, 1)}σ ueber Durchschnitt von ${mean.toFixed(0)}).`,
          });

          suggestions.push({
            type: "waste",
            category: "emergency",
            title: `Abfall-Anomalie: ${latest} Stueck (Ø ${mean.toFixed(0)})`,
            description: `Deutlich mehr Abfall als ueblich. Ueberproduktion, Qualitaetsproblem oder Lagerfehler pruefen.`,
            timing: "Sofort",
            reasoning: `Z-Score: ${z.toFixed(2)}. Ø Abfall: ${mean.toFixed(0)} Stueck/Tag.`,
            expectedImpact: { waste: Math.round(latest - mean) },
            confidence: 80,
            riskLevel: "high",
            difficulty: "easy",
            inactionRisk: "Fortgesetzter Warenverlust.",
          });
        }
      }
    }

    // --- Temperature violations ---
    const violations = tempLogs.filter((t) => !t.inRange);
    if (violations.length >= 2) {
      const worstViolation = violations.reduce(
        (worst, v) => Math.abs(v.temperature) > Math.abs(worst.temperature) ? v : worst,
        violations[0]
      );

      anomalies.push({
        type: "temp_violation",
        severity: violations.length >= 3 ? "critical" : "warning",
        metric: "Temperatur",
        currentValue: worstViolation.temperature,
        expectedValue: 0,
        zScore: 0,
        message: `${violations.length} Temperaturverletzungen in 24h. Schlimmste: ${worstViolation.equipment} bei ${worstViolation.temperature}°C.`,
      });

      suggestions.push({
        type: "risk",
        category: "emergency",
        title: `${violations.length}x Temperatur ausserhalb des Bereichs`,
        description: `${worstViolation.equipment}: ${worstViolation.temperature}°C. Sofort pruefen — Lebensmittelsicherheit!`,
        timing: "Sofort",
        reasoning: `${violations.length} Verletzungen in den letzten 24h.`,
        expectedImpact: { stress: "reduces" },
        confidence: 95,
        riskLevel: "high",
        difficulty: "easy",
        inactionRisk: "Gesundheitsrisiko, moeglicher Warenverlust, HACCP-Verstoss.",
      });
    }

    // --- Cash discrepancy ---
    if (cashCounts.length >= 3) {
      const discrepancies = cashCounts.map((cc) => {
        const expected = cc.openAmount + (cc.cardTotal ?? 0);
        return Math.abs(cc.closeAmount - expected);
      });
      const mean = safeDivide(discrepancies.reduce((s, d) => s + d, 0), discrepancies.length);
      const sd = stdDev(discrepancies, mean);
      const latest = discrepancies[0];

      if (latest !== undefined && latest > 20) {
        const z = zScore(latest, mean, sd);
        if (z > 2) {
          anomalies.push({
            type: "cash_discrepancy",
            severity: latest > 50 ? "critical" : "warning",
            metric: "Kassendifferenz",
            currentValue: latest,
            expectedValue: roundTo(mean),
            zScore: roundTo(z, 2),
            message: `Kassendifferenz von ${latest.toFixed(2)} EUR (Ø ${mean.toFixed(2)} EUR).`,
          });
        }
      }
    }
  } catch (e) {
    logger.error("Anomaly detection failed", {
      source: "engine",
      error: e instanceof Error ? e.message : String(e),
    });
  }

  return { anomalies, suggestions };
}
