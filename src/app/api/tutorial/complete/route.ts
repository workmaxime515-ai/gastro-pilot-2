import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { completed, skipped, stepsCompleted } = body as {
      completed?: boolean;
      skipped?: boolean;
      stepsCompleted?: string[];
    };

    await prisma.tutorialProgress.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        stepsCompleted: JSON.stringify(stepsCompleted ?? []),
        isCompleted: completed ?? true,
        skippedAt: skipped ? new Date() : null,
      },
      update: {
        stepsCompleted: JSON.stringify(stepsCompleted ?? []),
        isCompleted: completed ?? true,
        skippedAt: skipped ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tutorial complete error:", error);
    return NextResponse.json(
      { error: "Failed to save tutorial progress" },
      { status: 500 }
    );
  }
}
