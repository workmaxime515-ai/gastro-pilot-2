import type { CandidateSuggestion, StrategyMode } from "./types";
import { clamp } from "@/lib/math";

type Direction = "more" | "less" | "neutral";

function getStressNumeric(stress?: string): number {
  if (!stress) return 0;
  if (stress === "reduces") return 1;
  if (stress === "increases") return -1;
  return 0;
}

function getStrategyWeights(mode: StrategyMode) {
  switch (mode) {
    case "profit":
      return { revenue: 1.5, waste: 0.8, stress: 0.5 };
    case "waste":
      return { revenue: 0.8, waste: 2, stress: 0.8 };
    case "stress":
      return { revenue: 0.5, waste: 0.8, stress: 2 };
    case "balanced":
      return { revenue: 1, waste: 1, stress: 1 };
    default:
      return { revenue: 1, waste: 1, stress: 1 };
  }
}

function getDifficultyBonus(difficulty: string, mode: StrategyMode): number {
  if (mode !== "stress") return 0;
  switch (difficulty) {
    case "easy":
      return 20;
    case "medium":
      return 10;
    case "hard":
      return -10;
    default:
      return 0;
  }
}

function extractProductKey(s: CandidateSuggestion): string {
  const t = s.title.toLowerCase();
  const stopwords = [
    "mehr", "weniger", "produzieren", "reduzieren", "erhöhen",
    "senken", "steigern", "um", "prozent", "%",
    "die", "der", "das", "den", "und", "für",
  ];
  const words = t.split(/\s+/).filter((w) => w.length > 2 && !stopwords.includes(w));
  const key = words.slice(0, 3).join("-") || s.type;
  return `${s.type}:${key}`;
}

function getDirection(s: CandidateSuggestion): Direction {
  const t = s.title.toLowerCase();
  const r = s.reasoning.toLowerCase();
  const text = t + " " + r;
  if (/(mehr|erhöhen|steigern|erhöh|produzieren)\b/.test(text)) return "more";
  if (/(weniger|reduzieren|senken|reduzi)\b/.test(text)) return "less";
  return "neutral";
}

function contradicts(a: CandidateSuggestion, b: CandidateSuggestion): boolean {
  const dirA = getDirection(a);
  const dirB = getDirection(b);
  if (dirA === "neutral" || dirB === "neutral") return false;
  if (dirA === dirB) return false;
  return extractProductKey(a) === extractProductKey(b);
}

/**
 * Calculate urgency multiplier based on suggestion context.
 * Break-even not met or critical stockout = high urgency.
 */
function getUrgencyMultiplier(s: CandidateSuggestion): number {
  let urgency = 1.0;

  if (s.category === "emergency") urgency = 2.0;
  else if (s.type === "breakeven") urgency = 1.8;
  else if (s.type === "reorder" && s.riskLevel === "high") urgency = 1.5;
  else if (s.type === "risk") urgency = 1.3;

  if (s.inactionRisk && s.inactionRisk.length > 50) urgency *= 1.1;

  return clamp(urgency, 1.0, 2.5);
}

/**
 * Time relevance: suggestions with timing closer to the current time get a boost.
 */
function getTimeRelevance(s: CandidateSuggestion): number {
  if (!s.timing) return 0.5;
  const now = new Date();
  const currentHour = now.getHours();

  const timeMatch = s.timing.match(/(\d{1,2}):?(\d{2})?/);
  if (!timeMatch) return 0.5;

  const suggestedHour = parseInt(timeMatch[1], 10);
  const hourDiff = Math.abs(currentHour - suggestedHour);

  if (hourDiff <= 1) return 1.0;
  if (hourDiff <= 3) return 0.7;
  if (hourDiff <= 6) return 0.4;
  return 0.2;
}

/**
 * Risk penalty: high risk + low confidence = heavy penalty.
 */
function getRiskPenalty(s: CandidateSuggestion): number {
  if (s.riskLevel === "high" && s.confidence < 60) return 20;
  if (s.riskLevel === "high" && s.confidence < 75) return 10;
  if (s.riskLevel === "medium" && s.confidence < 50) return 10;
  return 0;
}

/**
 * Enforce diversity: max 2 suggestions per type, max 3 per category.
 */
function enforceDiversity(sorted: CandidateSuggestion[]): CandidateSuggestion[] {
  const typeCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const result: CandidateSuggestion[] = [];

  for (const s of sorted) {
    const typeCount = typeCounts.get(s.type) ?? 0;
    const catCount = categoryCounts.get(s.category) ?? 0;

    if (typeCount >= 2) continue;
    if (catCount >= 3) continue;

    result.push(s);
    typeCounts.set(s.type, typeCount + 1);
    categoryCounts.set(s.category, catCount + 1);
  }

  return result;
}

export function scoreSuggestions(
  candidates: CandidateSuggestion[],
  mode: StrategyMode
): CandidateSuggestion[] {
  const weights = getStrategyWeights(mode);

  const scored = candidates.map((s) => {
    const revenue = s.expectedImpact.revenue ?? 0;
    const waste = s.expectedImpact.waste ?? 0;
    const stressNum = getStressNumeric(s.expectedImpact.stress);

    const impactScore =
      revenue * weights.revenue +
      waste * weights.waste +
      stressNum * 50 * weights.stress;

    const difficultyBonus = getDifficultyBonus(s.difficulty, mode);
    const urgencyMultiplier = getUrgencyMultiplier(s);
    const timeRelevance = getTimeRelevance(s);
    const riskPenalty = getRiskPenalty(s);

    // New formula: weighted components
    const totalScore =
      s.confidence * 0.4 +
      impactScore * 0.3 +
      urgencyMultiplier * 20 * 0.2 +
      timeRelevance * 20 * 0.1 +
      difficultyBonus -
      riskPenalty;

    return { ...s, score: Math.max(0, totalScore) };
  });

  const byScore = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Remove contradictions
  const withoutContradictions: CandidateSuggestion[] = [];
  for (const s of byScore) {
    const conflicting = withoutContradictions.find((other) =>
      contradicts(s, other)
    );
    if (conflicting) {
      const sScore = s.score ?? 0;
      const otherScore = conflicting.score ?? 0;
      if (sScore > otherScore) {
        withoutContradictions.splice(
          withoutContradictions.indexOf(conflicting),
          1
        );
        withoutContradictions.push(s);
      }
    } else {
      withoutContradictions.push(s);
    }
  }

  // Sort and enforce diversity
  const sorted = [...withoutContradictions].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0)
  );

  const diverse = enforceDiversity(sorted);

  return diverse.slice(0, 5).map((s, i) => ({
    ...s,
    sortOrder: i,
  }));
}
