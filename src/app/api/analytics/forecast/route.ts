import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const now = new Date();
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    fourWeeksAgo.setHours(0, 0, 0, 0);

    const [sales, weatherData, events] = await Promise.all([
      prisma.dailySales.findMany({
        where: { date: { gte: fourWeeksAgo } },
        select: { date: true, revenue: true },
      }),
      prisma.weatherData.findMany({
        where: { date: { gte: fourWeeksAgo } },
      }),
      prisma.localEvent.findMany({
        where: {
          date: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 86400000),
          },
        },
      }),
    ]);

    const revenueByDow = new Map<number, number[]>();
    for (const sale of sales) {
      const dow = sale.date.getDay();
      const arr = revenueByDow.get(dow) ?? [];
      arr.push(sale.revenue);
      revenueByDow.set(dow, arr);
    }

    const avgByDow = new Map<number, number>();
    for (const [dow, revenues] of revenueByDow) {
      const dayTotals = new Map<string, number>();
      for (const r of revenues) {
        // This sums all sales per day, but since we group by dow, we need per-date sums
        // Actually, we need to group by date first
      }
      avgByDow.set(dow, revenues.reduce((s, r) => s + r, 0) / Math.max(1, revenues.length));
    }

    // Better approach: group sales by date, then compute avg per DOW
    const revenueByDate = new Map<string, number>();
    for (const sale of sales) {
      const key = sale.date.toISOString().split("T")[0];
      revenueByDate.set(key, (revenueByDate.get(key) ?? 0) + sale.revenue);
    }

    const dowTotals = new Map<number, { sum: number; count: number }>();
    for (const [dateStr, revenue] of revenueByDate) {
      const d = new Date(dateStr);
      const dow = d.getDay();
      const entry = dowTotals.get(dow) ?? { sum: 0, count: 0 };
      entry.sum += revenue;
      entry.count += 1;
      dowTotals.set(dow, entry);
    }

    const weatherImpact = new Map<string, number>();
    for (const w of weatherData) {
      const dateKey = w.date.toISOString().split("T")[0];
      const dayRevenue = revenueByDate.get(dateKey);
      if (dayRevenue != null) {
        const condition = w.condition.toLowerCase();
        const arr = weatherImpact.get(condition);
        if (arr != null) {
          weatherImpact.set(condition, (arr + dayRevenue) / 2);
        } else {
          weatherImpact.set(condition, dayRevenue);
        }
      }
    }

    const overallAvg = Array.from(dowTotals.values()).reduce((s, d) => s + d.sum / d.count, 0) /
      Math.max(1, dowTotals.size);

    const forecast: {
      date: string;
      dayOfWeek: number;
      predictedRevenue: number;
      confidence: number;
      hasEvent: boolean;
      eventName?: string;
    }[] = [];

    for (let i = 1; i <= 7; i++) {
      const forecastDate = new Date(now);
      forecastDate.setDate(forecastDate.getDate() + i);
      const dow = forecastDate.getDay();
      const dateStr = forecastDate.toISOString().split("T")[0];

      const dowData = dowTotals.get(dow);
      let predicted = dowData ? dowData.sum / dowData.count : overallAvg;

      const dayEvent = events.find((e) => {
        const eventDate = e.date.toISOString().split("T")[0];
        return eventDate === dateStr;
      });

      if (dayEvent) {
        const impactMultiplier = dayEvent.expectedImpact === "high" ? 1.3 :
          dayEvent.expectedImpact === "medium" ? 1.15 : 1.05;
        predicted *= impactMultiplier;
      }

      const dataPoints = dowData?.count ?? 0;
      const confidence = Math.min(90, Math.max(20, dataPoints * 15 + 20));

      forecast.push({
        date: dateStr,
        dayOfWeek: dow,
        predictedRevenue: Math.round(predicted),
        confidence,
        hasEvent: !!dayEvent,
        eventName: dayEvent?.name,
      });
    }

    return NextResponse.json({ forecast });
  } catch (e) {
    console.error("Forecast error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
