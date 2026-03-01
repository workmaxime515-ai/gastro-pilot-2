import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function parseDate(dateStr: string): Date | null {
  const match = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json(
        { error: "Missing query param: date (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const parsedDate = parseDate(dateStr);
    if (!parsedDate) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const dayStart = new Date(parsedDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayClose = await prisma.dayClose.findUnique({
      where: { date: dayStart },
    });

    return NextResponse.json(dayClose ?? null);
  } catch (error) {
    console.error("Day close GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch day close" },
      { status: 500 }
    );
  }
}

function dayRatingFromNumber(n: number): "good" | "normal" | "weak" {
  if (n >= 4) return "good";
  if (n >= 2) return "normal";
  return "weak";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      date,
      totalRevenue,
      totalCosts,
      totalWaste,
      dayRating,
      notes,
    }: {
      date: string;
      totalRevenue: number;
      totalCosts: number;
      totalWaste: number;
      dayRating: number;
      notes?: string;
    } = body;

    if (!date || typeof totalRevenue !== "number") {
      return NextResponse.json(
        { error: "Missing required fields: date, totalRevenue" },
        { status: 400 }
      );
    }

    const parsedDate = parseDate(date);
    if (!parsedDate) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const dayStart = new Date(parsedDate);
    dayStart.setHours(0, 0, 0, 0);

    const ratingStr =
      typeof dayRating === "number"
        ? dayRatingFromNumber(dayRating)
        : "normal";

    const dayClose = await prisma.dayClose.upsert({
      where: { date: dayStart },
      create: {
        date: dayStart,
        totalRevenue: totalRevenue ?? 0,
        totalWaste: totalWaste ?? 0,
        dayRating: ratingStr,
        notes: notes ?? null,
      },
      update: {
        totalRevenue: totalRevenue ?? undefined,
        totalWaste: totalWaste ?? undefined,
        dayRating: ratingStr,
        notes: notes ?? undefined,
      },
    });

    return NextResponse.json(dayClose);
  } catch (error) {
    console.error("Day close POST error:", error);
    return NextResponse.json(
      { error: "Failed to close day" },
      { status: 500 }
    );
  }
}
