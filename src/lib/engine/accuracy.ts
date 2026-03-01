import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { safeDivide, roundTo } from "@/lib/math";

export interface AccuracyResult {
  suggestionType: string;
  totalPredictions: number;
  avgExpectedRevenue: number;
  avgActualRevenue: number;
  mape: number; // Mean Absolute Percentage Error
  bias: "over" | "under" | "accurate";
  accuracy: number; // 0-100, inverse of MAPE
}

export interface AccuracyReport {
  results: AccuracyResult[];
  overallMape: number;
  overallAccuracy: number;
  recommendations: string[];
}

/**
 * Compares suggestion expectedImpact against DayClose actual revenue
 * to track prediction accuracy per suggestion type.
 */
export async function computeAccuracy(days = 30): Promise<AccuracyReport> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  try {
    const [suggestions, dayCloses, feedback] = await Promise.all([
      prisma.suggestion.findMany({
        where: { createdAt: { gte: since }, outcome: { not: null } },
      }),
      prisma.dayClose.findMany({
        where: { date: { gte: since } },
      }),
      prisma.suggestionFeedback.findMany({
        where: { createdAt: { gte: since } },
      }),
    ]);

    // Build revenue map by date
    const revenueByDate = new Map<string, number>();
    for (const dc of dayCloses) {
      const dateKey = new Date(dc.date).toISOString().split("T")[0];
      revenueByDate.set(dateKey, dc.totalRevenue);
    }

    // Group suggestions by type and correlate with day revenue
    const typeStats = new Map<string, { expected: number[]; actual: number[]; errors: number[] }>();

    for (const s of suggestions) {
      const dateKey = new Date(s.createdAt).toISOString().split("T")[0];
      const actualRevenue = revenueByDate.get(dateKey);
      if (actualRevenue == null) continue;

      let expectedRevenue = 0;
      if (s.expectedImpact) {
        try {
          const impact = JSON.parse(s.expectedImpact);
          expectedRevenue = impact.revenue ?? 0;
        } catch { /* malformed JSON */ }
      }
      if (expectedRevenue === 0) continue;

      const type = s.type;
      if (!typeStats.has(type)) {
        typeStats.set(type, { expected: [], actual: [], errors: [] });
      }
      const stats = typeStats.get(type)!;
      stats.expected.push(expectedRevenue);
      stats.actual.push(actualRevenue);

      const absError = Math.abs(safeDivide(actualRevenue - expectedRevenue, expectedRevenue, 0));
      stats.errors.push(absError);
    }

    // Compute per-type accuracy
    const results: AccuracyResult[] = [];
    let allErrors: number[] = [];

    for (const [type, stats] of typeStats.entries()) {
      if (stats.errors.length === 0) continue;

      const mape = roundTo(
        safeDivide(
          stats.errors.reduce((s, e) => s + e, 0),
          stats.errors.length,
          0
        ) * 100,
        1
      );

      const avgExpected = roundTo(
        safeDivide(stats.expected.reduce((s, e) => s + e, 0), stats.expected.length),
        2
      );
      const avgActual = roundTo(
        safeDivide(stats.actual.reduce((s, a) => s + a, 0), stats.actual.length),
        2
      );

      const bias: "over" | "under" | "accurate" =
        avgExpected > avgActual * 1.15 ? "over" :
        avgExpected < avgActual * 0.85 ? "under" : "accurate";

      results.push({
        suggestionType: type,
        totalPredictions: stats.errors.length,
        avgExpectedRevenue: avgExpected,
        avgActualRevenue: avgActual,
        mape,
        bias,
        accuracy: roundTo(Math.max(0, 100 - mape), 1),
      });

      allErrors = [...allErrors, ...stats.errors];
    }

    const overallMape = allErrors.length > 0
      ? roundTo(safeDivide(allErrors.reduce((s, e) => s + e, 0), allErrors.length) * 100, 1)
      : 0;

    // Generate auto-calibration recommendations
    const recommendations: string[] = [];
    for (const r of results) {
      if (r.mape > 50) {
        recommendations.push(
          `Typ "${r.suggestionType}" hat ${r.mape}% MAPE — Confidence sollte reduziert werden.`
        );
      }
      if (r.bias === "over") {
        recommendations.push(
          `Typ "${r.suggestionType}" ueberschaetzt Umsatz systematisch (${r.avgExpectedRevenue}€ erwartet vs ${r.avgActualRevenue}€ tatsaechlich).`
        );
      }
    }

    // Auto-calibrate confidence modifiers
    for (const r of results) {
      if (r.totalPredictions >= 5 && r.mape > 40) {
        try {
          const existing = await prisma.confidenceModifier.findFirst({
            where: { suggestionType: r.suggestionType },
          });
          const newModifier = Math.min(0, (existing?.modifier ?? 0) - Math.round(r.mape / 10));

          if (existing) {
            await prisma.confidenceModifier.update({
              where: { id: existing.id },
              data: {
                modifier: Math.max(-50, newModifier),
                isPaused: r.mape > 70,
              },
            });
          }
          logger.info(`Accuracy auto-calibration: ${r.suggestionType} modifier → ${newModifier}`, {
            source: "engine",
            type: r.suggestionType,
            mape: r.mape,
          });
        } catch { /* modifier update failed — not critical */ }
      }
    }

    // Factor in feedback data
    void feedback;

    return {
      results: results.sort((a, b) => b.mape - a.mape),
      overallMape,
      overallAccuracy: roundTo(Math.max(0, 100 - overallMape), 1),
      recommendations,
    };
  } catch (e) {
    logger.error("Accuracy computation failed", {
      source: "engine",
      error: e instanceof Error ? e.message : String(e),
    });
    return { results: [], overallMape: 0, overallAccuracy: 0, recommendations: [] };
  }
}
