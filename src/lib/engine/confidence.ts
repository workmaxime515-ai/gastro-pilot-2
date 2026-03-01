import { prisma } from "@/lib/db";
import { safeDivide } from "@/lib/math";
import { logger } from "@/lib/logger";
import type { CandidateSuggestion } from "./types";

/**
 * Compute historical success rates per suggestion type from ActionTracking + SuggestionFeedback.
 * Returns a map of type -> { doneRate, skipRate, totalActions }.
 */
async function getHistoricalSuccessRates(): Promise<
  Map<string, { doneRate: number; skipRate: number; totalActions: number; avgRating: number }>
> {
  const rates = new Map<string, { doneRate: number; skipRate: number; totalActions: number; avgRating: number }>();

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const actions = await prisma.actionTracking.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      include: { suggestion: true },
    });

    const feedback = await prisma.suggestionFeedback.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      include: { suggestion: true },
    });

    // Group actions by suggestion type
    const typeActions = new Map<string, { done: number; skipped: number; later: number }>();
    for (const a of actions) {
      if (!a.suggestion) continue;
      const type = a.suggestion.type;
      const entry = typeActions.get(type) ?? { done: 0, skipped: 0, later: 0 };
      if (a.status === "done") entry.done++;
      else if (a.status === "skipped") entry.skipped++;
      else if (a.status === "partial") entry.later++;
      typeActions.set(type, entry);
    }

    // Calculate feedback ratings per type
    const typeFeedback = new Map<string, { helpful: number; total: number }>();
    for (const f of feedback) {
      if (!f.suggestion) continue;
      const type = f.suggestion.type;
      const entry = typeFeedback.get(type) ?? { helpful: 0, total: 0 };
      entry.total++;
      if (f.isHelpful) entry.helpful++;
      typeFeedback.set(type, entry);
    }

    for (const [type, counts] of typeActions.entries()) {
      const total = counts.done + counts.skipped + counts.later;
      const fb = typeFeedback.get(type);
      rates.set(type, {
        doneRate: safeDivide(counts.done, total),
        skipRate: safeDivide(counts.skipped, total),
        totalActions: total,
        avgRating: fb ? safeDivide(fb.helpful, fb.total) : 0.5,
      });
    }
  } catch (e) {
    logger.warn("Failed to compute historical success rates", {
      source: "engine",
      error: e instanceof Error ? e.message : String(e),
    });
  }

  return rates;
}

export async function applyConfidenceModifiers(
  candidates: CandidateSuggestion[]
): Promise<CandidateSuggestion[]> {
  const types = [...new Set(candidates.map((c) => c.type))];

  const [modifiers, successRates] = await Promise.all([
    prisma.confidenceModifier.findMany({
      where: { suggestionType: { in: types } },
    }),
    getHistoricalSuccessRates(),
  ]);

  const modifierMap = new Map(
    modifiers.map((m) => [m.suggestionType, m])
  );

  const result: CandidateSuggestion[] = [];

  for (const c of candidates) {
    const mod = modifierMap.get(c.type);
    if (mod?.isPaused) continue;

    let adjustment = mod?.modifier ?? 0;

    // Feedback-Learning: adjust based on historical success/skip rates
    const history = successRates.get(c.type);
    if (history && history.totalActions >= 3) {
      // High skip rate -> reduce confidence
      if (history.skipRate > 0.6) {
        adjustment -= Math.round(history.skipRate * 20); // up to -20
      }
      // High done rate -> boost confidence
      if (history.doneRate > 0.6) {
        adjustment += Math.round(history.doneRate * 10); // up to +10
      }
      // Low feedback rating -> reduce confidence
      if (history.avgRating < 0.3 && history.totalActions >= 5) {
        adjustment -= 15;
      }
      // High feedback rating -> boost confidence
      if (history.avgRating > 0.7 && history.totalActions >= 5) {
        adjustment += 10;
      }
    }

    const newConfidence = Math.max(0, Math.min(100, c.confidence + adjustment));
    result.push({ ...c, confidence: newConfidence });
  }

  return result;
}

export async function updateConfidenceFromFeedback(
  suggestionType: string,
  isPositive: boolean
): Promise<void> {
  const existing = await prisma.confidenceModifier.findFirst({
    where: { suggestionType },
  });

  if (isPositive) {
    if (existing) {
      await prisma.confidenceModifier.update({
        where: { id: existing.id },
        data: { modifier: { increment: 5 }, consecutiveFails: 0 },
      });
    } else {
      await prisma.confidenceModifier.create({
        data: {
          suggestionType,
          modifier: 5,
          consecutiveFails: 0,
          isPaused: false,
        },
      });
    }
  } else {
    const newFails = (existing?.consecutiveFails ?? 0) + 1;
    if (existing) {
      await prisma.confidenceModifier.update({
        where: { id: existing.id },
        data: {
          modifier: { decrement: 10 },
          consecutiveFails: newFails,
          isPaused: newFails >= 5, // Increased threshold from 3 to 5
        },
      });
    } else {
      await prisma.confidenceModifier.create({
        data: {
          suggestionType,
          modifier: -10,
          consecutiveFails: 1,
          isPaused: false,
        },
      });
    }
  }

  logger.info(`Confidence updated: ${suggestionType} (${isPositive ? "positive" : "negative"})`, {
    source: "engine",
  });
}
