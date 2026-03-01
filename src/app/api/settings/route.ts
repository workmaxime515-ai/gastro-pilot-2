import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_SETTINGS = {
  id: "singleton",
  shopName: "Mein Café",
  location: null as string | null,
  openTime: "06:00",
  closeTime: "18:00",
  fixedCostsDaily: 400,
  strategyMode: "balanced",
  language: "de",
  darkMode: "auto",
  highContrast: false,
  reducedMotion: false,
  hapticFeedback: true,
  fontSize: "normal",
  streaksEnabled: true,
  currentStreak: 0,
  longestStreak: 0,
  lastDataEntry: null,
  typicalWeekProfile: null as string | null,
};

export async function GET() {
  try {
    const settings = await prisma.shopSettings.findFirst();

    if (!settings) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    const allowedKeys = [
      "shopName",
      "location",
      "openTime",
      "closeTime",
      "fixedCostsDaily",
      "strategyMode",
      "language",
      "darkMode",
      "highContrast",
      "reducedMotion",
      "hapticFeedback",
      "fontSize",
      "streaksEnabled",
      "currentStreak",
      "longestStreak",
      "lastDataEntry",
      "typicalWeekProfile",
    ];

    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const settings = await prisma.shopSettings.upsert({
      where: { id: "singleton" },
      create: {
        ...DEFAULT_SETTINGS,
        ...updateData,
      },
      update: updateData,
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
