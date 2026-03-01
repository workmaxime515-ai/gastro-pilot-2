/**
 * Emergency Engine
 * Handles 6 emergency types with immediate re-calculation of suggestions
 * Types: vendor, damaged, equipment, staff, rush, power
 */

import { prisma } from "@/lib/db";
import { analyze } from "./analyzer";
import { generateSuggestions } from "./generator";
import { applyGuardrails } from "./guardrails";
import { scoreSuggestions } from "./scorer";
import type {
  EmergencyInput,
  EmergencyType,
  CandidateSuggestion,
  StrategyMode,
} from "./types";

// ─── Emergency Templates ────────────────────────────────────

interface EmergencyTemplate {
  title: string;
  getActions: (input: EmergencyInput) => CandidateSuggestion[];
}

const EMERGENCY_TEMPLATES: Record<EmergencyType, EmergencyTemplate> = {
  vendor: {
    title: "Lieferanten-Problem",
    getActions: (input) => [
      {
        type: "risk",
        category: "stress",
        title: "Sofort: Alternative Lieferanten kontaktieren",
        description: `Lieferproblem gemeldet. ${input.details || "Lieferung ausgefallen oder verspätet."}`,
        timing: "Sofort",
        reasoning: "Ohne Lieferung fehlen möglicherweise Kernprodukte für morgen.",
        expectedImpact: { revenue: -200, stress: "increases" },
        confidence: 90,
        riskLevel: "high",
        difficulty: "medium",
        inactionRisk: "Morgen könnten Kernprodukte fehlen. Umsatzverlust wahrscheinlich.",
      },
      {
        type: "demand",
        category: "waste",
        title: "Menü anpassen: Betroffene Produkte streichen",
        description: "Produkte, die von der Lieferung abhängen, heute aus dem Angebot nehmen.",
        timing: "Nächste 30 Minuten",
        reasoning: "Bestand schonen und Enttäuschung bei Kunden vermeiden.",
        expectedImpact: { waste: -30, stress: "reduces" },
        confidence: 95,
        riskLevel: "low",
        difficulty: "easy",
        inactionRisk: "Kunden bestellen Produkte, die nicht lieferbar sind → schlechte Erfahrung.",
      },
    ],
  },

  damaged: {
    title: "Ware beschädigt",
    getActions: (input) => [
      {
        type: "waste",
        category: "waste",
        title: "Beschädigte Ware sofort dokumentieren und entsorgen",
        description: `${input.details || "Ware beschädigt."} Dokumentation für Versicherung/Lieferant erstellen.`,
        timing: "Sofort",
        reasoning: "Lebensmittelsicherheit hat Vorrang. Beschädigte Ware darf nicht verkauft werden.",
        expectedImpact: { waste: 20, stress: "increases" },
        confidence: 100,
        riskLevel: "high",
        difficulty: "easy",
        inactionRisk: "Gesundheitsrisiko für Kunden. Mögliche Ordnungswidrigkeiten.",
      },
      {
        type: "demand",
        category: "profit",
        title: "Nachbestellung oder Ersatz organisieren",
        description: "Prüfe, ob eine Expresslieferung möglich ist oder ob ein Alternativprodukt verfügbar ist.",
        timing: "Innerhalb 1 Stunde",
        reasoning: "Minimierung des Umsatzausfalls durch schnelle Reaktion.",
        expectedImpact: { revenue: -100, stress: "increases" },
        confidence: 80,
        riskLevel: "medium",
        difficulty: "medium",
        inactionRisk: "Bestimmte Produkte sind den ganzen Tag nicht verfügbar.",
      },
    ],
  },

  equipment: {
    title: "Geräte-Ausfall",
    getActions: (input) => [
      {
        type: "risk",
        category: "stress",
        title: `Sofort: ${input.affectedEquipment || "Gerät"} — Techniker rufen`,
        description: `${input.affectedEquipment || "Ein wichtiges Gerät"} ist ausgefallen. ${input.details || ""}`,
        timing: "Sofort",
        reasoning: "Je schneller die Reparatur, desto geringer der Umsatzverlust.",
        expectedImpact: { revenue: -300, stress: "increases" },
        confidence: 95,
        riskLevel: "high",
        difficulty: "medium",
        inactionRisk: "Ohne Gerät ist die Produktion stark eingeschränkt.",
      },
      {
        type: "demand",
        category: "stress",
        title: "Notfall-Menü: Nur Produkte ohne das defekte Gerät",
        description: "Passe die Karte an, damit nur noch Produkte angeboten werden, die ohne das defekte Gerät zubereitet werden können.",
        timing: "Nächste 15 Minuten",
        reasoning: "Kunden transparent informieren. Lieber weniger anbieten als schlecht.",
        expectedImpact: { revenue: -150, stress: "reduces" },
        confidence: 90,
        riskLevel: "low",
        difficulty: "easy",
        inactionRisk: "Lange Wartezeiten, genervte Kunden, Stress für das Team.",
      },
    ],
  },

  staff: {
    title: "Personal-Ausfall",
    getActions: (input) => [
      {
        type: "risk",
        category: "stress",
        title: "Ersatz suchen oder Betrieb anpassen",
        description: `${input.details || "Ein Teammitglied ist ausgefallen."} Prüfe, ob jemand einspringen kann.`,
        timing: "Sofort",
        reasoning: "Ohne Ersatz steigt die Belastung. Fehlerrate und Wartezeiten steigen.",
        expectedImpact: { stress: "increases" },
        confidence: 90,
        riskLevel: "medium",
        difficulty: "medium",
        inactionRisk: "Team ist überlastet. Servicequalität sinkt.",
      },
      {
        type: "demand",
        category: "stress",
        title: "Reduziertes Menü aktivieren",
        description: "Weniger Produkte anbieten, um mit weniger Personal zurechtzukommen.",
        timing: "Nächste 30 Minuten",
        reasoning: "Lieber weniger anbieten als den Service-Standard zu senken.",
        expectedImpact: { revenue: -100, waste: -20, stress: "reduces" },
        confidence: 85,
        riskLevel: "low",
        difficulty: "easy",
        inactionRisk: "Überlastung → schlechter Service → unzufriedene Kunden.",
      },
    ],
  },

  rush: {
    title: "Unerwarteter Ansturm",
    getActions: (input) => [
      {
        type: "rush",
        category: "profit",
        title: "Rush-Modus: Schnell-Produkte priorisieren",
        description: `Unerwartet viel los! ${input.details || ""} Priorisiere Produkte mit kurzer Zubereitungszeit.`,
        timing: "Sofort",
        reasoning: "Durchsatz maximieren. Schnelle Produkte = mehr Umsatz pro Minute.",
        expectedImpact: { revenue: 200, stress: "increases" },
        confidence: 95,
        riskLevel: "low",
        difficulty: "easy",
        inactionRisk: "Lange Schlange → Kunden gehen. Umsatz geht verloren.",
      },
      {
        type: "demand",
        category: "profit",
        title: "Nachproduktion starten: Bestseller aufstocken",
        description: "Die beliebtesten Produkte schnell nachproduzieren, bevor sie ausgehen.",
        timing: "Nächste 15 Minuten",
        reasoning: "Bei unerwartetem Andrang gehen Bestseller zuerst aus.",
        expectedImpact: { revenue: 150, waste: 10 },
        confidence: 85,
        riskLevel: "medium",
        difficulty: "medium",
        inactionRisk: "Bestseller sind ausverkauft → Kunden enttäuscht, Umsatz sinkt.",
      },
    ],
  },

  power: {
    title: "Stromausfall / Kühlungsausfall",
    getActions: (input) => [
      {
        type: "risk",
        category: "emergency",
        title: "FOOD SAFETY: Kühlkette dokumentieren",
        description: "Sofort Temperaturen dokumentieren. Timer starten: Nach 2 Stunden ohne Kühlung müssen verderbliche Waren entsorgt werden.",
        timing: "SOFORT",
        reasoning: "Gesetzliche Vorgabe: Kühlkette darf max. 2 Stunden unterbrochen werden.",
        expectedImpact: { waste: 50, stress: "increases" },
        confidence: 100,
        riskLevel: "high",
        difficulty: "easy",
        inactionRisk: "Gesundheitsrisiko. Bußgeld bei Kontrolle. Imageschaden.",
      },
      {
        type: "risk",
        category: "emergency",
        title: "Stromversorger / Hausverwaltung kontaktieren",
        description: `${input.details || "Stromausfall / Kühlungsproblem."} Ursache klären und Zeitrahmen erfragen.`,
        timing: "Sofort",
        reasoning: "Ohne Strom ist der Betrieb stark eingeschränkt.",
        expectedImpact: { revenue: -500, stress: "increases" },
        confidence: 95,
        riskLevel: "high",
        difficulty: "medium",
        inactionRisk: "Ohne Information keine Planung möglich.",
      },
      {
        type: "demand",
        category: "waste",
        title: "Verderbliche Ware: Sofort-Verkauf oder Entsorgung planen",
        description: "Prüfe, welche Waren noch sicher verkauft werden können (z.B. Rabattaktion). Rest dokumentieren und entsorgen.",
        timing: "Innerhalb 30 Minuten",
        reasoning: "Verluste minimieren, solange die Ware noch sicher ist.",
        expectedImpact: { waste: -20, revenue: -200 },
        confidence: 85,
        riskLevel: "medium",
        difficulty: "medium",
        inactionRisk: "Gesamter verderblicher Bestand geht verloren.",
      },
    ],
  },
};

// ─── Food Safety Timer ──────────────────────────────────────

export interface FoodSafetyTimer {
  id: string;
  startedAt: Date;
  maxDurationMinutes: number;
  description: string;
  isActive: boolean;
  remainingMinutes: number;
}

/**
 * Start a food safety timer (e.g., cooling chain broken)
 */
export async function startFoodSafetyTimer(
  emergencyLogId: string,
  maxMinutes: number = 120,
  description: string = "Kühlkette unterbrochen"
): Promise<FoodSafetyTimer> {
  const now = new Date();
  // Store in EmergencyLog's resolvedAt as null (timer active)
  await prisma.emergencyLog.update({
    where: { id: emergencyLogId },
    data: { resolvedAt: null },
  });

  return {
    id: emergencyLogId,
    startedAt: now,
    maxDurationMinutes: maxMinutes,
    description,
    isActive: true,
    remainingMinutes: maxMinutes,
  };
}

/**
 * Check food safety timer status
 */
export function checkTimerStatus(timer: FoodSafetyTimer): FoodSafetyTimer {
  const now = new Date();
  const elapsedMs = now.getTime() - timer.startedAt.getTime();
  const elapsedMinutes = elapsedMs / (1000 * 60);
  const remaining = Math.max(0, timer.maxDurationMinutes - elapsedMinutes);

  return {
    ...timer,
    remainingMinutes: Math.round(remaining),
    isActive: remaining > 0,
  };
}

// ─── Main Emergency Handler ─────────────────────────────────

export interface EmergencyResult {
  emergencyId: string;
  type: EmergencyType;
  title: string;
  immediateSuggestions: CandidateSuggestion[];
  adaptedDailySuggestions: CandidateSuggestion[];
  foodSafetyTimer?: FoodSafetyTimer;
  loggedAt: Date;
}

/**
 * Handle an emergency: log it, generate immediate suggestions, re-calculate daily suggestions
 */
export async function handleEmergency(
  input: EmergencyInput
): Promise<EmergencyResult> {
  // 1. Log the emergency
  const log = await prisma.emergencyLog.create({
    data: {
      type: input.type,
      description: input.details || EMERGENCY_TEMPLATES[input.type].title,
      severity: input.severity || "medium",
      affectedProducts: input.affectedProductIds
        ? JSON.stringify(input.affectedProductIds)
        : null,
      affectedEquipment: input.affectedEquipment ?? null,
      actionsTaken: "[]",
    },
  });

  // 2. Get immediate suggestions from templates
  const template = EMERGENCY_TEMPLATES[input.type];
  const immediateSuggestions = template.getActions(input);

  // 3. Start food safety timer if power/cooling emergency
  let foodSafetyTimer: FoodSafetyTimer | undefined;
  if (input.type === "power") {
    foodSafetyTimer = await startFoodSafetyTimer(
      log.id,
      120,
      "Kühlkette unterbrochen — 2h Timer gestartet"
    );
  }

  // 4. Re-calculate daily suggestions with emergency context
  const settings = await prisma.shopSettings.findFirst();
  const strategyMode = (settings?.strategyMode as StrategyMode) || "balanced";

  const analysis = await analyze();
  let candidates = await generateSuggestions(analysis);

  // Boost stress-reducing suggestions during emergencies
  candidates = candidates.map((c) => ({
    ...c,
    confidence:
      c.category === "stress" ? Math.min(100, c.confidence + 15) : c.confidence,
  }));

  const adapted = applyGuardrails(candidates);
  // During emergencies, prioritize stress mode regardless of settings
  const adaptedDaily = scoreSuggestions(adapted, "stress");

  return {
    emergencyId: log.id,
    type: input.type,
    title: template.title,
    immediateSuggestions,
    adaptedDailySuggestions: adaptedDaily,
    foodSafetyTimer,
    loggedAt: log.createdAt,
  };
}

/**
 * Resolve an emergency
 */
export async function resolveEmergency(
  emergencyId: string,
  actionsTaken: string[]
): Promise<void> {
  await prisma.emergencyLog.update({
    where: { id: emergencyId },
    data: {
      resolvedAt: new Date(),
      actionsTaken: JSON.stringify(actionsTaken),
    },
  });
}

/**
 * Get active (unresolved) emergencies
 */
export async function getActiveEmergencies() {
  return prisma.emergencyLog.findMany({
    where: { resolvedAt: null },
    orderBy: { createdAt: "desc" },
  });
}
