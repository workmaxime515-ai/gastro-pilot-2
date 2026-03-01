import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const days = parseInt(req.nextUrl.searchParams.get("days") ?? "30");
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const suggestions = await prisma.suggestion.findMany({
      where: { date: { gte: since } },
      include: { actionTracking: true, feedback: true },
      orderBy: { date: "desc" },
    });

    const dayCloses = await prisma.dayClose.findMany({
      where: { date: { gte: since } },
    });

    const dayCloseMap = new Map(
      dayCloses.map((dc) => [dc.date.toISOString().split("T")[0], dc])
    );

    const outcomes = suggestions.map((s) => {
      const dateKey = s.date.toISOString().split("T")[0];
      const dayClose = dayCloseMap.get(dateKey);

      let expectedRevenue = 0;
      try {
        const impact = JSON.parse(s.expectedImpact || "{}");
        expectedRevenue = impact.revenue ?? 0;
      } catch { /* ignore */ }

      let actualRevenue: number | null = null;
      if (dayClose) {
        actualRevenue = dayClose.totalRevenue;
      }

      const wasCompleted = s.actionTracking?.status === "done";
      const wasSkipped = s.actionTracking?.status === "skipped";

      let computedOutcome: string = "pending";
      if (dayClose && wasCompleted && expectedRevenue > 0) {
        const ratio = (actualRevenue ?? 0) / Math.max(1, expectedRevenue);
        if (ratio >= 0.8) computedOutcome = "success";
        else if (ratio >= 0.5) computedOutcome = "partial";
        else computedOutcome = "failure";
      } else if (wasSkipped) {
        computedOutcome = "skipped";
      } else if (wasCompleted && !dayClose) {
        computedOutcome = "no_data";
      }

      return {
        id: s.id,
        date: dateKey,
        type: s.type,
        title: s.title,
        confidence: s.confidence,
        expectedImpact: s.expectedImpact,
        actualImpact: s.actualImpact,
        outcome: s.outcome ?? computedOutcome,
        action: s.actionTracking?.status ?? "pending",
        dayRevenue: dayClose?.totalRevenue ?? null,
        dayWaste: dayClose?.totalWaste ?? null,
      };
    });

    const stats = {
      total: outcomes.length,
      completed: outcomes.filter((o) => o.action === "done").length,
      skipped: outcomes.filter((o) => o.action === "skipped").length,
      successRate: 0,
      avgConfidence: 0,
    };

    const completed = outcomes.filter((o) => o.action === "done");
    if (completed.length > 0) {
      stats.successRate = Math.round(
        (completed.filter((o) => o.outcome === "success").length / completed.length) * 100
      );
      stats.avgConfidence = Math.round(
        completed.reduce((s, o) => s + o.confidence, 0) / completed.length
      );
    }

    return NextResponse.json({ outcomes, stats });
  } catch (e) {
    console.error("Outcomes GET error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { suggestionId, actualImpact, outcome } = body;

    if (!suggestionId) {
      return NextResponse.json({ error: "suggestionId erforderlich" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (actualImpact) data.actualImpact = JSON.stringify(actualImpact);
    if (outcome) data.outcome = outcome;

    const updated = await prisma.suggestion.update({
      where: { id: suggestionId },
      data,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Outcomes POST error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
