import { NextResponse } from "next/server";
import { runEngine } from "@/lib/engine";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isBlankShop } from "@/lib/manager/blankReset";

const EMPTY_BREAK_EVEN = {
  dailyCost: 0,
  currentRevenue: 0,
  remainingTarget: 0,
  coffeeEquivalent: 0,
  isAchieved: true,
};

export async function GET(request: Request) {
  const startedAt = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const tomorrowOnly = searchParams.get("tomorrow") === "true";

    if (await isBlankShop()) {
      const settings = await prisma.shopSettings.findFirst();
      const fixed = settings?.fixedCostsDaily ?? 0;
      if (tomorrowOnly) {
        return NextResponse.json({ tomorrowSuggestions: [] });
      }
      return NextResponse.json({
        suggestions: [],
        tomorrowSuggestions: [],
        breakEven: {
          ...EMPTY_BREAK_EVEN,
          dailyCost: fixed,
          remainingTarget: fixed,
          isAchieved: false,
        },
        strategyMode: settings?.strategyMode ?? "balanced",
        dataQuality: 0,
      });
    }

    const result = await runEngine();

    if (tomorrowOnly) {
      return NextResponse.json({
        tomorrowSuggestions: result.tomorrowSuggestions ?? [],
      });
    }

    // Persist suggestions so they have IDs for feedback
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.suggestion.deleteMany({ where: { date: today } });

    const created = await prisma.$transaction(
      result.suggestions.map((s, i) =>
        prisma.suggestion.create({
          data: {
            date: today,
            type: s.type,
            category: s.category,
            title: s.title,
            description: s.description,
            timing: s.timing ?? null,
            reasoning: s.reasoning,
            expectedImpact: JSON.stringify(s.expectedImpact),
            confidence: s.confidence,
            riskLevel: s.riskLevel,
            difficulty: s.difficulty,
            inactionRisk: s.inactionRisk ?? null,
            strategyMode: result.strategyMode,
            score: s.score ?? 0,
            sortOrder: s.sortOrder ?? i,
          },
        })
      )
    );

    const suggestionsWithIds = result.suggestions.map((s, i) => ({
      ...s,
      id: created[i]?.id,
    }));

    return NextResponse.json({
      ...result,
      suggestions: suggestionsWithIds,
    });
  } catch (error) {
    logger.error("suggestions_fail", {
      source: "api/suggestions",
      durationMs: Date.now() - startedAt,
      errorClass: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Failed to run suggestion engine" },
      { status: 500 }
    );
  } finally {
    logger.info("suggestions_done", {
      source: "api/suggestions",
      durationMs: Date.now() - startedAt,
    });
  }
}
