import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const [dayCloses, expenses] = await Promise.all([
      prisma.dayClose.findMany({
        where: { date: { gte: weekStart, lt: weekEnd } },
        orderBy: { date: "asc" },
      }),
      prisma.expense.findMany({
        where: { date: { gte: weekStart, lt: weekEnd } },
      }),
    ]);

    if (dayCloses.length === 0) {
      return NextResponse.json(null);
    }

    const totalRevenue = dayCloses.reduce((s, d) => s + d.totalRevenue, 0);
    const totalWaste = dayCloses.reduce((s, d) => s + d.totalWaste, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const avgDailyRevenue = totalRevenue / dayCloses.length;

    const bestDayClose = dayCloses.reduce((best, d) => d.totalRevenue > best.totalRevenue ? d : best, dayCloses[0]);
    const bestDay = bestDayClose.date.toLocaleDateString("de-DE", { weekday: "long" });

    return NextResponse.json({
      weekStart: weekStart.toISOString(),
      totalRevenue,
      totalExpenses,
      totalWaste,
      avgDailyRevenue,
      bestDay,
    });
  } catch (error) {
    console.error("Weekly report error:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
