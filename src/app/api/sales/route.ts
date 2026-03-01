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

    const date = parseDate(dateStr);
    if (!date) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const sales = await prisma.dailySales.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: { product: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error("Sales GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      date,
      entries,
    }: {
      date: string;
      entries: Array<{
        productId: string;
        quantity: number;
        revenue: number;
        timeSlot?: string;
      }>;
    } = body;

    if (!date || !entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: "Missing required fields: date, entries (array)" },
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

    const validEntries = entries.filter(
      (e) =>
        e?.productId &&
        typeof e.quantity === "number" &&
        typeof e.revenue === "number"
    );

    if (validEntries.length === 0) {
      return NextResponse.json(
        { error: "No valid entries (need productId, quantity, revenue)" },
        { status: 400 }
      );
    }

    const created = await prisma.dailySales.createMany({
      data: validEntries.map((e) => ({
        productId: e.productId,
        date: parsedDate,
        quantity: Math.round(e.quantity),
        revenue: e.revenue,
        timeSlot: e.timeSlot ?? null,
      })),
    });

    return NextResponse.json({
      success: true,
      count: created.count,
    });
  } catch (error) {
    console.error("Sales POST error:", error);
    return NextResponse.json(
      { error: "Failed to record sales" },
      { status: 500 }
    );
  }
}
