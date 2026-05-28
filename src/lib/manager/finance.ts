import { prisma } from "@/lib/db";

export type FinancePeriod = "day" | "month" | "year";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function periodBounds(period: FinancePeriod): { start: Date; end: Date } {
  const now = new Date();
  if (period === "day") {
    return { start: startOfToday(), end: endOfToday() };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end };
}

function fixedCostsForPeriod(period: FinancePeriod, fixedCostsDaily: number): number {
  const now = new Date();
  if (period === "day") return fixedCostsDaily;
  if (period === "month") {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return fixedCostsDaily * daysInMonth;
  }
  const isLeap =
    (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) ||
    now.getFullYear() % 400 === 0;
  const daysInYear = isLeap ? 366 : 365;
  return fixedCostsDaily * daysInYear;
}

export async function getManagerFinance(period: FinancePeriod) {
  const { start, end } = periodBounds(period);

  const [settings, revenueAgg, cogsAgg] = await Promise.all([
    prisma.shopSettings.findFirst(),
    prisma.financeLedger.aggregate({
      where: { type: "revenue", date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.financeLedger.aggregate({
      where: { type: "cogs", date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
  ]);

  const revenue = revenueAgg._sum.amount ?? 0;
  const cogs = cogsAgg._sum.amount ?? 0;
  const grossProfit = revenue - cogs;
  const fixedCostsDaily = settings?.fixedCostsDaily ?? 0;
  const fixedCosts = fixedCostsForPeriod(period, fixedCostsDaily);
  const profit = grossProfit - fixedCosts;
  const foodCostPercent = revenue > 0 ? (cogs / revenue) * 100 : 0;

  return {
    period,
    revenue,
    cogs,
    grossProfit,
    fixedCostsDaily,
    fixedCosts,
    profit,
    foodCostPercent,
    breakEvenRemaining: Math.max(0, fixedCosts - grossProfit),
    breakEvenAchieved: grossProfit >= fixedCosts,
  };
}

export async function getManagerSalesForPeriod(period: FinancePeriod) {
  const { start, end } = periodBounds(period);

  return prisma.saleEvent.findMany({
    where: { soldAt: { gte: start, lte: end } },
    include: { product: { select: { id: true, name: true, sellPrice: true } } },
    orderBy: { soldAt: "desc" },
    take: 50,
  });
}
