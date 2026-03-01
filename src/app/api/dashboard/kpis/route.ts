import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      settings,
      revenueGoals,
      customerCounts,
      wasteLogs,
      weather,
      weekSales,
      todayLabor,
    ] = await Promise.all([
      prisma.shopSettings.findFirst(),

      prisma.revenueGoal.findMany({
        where: { isActive: true },
        orderBy: { startDate: "desc" },
        take: 1,
      }),

      prisma.customerCount.findMany({
        where: { date: { gte: today, lt: tomorrow } },
      }),

      prisma.wasteLog.findMany({
        where: { date: { gte: today, lt: tomorrow } },
      }),

      prisma.weatherData.findFirst({
        where: { date: { gte: today, lt: tomorrow } },
      }),

      prisma.dailySales.findMany({
        where: { date: { gte: sevenDaysAgo } },
        select: { date: true, revenue: true },
      }),

      prisma.laborEntry.findMany({
        where: { date: { gte: today, lt: tomorrow } },
      }),
    ]);

    const todayCustomers = customerCounts.reduce((s, c) => s + c.count, 0);
    const todayWaste = wasteLogs.reduce((s, w) => s + w.quantity, 0);
    const todayLaborCost = todayLabor.reduce((s, l) => s + l.totalCost, 0);

    const trendMap = new Map<string, { revenue: number; dayOfWeek: number }>();
    for (const sale of weekSales) {
      const key = sale.date.toISOString().split("T")[0];
      const existing = trendMap.get(key);
      if (existing) {
        existing.revenue += sale.revenue;
      } else {
        trendMap.set(key, { revenue: sale.revenue, dayOfWeek: sale.date.getDay() });
      }
    }

    const trends = Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const todayRevenue = trends.find((t) => t.date === today.toISOString().split("T")[0])?.revenue ?? 0;

    return NextResponse.json({
      shopName: settings?.shopName ?? "Mein Cafe",
      todayRevenue,
      todayCustomers,
      todayWaste,
      todayLaborCost,
      weather: weather
        ? { tempHigh: weather.tempHigh, tempLow: weather.tempLow, condition: weather.condition }
        : null,
      revenueGoal: revenueGoals[0] ?? null,
      trends,
    });
  } catch (e) {
    console.error("Dashboard KPIs error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
