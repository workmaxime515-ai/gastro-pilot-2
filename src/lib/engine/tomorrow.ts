import { prisma } from "@/lib/db";
import type { CandidateSuggestion } from "./types";

const DAY_NAMES_DE = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

/** Normalize a date to midnight for consistent comparisons */
function toDateOnly(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function getTomorrowSuggestions(): Promise<CandidateSuggestion[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tomorrowDow = tomorrow.getDay();
  const todayDow = today.getDay();
  const tomorrowName = DAY_NAMES_DE[tomorrowDow];

  const start28 = new Date(today);
  start28.setDate(start28.getDate() - 27);
  const endOfTomorrow = new Date(tomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);

  const [
    dailySales,
    weatherTomorrow,
    eventsTomorrow,
    inventory,
    products,
  ] = await Promise.all([
    prisma.dailySales.findMany({
      where: { date: { gte: start28, lte: today } },
      include: { product: true },
    }),
    prisma.weatherData.findFirst({
      where: {
        date: { gte: tomorrow, lte: endOfTomorrow },
      },
    }),
    prisma.localEvent.findMany({
      where: {
        date: { gte: tomorrow, lte: endOfTomorrow },
      },
    }),
    prisma.inventory.findMany({
      where: { product: { isActive: true } },
      include: { product: true },
    }),
    prisma.product.findMany({ where: { isActive: true } }),
  ]);

  const suggestions: CandidateSuggestion[] = [];
  const baseSuggestion: Omit<
    CandidateSuggestion,
    "title" | "description" | "reasoning" | "expectedImpact"
  > = {
    type: "tomorrow",
    category: "stress",
    timing: undefined,
    confidence: 70,
    riskLevel: "medium",
    difficulty: "medium",
    targetDate: tomorrow,
    sortOrder: suggestions.length,
  };

  // ─── 1. DOW comparison: tomorrow vs today strength ───────────────────────
  const revenueByDate = new Map<string, { revenue: number; dow: number }>();
  for (const s of dailySales) {
    const key = toDateOnly(s.date).getTime().toString();
    const curr = revenueByDate.get(key) ?? { revenue: 0, dow: toDateOnly(s.date).getDay() };
    curr.revenue += s.revenue;
    revenueByDate.set(key, curr);
  }

  const revenueByDow = new Map<number, number[]>();
  for (let i = 0; i <= 6; i++) revenueByDow.set(i, []);
  for (const [, { revenue, dow }] of Array.from(revenueByDate)) {
    revenueByDow.get(dow)!.push(revenue);
  }

  const todayAvg =
    (revenueByDow.get(todayDow) ?? []).length > 0
      ? (revenueByDow.get(todayDow)!.reduce((a, b) => a + b, 0) /
          revenueByDow.get(todayDow)!.length)
      : 0;
  const tomorrowAvg =
    (revenueByDow.get(tomorrowDow) ?? []).length > 0
      ? (revenueByDow.get(tomorrowDow)!.reduce((a, b) => a + b, 0) /
          revenueByDow.get(tomorrowDow)!.length)
      : 0;

  if (tomorrowAvg > todayAvg && todayAvg > 0) {
    const pct = Math.round(((tomorrowAvg - todayAvg) / todayAvg) * 100);
    const topProductForDow = getTopProductForDow(dailySales, tomorrowDow);
    const productName = topProductForDow ?? "Getränke";
    let reasoning = `Am ${tomorrowName} liegt der durchschnittliche Umsatz ${pct}% höher als heute.`;
    if (weatherTomorrow) {
      reasoning += ` Wetter: ${Math.round(weatherTomorrow.tempHigh)}°C, ${weatherTomorrow.condition}.`;
    }
    suggestions.push({
      ...baseSuggestion,
      title: `Mehr ${productName} für morgen einplanen`,
      description: `Für morgen (${tomorrowName}): Mehr ${productName} vorbereiten, +${pct}% Nachfrage erwartet.`,
      reasoning,
      expectedImpact: { stress: "reduces" },
      sortOrder: suggestions.length,
    });
  }

  // ─── 2. Event tomorrow ───────────────────────────────────────────────────
  for (const ev of eventsTomorrow) {
    suggestions.push({
      ...baseSuggestion,
      title: `Morgen Event: ${ev.name}`,
      description: `Morgen Event: ${ev.name}. Extra vorbereiten.`,
      reasoning: `Am ${tomorrowName} findet das Event "${ev.name}" statt (erwartete Wirkung: ${ev.expectedImpact}).`,
      expectedImpact: { stress: "reduces" },
      sortOrder: suggestions.length,
    });
  }

  // ─── 3. Inventory low – products that might run out ──────────────────────
  const lowStockProducts = findLowStockProducts(inventory, products, dailySales);
  for (const prod of lowStockProducts.slice(0, 2)) {
    suggestions.push({
      ...baseSuggestion,
      title: `Bestellung für morgen: ${prod.name}`,
      description: `Bestellung für morgen aufgeben: ${prod.name} wird knapp.`,
      reasoning: `Der aktuelle Bestand von ${prod.name} reicht voraussichtlich nicht bis morgen.`,
      expectedImpact: { stress: "reduces" },
      sortOrder: suggestions.length,
    });
  }

  return suggestions.slice(0, 3);
}

/** Get top-selling product by revenue for the given day-of-week */
function getTopProductForDow(
  sales: Array<{ revenue: number; date: Date; product: { name: string } }>,
  dow: number
): string | null {
  const byProduct = new Map<string, number>();
  for (const s of sales) {
    if (toDateOnly(s.date).getDay() !== dow) continue;
    byProduct.set(s.product.name, (byProduct.get(s.product.name) ?? 0) + s.revenue);
  }
  let top: string | null = null;
  let max = 0;
  for (const [name, rev] of Array.from(byProduct)) {
    if (rev > max) {
      max = rev;
      top = name;
    }
  }
  return top;
}

/** Products with low stock that might run out by tomorrow */
function findLowStockProducts(
  inventory: Array<{ productId: string; quantity: number; product: { id: string; name: string } }>,
  products: Array<{ id: string; name: string }>,
  dailySales: Array<{ productId: string; quantity: number; date: Date }>
): Array<{ id: string; name: string }> {
  const stockByProduct = new Map<string, number>();
  for (const inv of inventory) {
    stockByProduct.set(
      inv.productId,
      (stockByProduct.get(inv.productId) ?? 0) + inv.quantity
    );
  }

  const salesByProduct = new Map<string, number>();
  for (const s of dailySales) {
    salesByProduct.set(
      s.productId,
      (salesByProduct.get(s.productId) ?? 0) + s.quantity
    );
  }

  const uniqueDates = new Set(dailySales.map((s) => toDateOnly(s.date).getTime()));
  const daysWithSales = Math.max(1, uniqueDates.size);

  const lowStock: Array<{ id: string; name: string }> = [];
  for (const prod of products) {
    const stock = stockByProduct.get(prod.id) ?? 0;
    const totalSold = salesByProduct.get(prod.id) ?? 0;
    const avgDailyUsage = totalSold / daysWithSales;
    if (avgDailyUsage > 0 && stock < avgDailyUsage * 1.5) {
      lowStock.push({ id: prod.id, name: prod.name });
    }
  }
  return lowStock;
}
