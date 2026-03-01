import { prisma } from "@/lib/db";
import { safeDivide } from "@/lib/math";

/** Normalize a date to midnight for consistent comparisons */
function toDateOnly(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export interface BreakEvenStatus {
  dailyCost: number;
  currentRevenue: number;
  remainingTarget: number;
  coffeeEquivalent: number;
  isAchieved: boolean;
}

export async function getBreakEvenStatus(): Promise<BreakEvenStatus> {
  const today = toDateOnly(new Date());
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [shopSettings, todaySales, coffeeProducts, monthlyExpenses, todayLabor] = await Promise.all([
    prisma.shopSettings.findFirst(),
    prisma.dailySales.findMany({
      where: { date: { gte: today, lte: endOfToday } },
    }),
    prisma.product.findMany({
      where: { category: "coffee", isActive: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: firstOfMonth, lte: endOfToday } },
    }),
    prisma.laborEntry.findMany({
      where: { date: { gte: today, lte: endOfToday } },
    }),
  ]);

  const settingsFixedCost = shopSettings?.fixedCostsDaily ?? 0;

  const dayOfMonth = today.getDate();
  const recurringMonthly = monthlyExpenses
    .filter((e) => e.isRecurring && e.frequency === "monthly")
    .reduce((s, e) => s + e.amount, 0);
  const dailyRecurring = safeDivide(recurringMonthly, Math.max(1, dayOfMonth));

  const todayDirectExpenses = monthlyExpenses
    .filter((e) => {
      const expDate = new Date(e.date);
      return expDate >= today && expDate <= endOfToday && !e.isRecurring;
    })
    .reduce((s, e) => s + e.amount, 0);

  const todayLaborCost = todayLabor.reduce((s, l) => s + l.totalCost, 0);

  const dailyCost = Math.max(settingsFixedCost, dailyRecurring + todayDirectExpenses + todayLaborCost);

  const currentRevenue =
    todaySales.reduce((sum: number, s: { revenue: number }) => sum + s.revenue, 0) ?? 0;
  const remainingTarget = Math.max(0, dailyCost - currentRevenue);

  const avgCoffeePrice = safeDivide(
    coffeeProducts.reduce((s: number, p: { sellPrice: number }) => s + p.sellPrice, 0),
    coffeeProducts.length,
    4
  );

  const coffeeEquivalent = Math.ceil(safeDivide(remainingTarget, avgCoffeePrice));
  const isAchieved = currentRevenue >= dailyCost;

  return {
    dailyCost,
    currentRevenue,
    remainingTarget,
    coffeeEquivalent,
    isAchieved,
  };
}

export interface BreakEvenHistoryEntry {
  date: Date;
  revenue: number;
  target: number;
  achieved: boolean;
}

export async function getBreakEvenHistory(
  days: number
): Promise<BreakEvenHistoryEntry[]> {
  const today = toDateOnly(new Date());
  const start = new Date(today);
  start.setDate(start.getDate() - days);

  const [dayCloses, shopSettings, expenses, labor] = await Promise.all([
    prisma.dayClose.findMany({
      where: { date: { gte: start, lte: today } },
      orderBy: { date: "asc" },
    }),
    prisma.shopSettings.findFirst(),
    prisma.expense.findMany({
      where: { date: { gte: start, lte: today } },
    }),
    prisma.laborEntry.findMany({
      where: { date: { gte: start, lte: today } },
    }),
  ]);

  const baseCost = shopSettings?.fixedCostsDaily ?? 0;

  const expenseByDay = new Map<string, number>();
  for (const exp of expenses) {
    const key = exp.date.toISOString().split("T")[0];
    expenseByDay.set(key, (expenseByDay.get(key) ?? 0) + exp.amount);
  }
  const laborByDay = new Map<string, number>();
  for (const l of labor) {
    const key = l.date.toISOString().split("T")[0];
    laborByDay.set(key, (laborByDay.get(key) ?? 0) + l.totalCost);
  }

  return dayCloses.map((dc: { date: Date; totalRevenue: number }) => {
    const key = dc.date.toISOString().split("T")[0];
    const dayExpenses = expenseByDay.get(key) ?? 0;
    const dayLabor = laborByDay.get(key) ?? 0;
    const target = Math.max(baseCost, dayExpenses + dayLabor);
    return {
      date: dc.date,
      revenue: dc.totalRevenue,
      target,
      achieved: dc.totalRevenue >= target,
    };
  });
}
