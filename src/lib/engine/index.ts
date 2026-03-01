/**
 * Engine Orchestrator
 * Runs the full suggestion pipeline: Analyze → Generate → Confidence → Guardrails → Score
 */

import { prisma } from "@/lib/db";
import { analyze } from "./analyzer";
import { generateSuggestions } from "./generator";
import { applyConfidenceModifiers } from "./confidence";
import { applyGuardrails } from "./guardrails";
import { scoreSuggestions } from "./scorer";
import { getTomorrowSuggestions } from "./tomorrow";
import { getBreakEvenStatus } from "./break-even";
import { fetchAndStoreWeather } from "./weather";
import { generateReorderSuggestions } from "./reorder";
import { detectAnomalies } from "./anomaly";
import type { CandidateSuggestion, StrategyMode } from "./types";

export interface EngineResult {
  suggestions: CandidateSuggestion[];
  tomorrowSuggestions: CandidateSuggestion[];
  breakEven: {
    dailyCost: number;
    currentRevenue: number;
    remainingTarget: number;
    coffeeEquivalent: number;
    isAchieved: boolean;
  };
  generatedAt: Date;
  strategyMode: StrategyMode;
  dataQuality: number;
}

/**
 * Run the full suggestion engine pipeline
 */
export async function runEngine(): Promise<EngineResult> {
  // 0. Fetch weather if stale (non-blocking, fail-safe)
  fetchAndStoreWeather().catch((e) => console.warn("[Engine] Weather fetch failed:", e));

  // 1. Get current strategy mode from settings
  const settings = await prisma.shopSettings.findFirst();
  const strategyMode = (settings?.strategyMode as StrategyMode) || "balanced";

  // 2. Run analysis, break-even, and tomorrow in parallel
  const [analysis, breakEven, tomorrowRaw] = await Promise.all([
    analyze(),
    getBreakEvenStatus(),
    getTomorrowSuggestions(),
  ]);

  // 3. Generate candidate suggestions + reorder + anomalies
  const [generated, reorder, anomalyResult] = await Promise.all([
    generateSuggestions(analysis),
    generateReorderSuggestions(),
    detectAnomalies(),
  ]);
  let candidates = [...generated, ...reorder, ...anomalyResult.suggestions];

  // 4. Apply confidence modifiers from DB
  candidates = await applyConfidenceModifiers(candidates);

  // 5. Apply safety guardrails
  candidates = applyGuardrails(candidates);

  // 6. Score and select top 5
  const suggestions = scoreSuggestions(candidates, strategyMode);

  // 7. Apply guardrails to tomorrow suggestions too
  const tomorrowSuggestions = applyGuardrails(tomorrowRaw);

  return {
    suggestions,
    tomorrowSuggestions: tomorrowSuggestions.slice(0, 3),
    breakEven,
    generatedAt: new Date(),
    strategyMode,
    dataQuality: analysis.dataQuality,
  };
}

/**
 * Re-run engine for a specific strategy mode (e.g., user switches mode)
 */
export async function runEngineWithMode(mode: StrategyMode): Promise<EngineResult> {
  const [analysis, breakEven, tomorrowRaw] = await Promise.all([
    analyze(),
    getBreakEvenStatus(),
    getTomorrowSuggestions(),
  ]);

  const [gen2, reorder2, anomaly2] = await Promise.all([
    generateSuggestions(analysis),
    generateReorderSuggestions(),
    detectAnomalies(),
  ]);
  let candidates = [...gen2, ...reorder2, ...anomaly2.suggestions];
  candidates = await applyConfidenceModifiers(candidates);
  candidates = applyGuardrails(candidates);
  const suggestions = scoreSuggestions(candidates, mode);
  const tomorrowSuggestions = applyGuardrails(tomorrowRaw);

  return {
    suggestions,
    tomorrowSuggestions: tomorrowSuggestions.slice(0, 3),
    breakEven,
    generatedAt: new Date(),
    strategyMode: mode,
    dataQuality: analysis.dataQuality,
  };
}

// Re-export types and utilities
export type { CandidateSuggestion, StrategyMode } from "./types";
export { updateConfidenceFromFeedback } from "./confidence";
export { getBreakEvenHistory } from "./break-even";
export { getProfitRanking, predictCustomerFlow, getWeeklyCoachSummary, getProfitPerHour } from "./extras";
export { fetchAndStoreWeather, getWeatherForDate, getWeatherAlerts } from "./weather";
export { detectAnomalies } from "./anomaly";
export { analyzeStrategyPerformance } from "./optimizer";
export { computeAccuracy } from "./accuracy";
