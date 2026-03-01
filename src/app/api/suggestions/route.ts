import { NextResponse } from "next/server";
import { runEngine } from "@/lib/engine";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tomorrowOnly = searchParams.get("tomorrow") === "true";

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
    console.error("Suggestions GET error:", error);
    return NextResponse.json(
      { error: "Failed to run suggestion engine" },
      { status: 500 }
    );
  }
}
