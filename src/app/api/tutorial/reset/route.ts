import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    await prisma.tutorialProgress.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", stepsCompleted: "[]", isCompleted: false },
      update: { stepsCompleted: "[]", isCompleted: false, skippedAt: null },
    });

    await prisma.onboardingStatus.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", currentStep: 0, isCompleted: false, completedAt: null },
      update: { currentStep: 0, isCompleted: false, completedAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tutorial reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset tutorial" },
      { status: 500 }
    );
  }
}
