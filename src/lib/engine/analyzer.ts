import { prisma } from "@/lib/db";
import type {
  AnalysisResult,
  DayPattern,
  ProductAnalysis,
  TimeSlotPattern,
} from "./types";

/** Normalize a date to midnight (00:00:00.000) for consistent comparisons */
function toDateOnly(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Recency weight: exponential decay based on days ago.
 * 0-7 days: 3x, 8-14 days: 2x, 15-28 days: 1x
 */
function getRecencyWeight(dateTs: number, todayTs: number): number {
  const daysAgo = Math.floor((todayTs - dateTs) / 86400000);
  if (daysAgo <= 7) return 3;
  if (daysAgo <= 14) return 2;
  return 1;
}

/** Weighted average helper using recency */
function weightedAvg(values: number[], dateTimestamps: number[], todayTs: number): number {
  if (values.length === 0) return 0;
  let totalWeight = 0;
  let weightedSum = 0;
  for (let i = 0; i < values.length; i++) {
    const w = getRecencyWeight(dateTimestamps[i], todayTs);
    weightedSum += values[i] * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/** Get start of today and date boundaries for last 28 days */
function getDateBounds() {
  const today = toDateOnly(new Date());
  const start28 = new Date(today);
  start28.setDate(start28.getDate() - 27); // last 28 days including today
  const start14Prior = new Date(today);
  start14Prior.setDate(start14Prior.getDate() - 27); // first day of 28-day window
  const start14Last = new Date(today);
  start14Last.setDate(start14Last.getDate() - 13); // first day of last 14 days
  return { today, start28, start14Prior, start14Last };
}

function trendFromComparison(last14Avg: number, prior14Avg: number): "rising" | "falling" | "stable" {
  if (prior14Avg <= 0) return "stable";
  const ratio = last14Avg / prior14Avg;
  if (ratio > 1.05) return "rising";
  if (ratio < 0.95) return "falling";
  return "stable";
}

export async function analyze(): Promise<AnalysisResult> {
  const { today, start28, start14Prior, start14Last } = getDateBounds();
  const todayDow = today.getDay();

  // Parallel fetch of all required data
  const [
    dailySalesRaw,
    products,
    wasteLogs,
    weatherData,
    localEvents,
    inventory,
    staffSchedules,
    shopSettings,
    dayCloses,
    actionTracking,
  ] = await Promise.all([
    prisma.dailySales.findMany({
      where: {
        date: {
          gte: start28,
          lte: today,
        },
      },
      include: { product: true },
    }),
    prisma.product.findMany({ where: { isActive: true } }),
    prisma.wasteLog.findMany({
      where: { date: { gte: start28, lte: today } },
      include: { product: true },
    }),
    prisma.weatherData.findMany({
      where: { date: { gte: start28, lte: today } },
    }),
    prisma.localEvent.findMany({
      where: {
        date: {
          gte: toDateOnly(today),
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.inventory.findMany({
      where: { product: { isActive: true } },
      include: { product: true },
    }),
    prisma.staffSchedule.findMany({
      where: {
        date: {
          gte: toDateOnly(today),
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: { staff: true },
    }),
    prisma.shopSettings.findFirst(),
    prisma.dayClose.findMany({
      where: { date: { gte: start28, lte: today } },
    }),
    prisma.actionTracking.findMany({
      include: { suggestion: true },
    }),
  ]);

  const fixedCostsDaily = shopSettings?.fixedCostsDaily ?? 400;

  // ─── Data quality: min(100, (daysWithData / 28) * 100)
  const uniqueDates = new Set(
    dailySalesRaw.map((s: { date: Date }) => toDateOnly(s.date).getTime())
  );
  const daysWithData = uniqueDates.size;
  const dataQuality = Math.min(100, Math.round((daysWithData / 28) * 100));

  // ─── Day patterns: avg sales, revenue, waste per day-of-week; trend (last 14 vs prior 14)
  const dayMap = new Map<
    number,
    { sales: number[]; revenue: number[]; waste: number[]; dates: number[] }
  >();
  for (let i = 0; i <= 6; i++) dayMap.set(i, { sales: [], revenue: [], waste: [], dates: [] });

  const wasteByDate = new Map<string, number>();
  for (const w of wasteLogs) {
    const key = toDateOnly(w.date).getTime().toString();
    wasteByDate.set(key, (wasteByDate.get(key) ?? 0) + w.quantity);
  }

  const salesByDate = new Map<string, { quantity: number; revenue: number }>();
  for (const s of dailySalesRaw) {
    const key = toDateOnly(s.date).getTime().toString();
    const curr = salesByDate.get(key) ?? { quantity: 0, revenue: 0 };
    curr.quantity += s.quantity;
    curr.revenue += s.revenue;
    salesByDate.set(key, curr);
  }

  for (const key of Array.from(salesByDate.keys())) {
    const d = new Date(parseInt(key, 10));
    const dow = d.getDay();
    const { quantity, revenue } = salesByDate.get(key)!;
    const waste = wasteByDate.get(key) ?? 0;
    const entry = dayMap.get(dow)!;
    entry.sales.push(quantity);
    entry.revenue.push(revenue);
    entry.waste.push(waste);
    entry.dates.push(d.getTime());
  }

  // Add dates that have waste but no sales
  for (const key of Array.from(wasteByDate.keys())) {
    if (salesByDate.has(key)) continue;
    const d = new Date(parseInt(key, 10));
    const dow = d.getDay();
    const entry = dayMap.get(dow)!;
    entry.waste.push(wasteByDate.get(key)!);
    entry.dates.push(d.getTime());
  }

  const todayTs = today.getTime();
  const dayPatterns: DayPattern[] = [];
  for (let dow = 0; dow <= 6; dow++) {
    const entry = dayMap.get(dow)!;
    const avgSales = weightedAvg(entry.sales, entry.dates.slice(0, entry.sales.length), todayTs);
    const avgRevenue = weightedAvg(entry.revenue, entry.dates.slice(0, entry.revenue.length), todayTs);
    const avgWaste = weightedAvg(entry.waste, entry.dates.slice(0, entry.waste.length), todayTs);

    const last14 = entry.dates.filter((t) => t >= start14Last.getTime());
    const prior14 = entry.dates.filter(
      (t) => t >= start14Prior.getTime() && t < start14Last.getTime()
    );
    const last14Sales =
      last14.length > 0
        ? last14.reduce((sum, t) => {
            const k = t.toString();
            return sum + (salesByDate.get(k)?.quantity ?? 0);
          }, 0) / last14.length
        : 0;
    const prior14Sales =
      prior14.length > 0
        ? prior14.reduce((sum, t) => {
            const k = t.toString();
            return sum + (salesByDate.get(k)?.quantity ?? 0);
          }, 0) / prior14.length
        : 0;
    const trend = trendFromComparison(last14Sales, prior14Sales);

    dayPatterns.push({
      dayOfWeek: dow,
      avgSales,
      avgRevenue,
      avgWaste,
      trend,
    });
  }

  // ─── Time slot patterns: avg per slot, peak day
  const slotOrder = ["morning", "midday", "afternoon", "evening"];
  const slotMap = new Map<
    string,
    { quantities: number[]; byDow: Map<number, number[]> }
  >();
  for (const slot of slotOrder)
    slotMap.set(slot, { quantities: [], byDow: new Map() });

  for (const s of dailySalesRaw as Array<{ timeSlot: string | null; quantity: number; date: Date; productId: string }>) {
    const slot = s.timeSlot ?? "morning";
    if (!slotMap.has(slot)) slotMap.set(slot, { quantities: [], byDow: new Map() });
    const entry = slotMap.get(slot)!;
    entry.quantities.push(s.quantity);
    const dow = toDateOnly(s.date).getDay();
    if (!entry.byDow.has(dow)) entry.byDow.set(dow, []);
    entry.byDow.get(dow)!.push(s.quantity);
  }

  const timeSlots: TimeSlotPattern[] = slotOrder.map((slot: string) => {
    const entry = slotMap.get(slot) ?? { quantities: [], byDow: new Map() };
    const avgCustomers =
      entry.quantities.length > 0
        ? entry.quantities.reduce((a: number, b: number) => a + b, 0) / entry.quantities.length
        : 0;
    let peakDay = 0;
    let peakAvg = 0;
    for (const [dow, arr] of Array.from(entry.byDow.entries())) {
      const avg = arr.reduce((a: number, b: number) => a + b, 0) / arr.length;
      if (avg > peakAvg) {
        peakAvg = avg;
        peakDay = dow;
      }
    }
    return { slot, avgCustomers, peakDay };
  });

  // ─── Product analyses
  // Per-product: aggregate quantity by date (one row per product per date)
  const salesByProductDate = new Map<string, Map<number, number>>();
  const wasteByProduct = new Map<string, number[]>();
  for (const s of dailySalesRaw) {
    const key = s.productId;
    const dateKey = toDateOnly(s.date).getTime();
    if (!salesByProductDate.has(key))
      salesByProductDate.set(key, new Map());
    const dateMap = salesByProductDate.get(key)!;
    dateMap.set(dateKey, (dateMap.get(dateKey) ?? 0) + s.quantity);
  }
  for (const w of wasteLogs) {
    if (!wasteByProduct.has(w.productId)) wasteByProduct.set(w.productId, []);
    wasteByProduct.get(w.productId)!.push(w.quantity);
  }

  const inventoryByProduct = new Map<string, number>();
  for (const inv of inventory) {
    const curr = inventoryByProduct.get(inv.productId) ?? 0;
    inventoryByProduct.set(inv.productId, curr + inv.quantity);
  }

  const productAnalyses: ProductAnalysis[] = (products as Array<{ id: string; name: string; category: string; sellPrice: number; costPrice: number; spoilageHours: number }>).map((p) => {
    const dateMap = salesByProductDate.get(p.id) ?? new Map();
    const dateEntries = Array.from(dateMap.entries());
    const quantities = dateEntries.map(([, q]) => q);
    const dates = dateEntries.map(([d]) => d);
    const wastes = wasteByProduct.get(p.id) ?? [];
    const avgDailySales = weightedAvg(quantities, dates, todayTs);
    const totalWaste = wastes.reduce((a, b) => a + b, 0);
    const avgProduced = quantities.reduce((a, b) => a + b, 0);
    const wasteRate = avgProduced > 0 ? totalWaste / avgProduced : 0;
    const margin = p.sellPrice - p.costPrice;
    const marginPercent =
      p.costPrice > 0 ? (margin / p.costPrice) * 100 : 0;
    const currentStock = inventoryByProduct.get(p.id) ?? 0;
    const daysUntilStockout =
      avgDailySales > 0 ? currentStock / avgDailySales : 999;

    const last14Dates = dates.filter((t) => t >= start14Last.getTime());
    const prior14Dates = dates.filter(
      (t) =>
        t >= start14Prior.getTime() && t < start14Last.getTime()
    );
    const last14Avg =
      last14Dates.length > 0
        ? last14Dates.reduce((sum, d) => sum + (dateMap.get(d) ?? 0), 0) /
          last14Dates.length
        : 0;
    const prior14Avg =
      prior14Dates.length > 0
        ? prior14Dates.reduce((sum, d) => sum + (dateMap.get(d) ?? 0), 0) /
          prior14Dates.length
        : 0;
    const trend = trendFromComparison(last14Avg, prior14Avg);

    return {
      productId: p.id,
      productName: p.name,
      category: p.category,
      avgDailySales,
      margin,
      marginPercent,
      wasteRate,
      trend,
      spoilageHours: p.spoilageHours,
      currentStock,
      daysUntilStockout,
    };
  });

  // ─── Today: weather, events
  const todayStart = toDateOnly(today);
  const todayWeather = (weatherData as Array<{ date: Date; condition: string; tempHigh: number }>).find(
    (w) =>
      toDateOnly(w.date).getTime() === todayStart.getTime()
  );
  const todayEvents = (localEvents as Array<{ name: string; expectedImpact: string }>).map((e) => ({
    name: e.name,
    impact: e.expectedImpact,
  }));

  // ─── Staff today (isNew = startDate < 14 days ago)
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const staffToday = (staffSchedules as Array<{ staff: { name: string; startDate: Date }; role: string }>).map((s) => ({
    name: s.staff.name,
    role: s.role,
    isNew: s.staff.startDate > fourteenDaysAgo,
  }));

  // ─── Recent waste average (last 28 days)
  const totalWaste28 = (wasteLogs as Array<{ quantity: number }>).reduce((a: number, w) => a + w.quantity, 0);
  const recentWasteAvg =
    daysWithData > 0 ? totalWaste28 / Math.max(1, daysWithData) : 0;

  // ─── Break-even: dailyCost from settings, currentRevenue = today so far (or 0)
  const todayDayClose = (dayCloses as Array<{ date: Date; totalRevenue: number }>).find(
    (dc: { date: Date }) => toDateOnly(dc.date).getTime() === todayStart.getTime()
  );
  const currentRevenue = todayDayClose?.totalRevenue ?? 0;
  const remainingTarget = Math.max(0, fixedCostsDaily - currentRevenue);

  // ─── Weather correlation: avg revenue by condition (for downstream use)
  const weatherByDate = new Map<string, string>(
    weatherData.map((w: { date: Date; condition: string }) => [
      toDateOnly(w.date).getTime().toString(),
      w.condition,
    ])
  );
  const revenueByWeather = new Map<string, number[]>();
  for (const [dateKey, data] of Array.from(salesByDate.entries())) {
    const condition: string = weatherByDate.get(dateKey) ?? "unknown";
    if (!revenueByWeather.has(condition)) revenueByWeather.set(condition, []);
    revenueByWeather.get(condition)!.push(data.revenue);
  }
  void actionTracking; // Prediction vs actual: compare Suggestion.expectedImpact with DayClose

  // D1: Compute average revenue per weather condition
  const weatherAvg: Record<string, number> = {};
  for (const [condition, revenues] of Array.from(revenueByWeather.entries())) {
    if (revenues.length > 0) {
      weatherAvg[condition] = revenues.reduce((s, r) => s + r, 0) / revenues.length;
    }
  }

  // D2: Identify seasonal products and whether they are currently in season
  const currentMonth = new Date().getMonth() + 1;
  const allProducts = await prisma.product.findMany({
    where: { isSeasonal: true, isActive: true },
    select: { id: true, name: true, seasonMonths: true },
  });
  const seasonalProducts = allProducts
    .filter((p: { seasonMonths: string | null }) => p.seasonMonths)
    .map((p: { id: string; name: string; seasonMonths: string | null }) => {
      let months: number[] = [];
      try { months = JSON.parse(p.seasonMonths || "[]"); } catch { /* ignore */ }
      return {
        id: p.id,
        name: p.name,
        seasonMonths: months,
        isInSeason: months.includes(currentMonth),
      };
    });

  // ─── Phase 3.3: Additional data integrations ─────────────────
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    customerCounts,
    revenueGoals,
    activePromotions,
    recentCompetitorNotes,
    recentTempLogs,
    lastCashCount,
    pendingPOs,
  ] = await Promise.all([
    prisma.customerCount.findMany({ where: { date: { gte: sevenDaysAgo } } }),
    prisma.revenueGoal.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 }),
    prisma.promotion.findMany({ where: { isActive: true, startDate: { lte: today }, endDate: { gte: today } } }),
    prisma.competitorNote.findMany({ where: { date: { gte: sevenDaysAgo } }, orderBy: { date: "desc" }, take: 5 }),
    prisma.tempLog.findMany({ where: { recordedAt: { gte: new Date(Date.now() - 86400000) } }, orderBy: { recordedAt: "desc" } }),
    prisma.cashCount.findFirst({ orderBy: { date: "desc" } }),
    prisma.purchaseOrder.findMany({ where: { status: "pending" }, include: { supplier: true, items: true } }),
  ]);

  // Customer traffic
  const dailyCustomerCounts = customerCounts.map((c: { count: number }) => c.count);
  const avgDailyCustomers = dailyCustomerCounts.length > 0
    ? dailyCustomerCounts.reduce((s: number, c: number) => s + c, 0) / dailyCustomerCounts.length
    : 0;
  const todayCustomerEntry = customerCounts.find(
    (c: { date: Date }) => toDateOnly(c.date).getTime() === todayStart.getTime()
  );
  const customerTraffic = {
    avgDaily: Math.round(avgDailyCustomers),
    todayCount: todayCustomerEntry?.count ?? 0,
    trend: dailyCustomerCounts.length >= 2
      ? (dailyCustomerCounts[dailyCustomerCounts.length - 1] > avgDailyCustomers * 1.05 ? "rising" as const
        : dailyCustomerCounts[dailyCustomerCounts.length - 1] < avgDailyCustomers * 0.95 ? "falling" as const
        : "stable" as const)
      : "stable" as const,
  };

  // Revenue goal
  const rg = revenueGoals[0];
  const revenueGoal = rg ? {
    target: rg.targetAmount,
    current: currentRevenue,
    remaining: Math.max(0, rg.targetAmount - currentRevenue),
    period: rg.period,
  } : null;

  // Temp alerts (only out-of-range)
  const tempAlerts = recentTempLogs
    .filter((t: { inRange: boolean }) => !t.inRange)
    .map((t: { equipment: string; temperature: number; inRange: boolean }) => ({
      equipment: t.equipment,
      temperature: t.temperature,
      inRange: t.inRange,
    }));

  // Cash discrepancy
  const cashDiscrepancy = lastCashCount ? (() => {
    const expected = lastCashCount.openAmount + (lastCashCount.cardTotal ?? 0);
    const actual = lastCashCount.closeAmount;
    const diff = actual - expected;
    if (Math.abs(diff) > 5) {
      return {
        date: lastCashCount.date.toISOString().split("T")[0],
        expected,
        actual,
        diff,
      };
    }
    return null;
  })() : null;

  return {
    dayPatterns,
    productAnalyses,
    timeSlots,
    todayDow,
    todayWeather: todayWeather
      ? { condition: todayWeather.condition, tempHigh: todayWeather.tempHigh }
      : undefined,
    todayEvents,
    breakEven: {
      dailyCost: fixedCostsDaily,
      currentRevenue,
      remainingTarget,
    },
    staffToday,
    recentWasteAvg,
    dataQuality,
    revenueByWeather: weatherAvg,
    seasonalProducts,
    customerTraffic,
    revenueGoal,
    activePromotions: activePromotions.map((p: { id: string; name: string; type: string; discount: number | null }) => ({
      id: p.id, name: p.name, type: p.type, discount: p.discount ?? 0,
    })),
    competitorAlerts: recentCompetitorNotes.map((c: { competitorName: string; event: string; notes: string | null }) => ({
      name: c.competitorName, event: c.event, notes: c.notes,
    })),
    tempAlerts,
    cashDiscrepancy,
    pendingOrders: pendingPOs.map((po: { supplierId: string; supplier: { name: string }; items: unknown[]; deliveryDate: Date | null }) => ({
      supplierId: po.supplierId,
      supplierName: po.supplier.name,
      itemCount: po.items.length,
      deliveryDate: po.deliveryDate?.toISOString().split("T")[0] ?? null,
    })),
  };
}
