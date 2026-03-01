import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    await prisma.onboardingStatus.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        currentStep: 999,
        isCompleted: true,
        completedAt: new Date(),
      },
      update: {
        currentStep: 999,
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding complete error:", error);
    return NextResponse.json(
      { error: "Failed to save onboarding status" },
      { status: 500 }
    );
  }
}
