import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateConfidenceFromFeedback } from "@/lib/engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      suggestionId,
      action,
      outcome,
      revenueResult,
    }: {
      suggestionId: string;
      action: "done" | "skipped" | "later";
      outcome?: string;
      revenueResult?: number;
    } = body;

    if (!suggestionId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: suggestionId, action" },
        { status: 400 }
      );
    }

    const validActions = ["done", "skipped", "later"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be one of: done, skipped, later" },
        { status: 400 }
      );
    }

    const suggestion = await prisma.suggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    const statusMap = {
      done: "done",
      skipped: "skipped",
      later: "partial",
    } as const;

    await prisma.actionTracking.upsert({
      where: { suggestionId },
      create: {
        suggestionId,
        status: statusMap[action],
        completedAt: action === "done" ? new Date() : null,
      },
      update: {
        status: statusMap[action],
        completedAt: action === "done" ? new Date() : undefined,
      },
    });

    const comment = [outcome, revenueResult != null ? `Revenue: ${revenueResult}` : null]
      .filter(Boolean)
      .join(" | ") || undefined;

    await prisma.suggestionFeedback.upsert({
      where: { suggestionId },
      create: {
        suggestionId,
        isHelpful: action === "done",
        comment: comment || null,
      },
      update: {
        isHelpful: action === "done",
        comment: comment || undefined,
      },
    });

    await updateConfidenceFromFeedback(suggestion.type, action === "done");

    return NextResponse.json({
      success: true,
      message: "Feedback recorded",
    });
  } catch (error) {
    console.error("Feedback POST error:", error);
    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    );
  }
}
