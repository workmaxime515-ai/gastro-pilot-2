import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const period = req.nextUrl.searchParams.get("period") ?? "week";

    const now = new Date();
    now.setHours(23, 59, 59, 999);

    let currentStart: Date;
    let previousStart: Date;
    let previousEnd: Date;

    if (period === "month") {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(currentStart);
      previousEnd.setMilliseconds(-1);
    } else {
      const day = now.getDay();
      currentStart = new Date(now);
      currentStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      currentStart.setHours(0, 0, 0, 0);
      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 7);
      previousEnd = new Date(currentStart);
      previousEnd.setMilliseconds(-1);
    }

    const [currentSales, previousSales, currentWaste, previousWaste, currentLabor, previousLabor, currentCustomers, previousCustomers] = await Promise.all([
      prisma.dailySales.findMany({ where: { date: { gte: currentStart, lte: now } } }),
      prisma.dailySales.findMany({ where: { date: { gte: previousStart, lte: previousEnd } } }),
      prisma.wasteLog.findMany({ where: { date: { gte: currentStart, lte: now } } }),
      prisma.wasteLog.findMany({ where: { date: { gte: previousStart, lte: previousEnd } } }),
      prisma.laborEntry.findMany({ where: { date: { gte: currentStart, lte: now } } }),
      prisma.laborEntry.findMany({ where: { date: { gte: previousStart, lte: previousEnd } } }),
      prisma.customerCount.findMany({ where: { date: { gte: currentStart, lte: now } } }),
      prisma.customerCount.findMany({ where: { date: { gte: previousStart, lte: previousEnd } } }),
    ]);

    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const curRevenue = currentSales.reduce((s, r) => s + r.revenue, 0);
    const prevRevenue = previousSales.reduce((s, r) => s + r.revenue, 0);
    const curWaste = currentWaste.reduce((s, w) => s + w.quantity, 0);
    const prevWaste = previousWaste.reduce((s, w) => s + w.quantity, 0);
    const curLaborCost = currentLabor.reduce((s, l) => s + l.totalCost, 0);
    const prevLaborCost = previousLabor.reduce((s, l) => s + l.totalCost, 0);
    const curCustomerCount = currentCustomers.reduce((s, c) => s + c.count, 0);
    const prevCustomerCount = previousCustomers.reduce((s, c) => s + c.count, 0);

    return NextResponse.json({
      period,
      current: {
        label: period === "month" ? "Dieser Monat" : "Diese Woche",
        revenue: curRevenue,
        waste: curWaste,
        laborCost: curLaborCost,
        customers: curCustomerCount,
      },
      previous: {
        label: period === "month" ? "Letzter Monat" : "Letzte Woche",
        revenue: prevRevenue,
        waste: prevWaste,
        laborCost: prevLaborCost,
        customers: prevCustomerCount,
      },
      changes: {
        revenue: calcChange(curRevenue, prevRevenue),
        waste: calcChange(curWaste, prevWaste),
        laborCost: calcChange(curLaborCost, prevLaborCost),
        customers: calcChange(curCustomerCount, prevCustomerCount),
      },
    });
  } catch (e) {
    console.error("Comparison error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
