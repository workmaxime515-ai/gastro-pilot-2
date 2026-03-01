import { prisma } from "@/lib/db";
import { safeDivide } from "@/lib/math";
import type { CandidateSuggestion, AnalysisResult } from "./types";

/** Normalize a date to midnight for consistent comparisons */
function toDateOnly(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Map timeSlot (morning, midday, afternoon, evening) to 30-min slot ranges */
const SLOT_TO_30MIN: Record<string, string[]> = {
  morning: [
    "06:00-06:30",
    "06:30-07:00",
    "07:00-07:30",
    "07:30-08:00",
    "08:00-08:30",
    "08:30-09:00",
    "09:00-09:30",
    "09:30-10:00",
  ],
  midday: [
    "10:00-10:30",
    "10:30-11:00",
    "11:00-11:30",
    "11:30-12:00",
    "12:00-12:30",
    "12:30-13:00",
    "13:00-13:30",
    "13:30-14:00",
  ],
  afternoon: [
    "14:00-14:30",
    "14:30-15:00",
    "15:00-15:30",
    "15:30-16:00",
    "16:00-16:30",
    "16:30-17:00",
    "17:00-17:30",
    "17:30-18:00",
  ],
  evening: [
    "18:00-18:30",
    "18:30-19:00",
    "19:00-19:30",
    "19:30-20:00",
    "20:00-20:30",
  ],
};

const ALL_30MIN_SLOTS = [
  ...SLOT_TO_30MIN.morning,
  ...SLOT_TO_30MIN.midday,
  ...SLOT_TO_30MIN.afternoon,
  ...SLOT_TO_30MIN.evening,
];

// ─── 1. Profit-per-Product Analysis ─────────────────────────────

export async function getProfitRanking(): Promise<
  Array<{
    productId: string;
    name: string;
    totalProfit: number;
    margin: number;
    unitsSold: number;
    rank: number;
  }>
> {
  const today = toDateOnly(new Date());
  const start28 = new Date(today);
  start28.setDate(start28.getDate() - 27);

  const sales = await prisma.dailySales.findMany({
    where: {
      date: { gte: start28, lte: today },
    },
    include: { product: true },
  });

  const profitByProduct = new Map<
    string,
    { name: string; totalProfit: number; margin: number; unitsSold: number }
  >();

  for (const s of sales) {
    const margin = s.product.sellPrice - s.product.costPrice;
    const profit = s.quantity * margin;

    const curr = profitByProduct.get(s.productId);
    if (!curr) {
      profitByProduct.set(s.productId, {
        name: s.product.name,
        totalProfit: profit,
        margin,
        unitsSold: s.quantity,
      });
    } else {
      curr.totalProfit += profit;
      curr.unitsSold += s.quantity;
      profitByProduct.set(s.productId, curr);
    }
  }

  const ranked = Array.from(profitByProduct.entries())
    .map(([productId, data]) => ({
      productId,
      name: data.name,
      totalProfit: Math.round(data.totalProfit * 100) / 100,
      margin: Math.round(data.margin * 100) / 100,
      unitsSold: data.unitsSold,
      rank: 0,
    }))
    .sort((a, b) => b.totalProfit - a.totalProfit);

  ranked.forEach((r, i) => {
    r.rank = i + 1;
  });

  return ranked;
}

// ─── 2. Customer Flow Prediction (30-Min Slots) ───────────────────

export async function predictCustomerFlow(
  date?: Date
): Promise<
  Array<{ timeSlot: string; expectedCustomers: number; confidence: number }>
> {
  const targetDate = date ? toDateOnly(date) : toDateOnly(new Date());
  const dow = targetDate.getDay();

  const today = toDateOnly(new Date());
  const start28 = new Date(today);
  start28.setDate(start28.getDate() - 27);

  const [sales, weather] = await Promise.all([
    prisma.dailySales.findMany({
      where: { date: { gte: start28, lte: today } },
      select: { quantity: true, timeSlot: true, date: true },
    }),
    prisma.weatherData.findUnique({
      where: { date: targetDate },
    }),
  ]);

  // Distribute sales into 30-min slots by DOW
  const slotByDow = new Map<
    string,
    Map<number, number[]>
  >();

  for (const slot30 of ALL_30MIN_SLOTS) {
    slotByDow.set(slot30, new Map());
    for (let d = 0; d <= 6; d++) {
      slotByDow.get(slot30)!.set(d, []);
    }
  }

  for (const s of sales) {
    const slot = s.timeSlot ?? "morning";
    const subSlots = SLOT_TO_30MIN[slot] ?? SLOT_TO_30MIN.morning;
    const perSlot = safeDivide(s.quantity, subSlots.length);
    const saleDow = toDateOnly(s.date).getDay();

    for (const sub of subSlots) {
      const arr = slotByDow.get(sub)?.get(saleDow);
      if (arr) arr.push(perSlot);
    }
  }

  const weatherCondition = weather?.condition?.toLowerCase() ?? "";
  const isRainy =
    weatherCondition.includes("regen") ||
    weatherCondition.includes("rain") ||
    weatherCondition.includes("sturm") ||
    weatherCondition.includes("storm");
  const isSunny =
    weatherCondition.includes("sunny") || weatherCondition.includes("sonnig");

  let weatherModifier = 1;
  if (toDateOnly(targetDate).getTime() === today.getTime()) {
    if (isRainy) weatherModifier = 0.85;
    else if (isSunny) weatherModifier = 1.1;
  }

  const result: Array<{
    timeSlot: string;
    expectedCustomers: number;
    confidence: number;
  }> = [];

  for (const slot30 of ALL_30MIN_SLOTS) {
    const dowArr = slotByDow.get(slot30)?.get(dow) ?? [];
    const avg = safeDivide(
      dowArr.reduce((a, b) => a + b, 0),
      dowArr.length
    );
    const std =
      dowArr.length > 1
        ? Math.sqrt(safeDivide(dowArr.reduce((s, x) => s + (x - avg) ** 2, 0), dowArr.length))
        : 0;

    let confidence = 50;
    if (dowArr.length >= 4) confidence = 70;
    if (dowArr.length >= 8) confidence = 85;
    if (dowArr.length >= 12) confidence = 95;
    if (dowArr.length === 0) confidence = 20;
    if (std > avg && avg > 0) confidence = Math.max(20, confidence - 15);
    confidence = Math.max(0, Math.min(100, confidence));

    const expectedCustomers = Math.max(
      0,
      Math.round(avg * weatherModifier * 100) / 100
    );

    result.push({
      timeSlot: slot30,
      expectedCustomers,
      confidence,
    });
  }

  return result;
}

// ─── 3. Cost-Saving Tips Generator ───────────────────────────────

function computeConfidence(dataQuality: number, strongData: boolean): number {
  let c = Math.max(0, Math.min(100, dataQuality));
  if (strongData) c = Math.min(100, c + 10);
  return Math.round(c);
}

export function generateCostSavingTips(
  analysis: AnalysisResult
): CandidateSuggestion[] {
  const tips: CandidateSuggestion[] = [];
  const conf = (dq: number, strong = false) =>
    computeConfidence(dq, strong);

  // Tip: Ofen ab 15:00 ausschalten (if afternoon bakery sales low)
  const afternoonSlot = analysis.timeSlots.find(
    (s) => s.slot === "afternoon"
  );
  const afternoonAvg = afternoonSlot?.avgCustomers ?? 0;
  const morningAvg =
    analysis.timeSlots.find((s) => s.slot === "morning")?.avgCustomers ?? 0;
  if (afternoonAvg > 0 && afternoonAvg < morningAvg * 0.4) {
    tips.push({
      type: "cost",
      category: "profit",
      title: "Ofen ab 15:00 ausschalten — keine Backwaren mehr nötig",
      description:
        "Nachmittagsverkäufe von Backwaren sind durchschnittlich deutlich geringer. Energie sparen.",
      timing: "Ab 15:00",
      reasoning: `Nachmittags Ø ${Math.round(afternoonAvg)} Verkäufe vs. morgens Ø ${Math.round(morningAvg)}.`,
      expectedImpact: { revenue: 0 },
      confidence: conf(analysis.dataQuality, true),
      riskLevel: "low",
      difficulty: "easy",
    });
  }

  // Tip: Kaffeemaschine 2 erst ab 08:00 (if morning traffic low before 8)
  if (morningAvg > 0 && morningAvg < 10) {
    tips.push({
      type: "cost",
      category: "profit",
      title: "Kaffeemaschine 2 erst ab 08:00 einschalten",
      description:
        "Morgens vor 08:00 typischerweise geringer Andrang. Eine Maschine reicht.",
      timing: "Ab 08:00",
      reasoning: `Morgen-Slot Ø ${Math.round(morningAvg)} Verkäufe — geringer Andrang in der Früh.`,
      expectedImpact: { revenue: 0 },
      confidence: conf(analysis.dataQuality),
      riskLevel: "low",
      difficulty: "easy",
    });
  }

  // Tip: Licht im Lager (general)
  tips.push({
    type: "cost",
    category: "profit",
    title: "Licht im Lager ausschalten zwischen 10:00 und 14:00",
    description:
      "In der Mittagszeit oft wenig Lageraktivität. Licht aus spart Strom.",
    timing: "10:00–14:00",
    reasoning: "Allgemeiner Spartipp — Mittag typischerweise ruhiger.",
    expectedImpact: { revenue: 0 },
    confidence: conf(analysis.dataQuality),
    riskLevel: "low",
    difficulty: "easy",
  });

  // Tip: Montag weniger Personal (if Monday weak)
  const mondayPattern = analysis.dayPatterns.find((p) => p.dayOfWeek === 1);
  const overallAvg =
    analysis.dayPatterns.length > 0
      ? analysis.dayPatterns.reduce((s, p) => s + p.avgRevenue, 0) /
        analysis.dayPatterns.length
      : 0;
  if (
    mondayPattern &&
    overallAvg > 0 &&
    mondayPattern.avgRevenue < overallAvg * 0.85
  ) {
    const pct = Math.round((1 - safeDivide(mondayPattern.avgRevenue, overallAvg, 1)) * 100);
    tips.push({
      type: "cost",
      category: "profit",
      title: `Montag: weniger Personal einplanen — durchschnittlich ${pct}% weniger Umsatz`,
      description: "Montags meist schwächerer Tag. Personalbedarf entsprechend anpassen.",
      timing: "Montags",
      reasoning: `Montag Ø €${Math.round(mondayPattern.avgRevenue)} vs. Gesamt Ø €${Math.round(overallAvg)}.`,
      expectedImpact: { revenue: 0 },
      confidence: conf(analysis.dataQuality, true),
      riskLevel: "low",
      difficulty: "easy",
    });
  }

  return tips;
}

// ─── 4. Weekly Coach Summary (Sonntags) ──────────────────────────

export async function getWeeklyCoachSummary(): Promise<{
  totalRevenue: number;
  avgDailyRevenue: number;
  bestDay: string;
  worstDay: string;
  totalWaste: number;
  topProducts: { name: string; units: number; profit: number }[];
  wasteLeaders: { name: string; units: number }[];
  laborCost: number;
  learnings: string[];
} | null> {
  const today = toDateOnly(new Date());
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);

  const [dayCloses, sales, wasteLogs, labor] = await Promise.all([
    prisma.dayClose.findMany({ where: { date: { gte: weekStart, lte: today } }, orderBy: { date: "asc" } }),
    prisma.dailySales.findMany({ where: { date: { gte: weekStart, lte: today } }, include: { product: true } }),
    prisma.wasteLog.findMany({ where: { date: { gte: weekStart, lte: today } }, include: { product: true } }),
    prisma.laborEntry.findMany({ where: { date: { gte: weekStart, lte: today } } }),
  ]);

  if (dayCloses.length === 0) return null;

  const DAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const totalRevenue = dayCloses.reduce((s, d) => s + d.totalRevenue, 0);
  const avgDailyRevenue = safeDivide(totalRevenue, dayCloses.length);
  const totalWaste = dayCloses.reduce((s, d) => s + d.totalWaste, 0);
  const bestDC = dayCloses.reduce((b, d) => d.totalRevenue > b.totalRevenue ? d : b, dayCloses[0]);
  const worstDC = dayCloses.reduce((w, d) => d.totalRevenue < w.totalRevenue ? d : w, dayCloses[0]);
  const bestDay = DAYS[bestDC.date.getDay()] || "—";
  const worstDay = DAYS[worstDC.date.getDay()] || "—";

  // Top products by profit
  const productProfit = new Map<string, { name: string; units: number; profit: number }>();
  for (const s of sales) {
    const margin = s.product.sellPrice - s.product.costPrice;
    const curr = productProfit.get(s.productId) || { name: s.product.name, units: 0, profit: 0 };
    curr.units += s.quantity;
    curr.profit += s.quantity * margin;
    productProfit.set(s.productId, curr);
  }
  const topProducts = [...productProfit.values()].sort((a, b) => b.profit - a.profit).slice(0, 3);

  // Waste leaders
  const wasteMap = new Map<string, { name: string; units: number }>();
  for (const w of wasteLogs) {
    const curr = wasteMap.get(w.productId) || { name: w.product.name, units: 0 };
    curr.units += w.quantity;
    wasteMap.set(w.productId, curr);
  }
  const wasteLeaders = [...wasteMap.values()].sort((a, b) => b.units - a.units).slice(0, 3);

  const laborCost = labor.reduce((s, l) => s + l.totalCost, 0);

  // Auto-generate learnings
  const learnings: string[] = [];
  if (bestDay) learnings.push(`${bestDay} war der beste Tag mit EUR ${bestDC.totalRevenue.toFixed(0)}.`);
  if (wasteLeaders.length > 0) learnings.push(`Größter Waste-Treiber: ${wasteLeaders[0].name} (${wasteLeaders[0].units} Stück).`);
  if (topProducts.length > 0) learnings.push(`Profitabelste Produkte: ${topProducts.map(p => p.name).join(", ")}.`);

  return { totalRevenue, avgDailyRevenue, bestDay, worstDay, totalWaste, topProducts, wasteLeaders, laborCost, learnings };
}

// ─── 5. Marketing Suggestions ────────────────────────────────────

export function generateMarketingSuggestions(analysis: AnalysisResult): CandidateSuggestion[] {
  const suggestions: CandidateSuggestion[] = [];
  const conf = (dq: number, strong = false) => computeConfidence(dq, strong);

  // Products with high margin + high stock = promote
  const promoTargets = analysis.productAnalyses
    .filter(p => p.marginPercent >= 50 && p.currentStock > p.avgDailySales * 2)
    .sort((a, b) => b.marginPercent - a.marginPercent);

  if (promoTargets.length > 0) {
    const p = promoTargets[0];
    suggestions.push({
      type: "social",
      category: "marketing",
      title: `Heute ${p.productName} aktiv bewerben`,
      description: `Hohe Marge (${p.marginPercent.toFixed(0)}%) und genug Lager (${p.currentStock} Stück). Ideal für Social Media oder Tafel.`,
      timing: "Ab Öffnung",
      reasoning: `Marge: ${p.marginPercent.toFixed(0)}%. Lager: ${p.currentStock}. Verbrauch: ${Math.round(p.avgDailySales)}/Tag.`,
      expectedImpact: { revenue: Math.round(p.margin * 5) },
      confidence: conf(analysis.dataQuality, true),
      riskLevel: "low",
      difficulty: "easy",
    });
  }

  // Low-traffic afternoon = afternoon special
  const afternoonSlot = analysis.timeSlots.find(s => s.slot === "afternoon");
  const morningSlot = analysis.timeSlots.find(s => s.slot === "morning");
  if (afternoonSlot && morningSlot && afternoonSlot.avgCustomers < morningSlot.avgCustomers * 0.5) {
    suggestions.push({
      type: "pricing",
      category: "marketing",
      title: "Nachmittags-Aktion: Happy Hour ab 14:00",
      description: "Nachmittags deutlich weniger Kunden. Ein Angebot kann den Umsatz pushen.",
      timing: "14:00-17:00",
      reasoning: `Nachmittag: Ø ${Math.round(afternoonSlot.avgCustomers)} vs. Morgen: Ø ${Math.round(morningSlot.avgCustomers)} Verkäufe.`,
      expectedImpact: { revenue: Math.round(morningSlot.avgCustomers * 0.1 * 3.5) },
      confidence: conf(analysis.dataQuality),
      riskLevel: "low",
      difficulty: "medium",
    });
  }

  return suggestions;
}

// ─── 6. Profit-per-Hour Analyse ──────────────────────────────────

export async function getProfitPerHour(): Promise<Array<{
  hour: number;
  avgRevenue: number;
  avgProfit: number;
  recommendation: string;
}>> {
  const today = toDateOnly(new Date());
  const start28 = new Date(today);
  start28.setDate(start28.getDate() - 27);

  const [sales, settings] = await Promise.all([
    prisma.dailySales.findMany({
      where: { date: { gte: start28, lte: today } },
      include: { product: true },
    }),
    prisma.shopSettings.findFirst(),
  ]);

  const openH = parseInt(settings?.openTime?.split(":")[0] || "6");
  const closeH = parseInt(settings?.closeTime?.split(":")[0] || "18");
  const hourlyCost = safeDivide(settings?.fixedCostsDaily || 400, Math.max(1, closeH - openH));

  const SLOT_HOURS: Record<string, number[]> = {
    morning: [6, 7, 8, 9],
    midday: [10, 11, 12, 13],
    afternoon: [14, 15, 16, 17],
    evening: [18, 19, 20],
  };

  const revenueByHour = new Map<number, number[]>();
  for (let h = openH; h < closeH; h++) revenueByHour.set(h, []);

  const uniqueDates = new Set<number>();
  for (const s of sales) {
    uniqueDates.add(toDateOnly(s.date).getTime());
    const slot = s.timeSlot || "morning";
    const hours = SLOT_HOURS[slot] || SLOT_HOURS.morning;
    const revenuePerHour = safeDivide(s.revenue, hours.length);
    for (const h of hours) {
      if (revenueByHour.has(h)) revenueByHour.get(h)!.push(revenuePerHour);
    }
  }

  const numDays = Math.max(1, uniqueDates.size);

  const result: Array<{ hour: number; avgRevenue: number; avgProfit: number; recommendation: string }> = [];
  for (let h = openH; h < closeH; h++) {
    const arr = revenueByHour.get(h) || [];
    const totalRev = arr.reduce((s, v) => s + v, 0);
    const avgRevenue = totalRev / numDays;
    const avgProfit = avgRevenue - hourlyCost;
    let recommendation = "Profitabel";
    if (avgProfit < 0) recommendation = "Unprofitabel — Öffnungszeiten prüfen";
    else if (avgProfit < hourlyCost * 0.3) recommendation = "Grenzwertig";
    result.push({ hour: h, avgRevenue: Math.round(avgRevenue * 100) / 100, avgProfit: Math.round(avgProfit * 100) / 100, recommendation });
  }

  return result;
}

// ─── 7. New Employee Mode ────────────────────────────────────────

export async function getNewStaffSuggestions(
  analysis: AnalysisResult
): Promise<CandidateSuggestion[]> {
  const today = toDateOnly(new Date());
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const staffSchedules = await prisma.staffSchedule.findMany({
    where: {
      date: {
        gte: today,
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    include: { staff: true },
  });

  const newStaff = staffSchedules.filter(
    (s) => s.staff.startDate > fourteenDaysAgo
  );

  if (newStaff.length === 0) return [];

  const suggestions: CandidateSuggestion[] = [];
  const experiencedStaff = staffSchedules
    .filter((s) => s.staff.startDate <= fourteenDaysAgo)
    .map((s) => s.staff.name);

  for (const s of newStaff) {
    const daysSinceStart = Math.floor(
      (today.getTime() - s.staff.startDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    const dayLabel = Math.max(1, daysSinceStart + 1);

    suggestions.push({
      type: "risk",
      category: "stress",
      title: `${s.staff.name} ist neu (Tag ${dayLabel}). Einfachere Aufgaben zuweisen.`,
      description:
        "Neue Mitarbeitende sollten mit weniger komplexen Tätigkeiten starten.",
      timing: "Heute",
      reasoning: `${s.staff.name} hat vor ${dayLabel} Tagen angefangen.`,
      expectedImpact: { stress: "reduces" },
      confidence: Math.min(100, analysis.dataQuality + 20),
      riskLevel: "low",
      difficulty: "easy",
    });

    if (experiencedStaff.length > 0) {
      const expName = experiencedStaff[0];
      suggestions.push({
        type: "risk",
        category: "stress",
        title: `Komplexe Bestellungen heute von ${expName} übernehmen lassen.`,
        description:
          "Erfahrene Kolleginnen/Kollegen für schwierige Kunden und Spezialbestellungen einsetzen.",
        timing: "Heute",
        reasoning: `${s.staff.name} ist neu. ${expName} übernimmt komplexe Fälle.`,
        expectedImpact: { stress: "reduces" },
        confidence: Math.min(100, analysis.dataQuality + 20),
        riskLevel: "low",
        difficulty: "easy",
      });
    }
  }

  suggestions.push({
    type: "risk",
    category: "stress",
    title: "Extra 10 Minuten für Rush-Hour-Vorbereitung einplanen.",
    description:
      "Mit neuen Mitarbeitenden mehr Vorbereitungszeit für Stoßzeiten einrechnen.",
    timing: "Vor Rush Hour",
    reasoning: "Neue Teammitglieder brauchen mehr Einarbeitung.",
    expectedImpact: { stress: "reduces" },
    confidence: Math.min(100, analysis.dataQuality + 20),
    riskLevel: "low",
    difficulty: "easy",
  });

  return suggestions;
}
