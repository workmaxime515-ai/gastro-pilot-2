import { NextResponse } from "next/server";
import { getProfitRanking, predictCustomerFlow } from "@/lib/engine";
import { prisma } from "@/lib/db";

function parseDate(dateStr: string | null): Date | undefined {
  if (!dateStr) return undefined;
  const match = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) return undefined;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const dateStr = searchParams.get("date");
    const month = searchParams.get("month");

    if (!type) {
      return NextResponse.json(
        { error: "Fehlender Query-Parameter: type" },
        { status: 400 }
      );
    }

    if (type === "profit-ranking") {
      const ranking = await getProfitRanking();
      return NextResponse.json(ranking);
    }

    if (type === "customer-flow") {
      const date = parseDate(dateStr) ?? undefined;
      const flow = await predictCustomerFlow(date);
      return NextResponse.json(flow);
    }

    if (type === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const dayAfter = new Date(yesterday);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const dayClose = await prisma.dayClose.findFirst({
        where: { date: { gte: yesterday, lt: dayAfter } },
      });

      if (!dayClose) {
        return NextResponse.json({ totalRevenue: 0, totalWaste: 0, dayRating: null, notes: null });
      }

      return NextResponse.json({
        totalRevenue: dayClose.totalRevenue,
        totalWaste: dayClose.totalWaste,
        dayRating: dayClose.dayRating,
        notes: dayClose.notes,
      });
    }

    if (type === "monthly-revenue") {
      const m = month || new Date().toISOString().slice(0, 7);
      const startOfMonth = new Date(`${m}-01T00:00:00`);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      const closes = await prisma.dayClose.findMany({
        where: { date: { gte: startOfMonth, lt: endOfMonth } },
      });
      const total = closes.reduce((s, c) => s + c.totalRevenue, 0);
      return NextResponse.json({ month: m, totalRevenue: total, days: closes.length });
    }

    if (type === "weekly-trends") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const days: { date: string; revenue: number; dayOfWeek: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        const dc = await prisma.dayClose.findFirst({ where: { date: { gte: d, lt: next } } });
        days.push({ date: d.toISOString().split("T")[0], revenue: dc?.totalRevenue ?? 0, dayOfWeek: d.getDay() });
      }
      return NextResponse.json(days);
    }

    if (type === "waste-today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const logs = await prisma.wasteLog.findMany({
        where: { date: { gte: today, lt: tomorrow } },
      });
      const total = logs.reduce((s, l) => s + l.quantity, 0);
      return NextResponse.json({ total });
    }

    return NextResponse.json(
      { error: "Ungueltiger type. Verwende: profit-ranking, customer-flow, yesterday, monthly-revenue, weekly-trends, waste-today" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Analysedaten konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}
