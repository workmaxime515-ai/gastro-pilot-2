import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { safeDivide, roundTo } from "@/lib/math";

/**
 * Simple linear regression: y = mx + b
 * Returns slope (m), intercept (b), and R-squared
 */
function linearRegression(points: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0, rSquared: 0 };

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: safeDivide(sumY, n), rSquared: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  const ssTot = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, rSquared };
}

export async function GET(req: NextRequest) {
  try {
    const forecastDays = Math.min(14, Math.max(1, parseInt(req.nextUrl.searchParams.get("days") ?? "14")));
    const historyDays = 28;

    const since = new Date();
    since.setDate(since.getDate() - historyDays);
    since.setHours(0, 0, 0, 0);

    const [sales, weather, events, dayCloses] = await Promise.all([
      prisma.dailySales.findMany({
        where: { date: { gte: since } },
        include: { product: true },
      }),
      prisma.weatherData.findMany({
        where: { date: { gte: since } },
      }),
      prisma.localEvent.findMany({
        where: { date: { gte: since } },
      }),
      prisma.dayClose.findMany({
        where: { date: { gte: since } },
        orderBy: { date: "asc" },
      }),
    ]);

    // Build daily revenue series
    const revenueByDate = new Map<string, number>();
    for (const dc of dayCloses) {
      const dateKey = new Date(dc.date).toISOString().split("T")[0];
      revenueByDate.set(dateKey, dc.totalRevenue);
    }

    // Build DOW averages
    const dowRevenues = new Map<number, number[]>();
    for (const dc of dayCloses) {
      const dow = new Date(dc.date).getDay();
      if (!dowRevenues.has(dow)) dowRevenues.set(dow, []);
      dowRevenues.get(dow)!.push(dc.totalRevenue);
    }

    const dowAvg = new Map<number, number>();
    for (const [dow, revs] of dowRevenues.entries()) {
      dowAvg.set(dow, safeDivide(revs.reduce((s, r) => s + r, 0), revs.length));
    }

    // Linear regression on daily revenue
    const sortedDates = Array.from(revenueByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b));

    const regressionPoints = sortedDates.map(([, rev], i) => ({ x: i, y: rev }));
    const { slope, intercept, rSquared } = linearRegression(regressionPoints);

    // Weather impact map
    const weatherByDate = new Map<string, string>();
    for (const w of weather) {
      const dateKey = new Date(w.date).toISOString().split("T")[0];
      weatherByDate.set(dateKey, w.condition);
    }

    const weatherImpact = new Map<string, number>();
    const overallAvgRevenue = sortedDates.length > 0
      ? safeDivide(sortedDates.reduce((s, [, r]) => s + r, 0), sortedDates.length)
      : 0;

    for (const [dateKey, rev] of sortedDates) {
      const condition = weatherByDate.get(dateKey);
      if (condition && overallAvgRevenue > 0) {
        const ratio = rev / overallAvgRevenue;
        weatherImpact.set(condition, (weatherImpact.get(condition) ?? 0) + ratio);
      }
    }

    // Event dates
    const eventDates = new Set(events.map((e) => new Date(e.date).toISOString().split("T")[0]));

    // Generate forecast
    const forecast: {
      date: string;
      dayOfWeek: number;
      dayName: string;
      predictedRevenue: number;
      confidenceLow: number;
      confidenceHigh: number;
      factors: string[];
    }[] = [];

    const dayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
    const nHistory = sortedDates.length;

    for (let i = 1; i <= forecastDays; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      const dateKey = futureDate.toISOString().split("T")[0];
      const dow = futureDate.getDay();

      // Base: regression extrapolation
      const regressionPrediction = slope * (nHistory + i) + intercept;

      // DOW adjustment
      const dowAvgForDay = dowAvg.get(dow) ?? overallAvgRevenue;
      const dowFactor = overallAvgRevenue > 0 ? safeDivide(dowAvgForDay, overallAvgRevenue, 1) : 1;

      // Combine: weighted average of regression and DOW pattern
      const regressionWeight = Math.min(0.6, rSquared); // Trust regression more if R² is high
      const dowWeight = 1 - regressionWeight;
      let predicted = regressionPrediction * regressionWeight + dowAvgForDay * dowWeight;

      const factors: string[] = [];

      // Event boost
      if (eventDates.has(dateKey)) {
        predicted *= 1.15;
        factors.push("Event geplant (+15%)");
      }

      // Trend direction
      if (slope > 0.5) factors.push(`Aufwaertstrend (+${roundTo(slope, 1)} EUR/Tag)`);
      else if (slope < -0.5) factors.push(`Abwaertstrend (${roundTo(slope, 1)} EUR/Tag)`);

      if (dowFactor > 1.1) factors.push(`Starker ${dayNames[dow]} (+${roundTo((dowFactor - 1) * 100, 0)}%)`);
      else if (dowFactor < 0.9) factors.push(`Schwacher ${dayNames[dow]} (${roundTo((dowFactor - 1) * 100, 0)}%)`);

      predicted = Math.max(0, roundTo(predicted));

      // Confidence bands: ±15% for near, ±30% for far
      const uncertaintyPct = 0.15 + (i / forecastDays) * 0.15;
      const confidenceLow = roundTo(predicted * (1 - uncertaintyPct));
      const confidenceHigh = roundTo(predicted * (1 + uncertaintyPct));

      forecast.push({
        date: dateKey,
        dayOfWeek: dow,
        dayName: dayNames[dow],
        predictedRevenue: predicted,
        confidenceLow,
        confidenceHigh,
        factors,
      });
    }

    return NextResponse.json({
      forecast,
      model: {
        slope: roundTo(slope, 3),
        intercept: roundTo(intercept),
        rSquared: roundTo(rSquared, 3),
        dataPoints: nHistory,
        trend: slope > 0.5 ? "rising" : slope < -0.5 ? "falling" : "stable",
      },
      summary: {
        avgDailyRevenue: roundTo(overallAvgRevenue),
        next7DaysTotal: roundTo(forecast.slice(0, 7).reduce((s, f) => s + f.predictedRevenue, 0)),
        bestDay: forecast.reduce((best, f) => f.predictedRevenue > best.predictedRevenue ? f : best, forecast[0]),
      },
    });
  } catch (e) {
    console.error("Forecast-advanced error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
