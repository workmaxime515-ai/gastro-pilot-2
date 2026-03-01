import type {
  AnalysisResult,
  CandidateSuggestion,
  DayPattern,
  Difficulty,
  ProductAnalysis,
  RiskLevel,
  SuggestionCategory,
  TimeSlotPattern,
} from "./types";
import {
  generateCostSavingTips,
  generateMarketingSuggestions,
  getNewStaffSuggestions,
} from "./extras";
import { prisma } from "@/lib/db";
import { safeDivide } from "@/lib/math";

/** Compute confidence from base data quality + pattern modifiers */
function computeConfidence(
  dataQuality: number,
  modifiers: { strongPattern?: boolean; weakPattern?: boolean; highWasteRate?: boolean }
): number {
  let c = Math.max(0, Math.min(100, dataQuality));
  if (modifiers.strongPattern) c += 15;
  if (modifiers.weakPattern) c -= 20;
  if (modifiers.highWasteRate) c += 10;
  return Math.max(0, Math.min(100, c));
}

/** Get today's day pattern */
function getTodayPattern(dayPatterns: DayPattern[], todayDow: number): DayPattern | undefined {
  return dayPatterns.find((p) => p.dayOfWeek === todayDow);
}

/** Get tomorrow's day pattern (todayDow + 1, wrapping) */
function getTomorrowPattern(dayPatterns: DayPattern[], todayDow: number): DayPattern | undefined {
  const tomorrowDow = (todayDow + 1) % 7;
  return dayPatterns.find((p) => p.dayOfWeek === tomorrowDow);
}

/** Compute DOW strength multiplier: today's avg revenue vs overall average */
function getDowMultiplier(dayPatterns: DayPattern[], todayDow: number): number {
  const today = getTodayPattern(dayPatterns, todayDow);
  if (!today || dayPatterns.length === 0) return 1;
  const overallAvg = safeDivide(
    dayPatterns.reduce((s, p) => s + p.avgRevenue, 0),
    dayPatterns.length
  );
  if (overallAvg <= 0) return 1;
  return safeDivide(today.avgRevenue, overallAvg, 1);
}

/** Check if today's DOW pattern is strong (above average) */
function isDowStrong(dayPatterns: DayPattern[], todayDow: number): boolean {
  return getDowMultiplier(dayPatterns, todayDow) >= 1.0;
}

/** Estimate data points for pattern strength (products with trend data) */
function getPatternDataPoints(analysis: AnalysisResult): number {
  const withTrend = analysis.productAnalyses.filter(
    (p) => p.trend !== "stable" || p.wasteRate > 0
  ).length;
  return withTrend + (analysis.dayPatterns.filter((p) => p.avgRevenue > 0).length > 0 ? 7 : 0);
}

/** Products with high margin (top tier) */
function getHighMarginProducts(products: ProductAnalysis[], minMarginPercent = 40): ProductAnalysis[] {
  const sorted = [...products].filter((p) => p.marginPercent >= minMarginPercent);
  return sorted.sort((a, b) => b.marginPercent - a.marginPercent);
}

/** Products in bakery category (for social / visual appeal) */
function getBakeryProducts(products: ProductAnalysis[]): ProductAnalysis[] {
  const bakeryKeywords = ["backware", "brot", "croissant", "brötchen", "kuchen", "torte", "gebäck", "baking", "bakery"];
  return products.filter((p) =>
    bakeryKeywords.some((k) => p.category.toLowerCase().includes(k) || p.productName.toLowerCase().includes(k))
  );
}

/** Seasonal/cold products (ice, cold drinks for reverse suggestions) */
function getSeasonalColdProducts(products: ProductAnalysis[]): ProductAnalysis[] {
  const coldKeywords = ["eis", "eisk", "kalt", "cold", "ice", "smoothie", "limo", "eiscreme"];
  return products.filter((p) =>
    coldKeywords.some((k) => p.productName.toLowerCase().includes(k))
  );
}

/** Check if weather is rainy/stormy */
function isRainyOrStormy(condition?: string): boolean {
  if (!condition) return false;
  const c = condition.toLowerCase();
  return c.includes("regen") || c.includes("rain") || c.includes("sturm") || c.includes("storm") || c.includes("schauer");
}

/**
 * Generate all applicable candidate suggestions from analysis.
 * Produces 15–30 candidates; scorer will narrow them down.
 */
export async function generateSuggestions(
  analysis: AnalysisResult
): Promise<CandidateSuggestion[]> {
  const candidates: CandidateSuggestion[] = [];
  const todayPattern = getTodayPattern(analysis.dayPatterns, analysis.todayDow);
  const tomorrowPattern = getTomorrowPattern(analysis.dayPatterns, analysis.todayDow);
  const dowMultiplier = getDowMultiplier(analysis.dayPatterns, analysis.todayDow);
  const dowStrong = isDowStrong(analysis.dayPatterns, analysis.todayDow);
  const patternPoints = getPatternDataPoints(analysis);
  const strongPattern = patternPoints > 7;
  const weakPattern = patternPoints < 3;

  // ─── Weather + event context for better explanations ─────────
  const weatherCtx = analysis.todayWeather
    ? ` Wetter: ${analysis.todayWeather.condition}, ${analysis.todayWeather.tempHigh}°C.`
    : "";
  const eventCtx = analysis.todayEvents.length > 0
    ? ` Events: ${analysis.todayEvents.map(e => e.name).join(", ")}.`
    : "";
  const contextStr = weatherCtx + eventCtx;

  // Weather modifier for demand forecasting
  let weatherDemandMod = 1.0;
  if (analysis.todayWeather) {
    const c = analysis.todayWeather.condition.toLowerCase();
    if (c.includes("rain") || c.includes("regen") || c.includes("storm") || c.includes("sturm")) weatherDemandMod = 0.85;
    else if (c.includes("sunny") || c.includes("sonn")) weatherDemandMod = 1.1;
    if (analysis.todayWeather.tempHigh > 28) weatherDemandMod *= 0.95; // less hot food
    if (analysis.todayWeather.tempHigh < 5) weatherDemandMod *= 1.05; // more warm drinks
  }

  // Event modifier
  let eventDemandMod = 1.0;
  for (const ev of analysis.todayEvents) {
    if (ev.impact === "high") eventDemandMod *= 1.3;
    else if (ev.impact === "medium") eventDemandMod *= 1.15;
    else eventDemandMod *= 1.05;
  }

  // ─── 1. Demand Reactions (enhanced with weather + events) ──────
  for (const p of analysis.productAnalyses) {
    const highWaste = p.wasteRate > 0.15;
    const forecastedDemand = p.avgDailySales * dowMultiplier * weatherDemandMod * eventDemandMod;
    if (p.trend === "rising" && dowStrong) {
      const percent = Math.round(Math.min(30, (forecastedDemand / Math.max(1, p.avgDailySales) - 1) * 100 + 10));
      candidates.push({
        type: "demand",
        category: "profit",
        title: `Bereite ${Math.max(5, percent)}% mehr ${p.productName} vor`,
        description: `Trend steigend, heute typischerweise stärkerer Tag.${contextStr}`,
        timing: "Morgens",
        reasoning: `Durchschnitt: ${Math.round(p.avgDailySales)}/Tag. Trend: steigend. Wochentag-Faktor: ${dowMultiplier.toFixed(2)}.${weatherCtx ? ` Wetter-Faktor: ${weatherDemandMod.toFixed(2)}.` : ""}${eventCtx ? ` Event-Faktor: ${eventDemandMod.toFixed(2)}.` : ""} Prognose: ~${Math.round(forecastedDemand)} Stueck.`,
        expectedImpact: { revenue: Math.round(p.margin * forecastedDemand * 0.15) },
        confidence: computeConfidence(analysis.dataQuality, {
          strongPattern: strongPattern,
          weakPattern: weakPattern,
        }),
        riskLevel: "low",
        difficulty: "easy",
        inactionRisk: `Kurzzeitig ausverkauft, Umsatzverlust möglich (~EUR ${Math.round(p.margin * 3)}).`,
      });
    }
    if (p.trend === "falling" || highWaste) {
      const reduceBy = Math.max(1, Math.round(p.avgDailySales * 0.15));
      candidates.push({
        type: "demand",
        category: highWaste ? "waste" : "profit",
        title: `Reduziere ${p.productName}-Produktion um ${reduceBy} Stück`,
        description: p.trend === "falling"
          ? `Nachfrage geht zurück. Weniger produzieren spart Kosten und Abfall.`
          : `Waste-Rate ${(p.wasteRate * 100).toFixed(0)}% — zu viel produziert.`,
        timing: "Vor Produktionsstart",
        reasoning: `Trend: ${p.trend}. Waste-Rate: ${(p.wasteRate * 100).toFixed(0)}%. Ø ${Math.round(p.avgDailySales)}/Tag.`,
        expectedImpact: { waste: Math.round(reduceBy * p.margin * 0.3) },
        confidence: computeConfidence(analysis.dataQuality, {
          strongPattern: strongPattern,
          weakPattern: weakPattern,
          highWasteRate: highWaste,
        }),
        riskLevel: "low",
        difficulty: "easy",
        inactionRisk: `Weiterer Abfall, Kosten steigen.`,
      });
    }
  }

  // ─── 2. Inventory Adjustments ──────────────────────────────────
  for (const p of analysis.productAnalyses) {
    if (p.daysUntilStockout <= 2 && p.daysUntilStockout >= 0) {
      const days = Math.ceil(p.daysUntilStockout);
      candidates.push({
        type: "reorder",
        category: "waste",
        title: `${p.productName} wird in ${days} Tag(en) ausgehen`,
        description: `Heute bestellen, damit keine Lücke entsteht.`,
        timing: "Heute",
        reasoning: `Lager: ${p.currentStock} Stück. Ø Verbrauch: ${Math.round(p.avgDailySales)}/Tag.`,
        expectedImpact: { stress: "reduces" },
        confidence: computeConfidence(analysis.dataQuality, {
          strongPattern: strongPattern,
          weakPattern: weakPattern,
        }),
        riskLevel: "medium",
        difficulty: "easy",
        inactionRisk: `Ausverkauf, Kunden unzufrieden, Umsatzverlust.`,
      });
    }
    if (p.currentStock > 0 && p.spoilageHours > 0 && p.spoilageHours < 24) {
      candidates.push({
        type: "inventory",
        category: "waste",
        title: `Verbrauche ${p.productName} zuerst`,
        description: `Haltbarkeit unter 24 Stunden — möglichst schnell verkaufen oder verarbeiten.`,
        timing: "Sofort",
        reasoning: `Haltbarkeit: ${p.spoilageHours} h. Lager: ${p.currentStock} Stück.`,
        expectedImpact: { waste: Math.round(p.currentStock * (p.margin ?? 0) / 10) },
        confidence: computeConfidence(analysis.dataQuality, {}),
        riskLevel: "medium",
        difficulty: "easy",
        inactionRisk: `Abfall in wenigen Stunden.`,
      });
    }
  }

  // ─── 3. Pricing/Bundles ───────────────────────────────────────
  if (dowMultiplier < 0.8) {
    const highMargin = getHighMarginProducts(analysis.productAnalyses);
    const lead = highMargin[0];
    if (lead) {
      const sellPrice = lead.marginPercent > 0 ? lead.margin * (100 + lead.marginPercent) / lead.marginPercent : lead.margin * 3;
      const bundlePrice = Math.round(sellPrice * 0.85 * 100) / 100;
      candidates.push({
        type: "pricing",
        category: "profit",
        title: `Mittagsdeal anbieten: ${lead.productName} + Kaffee für €${bundlePrice.toFixed(2)}`,
        description: `Ruhiger Tag — Deal lockt zusätzliche Kunden. Marge von ${lead.productName} bleibt hoch.`,
        timing: "11–14 Uhr",
        reasoning: `DOW-Multiplikator heute: ${dowMultiplier.toFixed(2)} (< 0,8 = ruhiger Tag). Marge ${lead.productName}: ${lead.marginPercent.toFixed(0)}%.`,
        expectedImpact: { revenue: Math.round(lead.margin * 2) },
        confidence: computeConfidence(analysis.dataQuality, {
          strongPattern: strongPattern,
          weakPattern: weakPattern,
        }),
        riskLevel: "low",
        difficulty: "medium",
        inactionRisk: `Weniger Umsatz an ruhigem Tag.`,
      });
    }
  }

  // ─── 4. Waste-based ───────────────────────────────────────────
  for (const p of analysis.productAnalyses) {
    if (p.wasteRate > 0.15) {
      const avgWasted = Math.round(p.avgDailySales * p.wasteRate);
      candidates.push({
        type: "waste",
        category: "waste",
        title: `Letzte Woche: Ø ${avgWasted} ${p.productName} weggeworfen`,
        description: `Heute weniger backen.`,
        timing: "Vor Produktionsstart",
        reasoning: `Waste-Rate: ${(p.wasteRate * 100).toFixed(0)}%. Ø Verkauf: ${Math.round(p.avgDailySales)}/Tag.`,
        expectedImpact: { waste: Math.round(avgWasted * (p.margin ?? 0) * -0.5) },
        confidence: computeConfidence(analysis.dataQuality, {
          highWasteRate: true,
          strongPattern: strongPattern,
          weakPattern: weakPattern,
        }),
        riskLevel: "low",
        difficulty: "easy",
        inactionRisk: `Weiterer Abfall, Kostentreiber.`,
      });
    }
  }

  // ─── 5. Break-Even ────────────────────────────────────────────
  if (analysis.breakEven.remainingTarget > 0) {
    const highMargin = getHighMarginProducts(analysis.productAnalyses);
    const suggestion = highMargin[0]
      ? `${highMargin[0].productName} bewerben`
      : "Umsatz pushen";
    candidates.push({
      type: "breakeven",
      category: "profit",
      title: `Noch €${analysis.breakEven.remainingTarget.toFixed(0)} bis Break-Even`,
      description: `Empfehlung: ${suggestion}`,
      timing: "Heute",
      reasoning: `Tageskosten: €${analysis.breakEven.dailyCost}. Aktuell: €${analysis.breakEven.currentRevenue}.`,
      expectedImpact: { revenue: analysis.breakEven.remainingTarget },
      confidence: computeConfidence(analysis.dataQuality, {}),
      riskLevel: "medium",
      difficulty: "medium",
      inactionRisk: `Tag endet unter Break-Even, Verlust.`,
    });
  }

  // ─── 6. Tomorrow Prep ──────────────────────────────────────────
  if (tomorrowPattern && todayPattern && tomorrowPattern.avgRevenue > todayPattern.avgRevenue * 1.05) {
    const highMargin = getHighMarginProducts(analysis.productAnalyses)[0];
    const prepProduct = highMargin?.productName ?? "beliebte Produkte";
    candidates.push({
      type: "tomorrow",
      category: "stress",
      title: `Für morgen vorbereiten: ${prepProduct}`,
      description: `Morgen typischerweise stärkerer Tag. Vorproduktion reduzieren Stress.`,
      timing: "Heute Abend",
      reasoning: `Morgen Ø Umsatz: €${Math.round(tomorrowPattern.avgRevenue)}. Heute: €${Math.round(todayPattern.avgRevenue)}.`,
      expectedImpact: { stress: "reduces" },
      confidence: computeConfidence(analysis.dataQuality, {
        strongPattern: strongPattern,
        weakPattern: weakPattern,
      }),
      riskLevel: "low",
      difficulty: "medium",
      inactionRisk: `Morgen Zeitdruck, möglicher Ausverkauf.`,
    });
  }

  // ─── 7. Risk Prevention ────────────────────────────────────────
  for (const p of analysis.productAnalyses) {
    if (p.wasteRate > 0.05 && p.avgDailySales > 0) {
      const expectedWaste = Math.round(p.avgDailySales * p.wasteRate);
      if (expectedWaste >= 1) {
        candidates.push({
          type: "risk",
          category: "waste",
          title: `Ohne Aktion: ~${expectedWaste} ${p.productName} Abfall erwartet`,
          description: `Basierend auf Ø Waste der letzten Wochen.`,
          timing: "Vor Produktionsstart",
          reasoning: `Ø Verkauf: ${Math.round(p.avgDailySales)}. Waste-Rate: ${(p.wasteRate * 100).toFixed(0)}%.`,
          expectedImpact: { waste: expectedWaste },
          confidence: computeConfidence(analysis.dataQuality, {
            highWasteRate: p.wasteRate > 0.15,
            strongPattern: strongPattern,
            weakPattern: weakPattern,
          }),
          riskLevel: "medium",
          difficulty: "easy",
          inactionRisk: `~${expectedWaste} Stück Abfall, Kosten ~€${Math.round(expectedWaste * p.margin)}.`,
        });
      }
    }
  }

  // ─── 8. Reverse Suggestions ────────────────────────────────────
  if (isRainyOrStormy(analysis.todayWeather?.condition)) {
    const cold = getSeasonalColdProducts(analysis.productAnalyses);
    const product = cold[0] ?? analysis.productAnalyses.find((p) => p.category.toLowerCase().includes("getränk") || p.category.toLowerCase().includes("drink"));
    if (product) {
      candidates.push({
        type: "reverse",
        category: "waste",
        title: `Heute NICHT mehr ${product.productName} bestellen`,
        description: `Bei Regen/Sturm weniger Nachfrage nach kalten/seasonalen Produkten.`,
        timing: "Bei Bestellrunde",
        reasoning: `Wetter: ${analysis.todayWeather?.condition ?? "nass"}. Typisch: weniger Kaltgetränke/Eis.`,
        expectedImpact: { waste: Math.round(product.avgDailySales * product.wasteRate * product.margin) },
        confidence: computeConfidence(analysis.dataQuality, {}),
        riskLevel: "low",
        difficulty: "easy",
        inactionRisk: `Überbestand, Abfall bei schlechtem Wetter.`,
      });
    }
  }

  // ─── 9. Special ────────────────────────────────────────────────
  const forSpecial = analysis.productAnalyses
    .filter((p) => p.currentStock > 0 && p.marginPercent >= 30)
    .sort((a, b) => b.marginPercent - a.marginPercent);
  const specialProduct = forSpecial[0];
  if (specialProduct) {
    candidates.push({
      type: "special",
      category: "profit",
      title: `Tages-Spezial: ${specialProduct.productName}`,
      description: `Hohe Marge, ausreichend Lager. Ideal für Tagesangebot.`,
      timing: "Ab Öffnung",
      reasoning: `Marge: ${specialProduct.marginPercent.toFixed(0)}%. Lager: ${specialProduct.currentStock}.`,
      expectedImpact: { revenue: Math.round(specialProduct.margin * 3) },
      confidence: computeConfidence(analysis.dataQuality, {}),
      riskLevel: "low",
      difficulty: "easy",
      inactionRisk: `Verpasste Upsell-Chance.`,
    });
  }

  // ─── 10. Social Media ──────────────────────────────────────────
  const bakery = getBakeryProducts(analysis.productAnalyses);
  const visualProduct = bakery[0] ?? analysis.productAnalyses.filter((p) => p.avgDailySales > 0)[0];
  if (visualProduct) {
    candidates.push({
      type: "social",
      category: "marketing",
      title: `Instagram-Post um 9:15 — ${visualProduct.productName}`,
      description: `Bestes Produkt für visuelle Wirkung aus Backwaren-Kategorie.`,
      timing: "9:15 Uhr",
      reasoning: `Kategorie: ${visualProduct.category}. Hohe Sichtbarkeit zu Morgenzeit.`,
      expectedImpact: { revenue: Math.round(visualProduct.margin) },
      confidence: computeConfidence(analysis.dataQuality, {}),
      riskLevel: "low",
      difficulty: "easy",
      inactionRisk: `Verpasste Reichweite.`,
    });
  }

  // ─── 11. Rush Hour ─────────────────────────────────────────────
  const rushSlot = analysis.timeSlots.find(
    (s: TimeSlotPattern & { rushStartsAt?: string }) =>
      s.avgCustomers > 0 && (s as { rushStartsAt?: string }).rushStartsAt
  ) as (TimeSlotPattern & { rushStartsAt?: string }) | undefined;
  if (rushSlot?.rushStartsAt) {
    candidates.push({
      type: "rush",
      category: "stress",
      title: `Rush Hour beginnt um ${rushSlot.rushStartsAt}`,
      description: `Jetzt vorbereiten — typischer Stau in ${rushSlot.slot}.`,
      timing: "15 Min vor Rush",
      reasoning: `Slot ${rushSlot.slot}: Ø ${Math.round(rushSlot.avgCustomers)} Kunden.`,
      expectedImpact: { stress: "reduces" },
      confidence: computeConfidence(analysis.dataQuality, {
        strongPattern: strongPattern,
        weakPattern: weakPattern,
      }),
      riskLevel: "low",
      difficulty: "medium",
      inactionRisk: `Wartezeiten, unzufriedene Kunden.`,
    });
  }
  // Fallback: infer rush from peak slot
  const peakSlot = [...analysis.timeSlots].sort((a, b) => b.avgCustomers - a.avgCustomers)[0];
  if (peakSlot && peakSlot.avgCustomers > 0 && !rushSlot) {
    const slotTimes: Record<string, string> = {
      morning: "8:00",
      midday: "11:30",
      afternoon: "14:30",
      evening: "17:00",
    };
    const startTime = slotTimes[peakSlot.slot] ?? "11:00";
    candidates.push({
      type: "rush",
      category: "stress",
      title: `In ~15 Minuten beginnt Rush Hour (${peakSlot.slot})`,
      description: `Jetzt vorbereiten — typischer Peak um ${startTime}.`,
      timing: "Jetzt",
      reasoning: `Slot ${peakSlot.slot}: Ø ${Math.round(peakSlot.avgCustomers)} Verkäufe. Peak-Tag: ${peakSlot.peakDay}.`,
      expectedImpact: { stress: "reduces" },
      confidence: computeConfidence(analysis.dataQuality, {
        strongPattern: strongPattern,
        weakPattern: weakPattern,
      }),
      riskLevel: "low",
      difficulty: "medium",
      inactionRisk: `Wartezeiten, Stress im Team.`,
    });
  }

  // ─── 12. New Staff ──────────────────────────────────────────────
  const newStaff = analysis.staffToday.filter((s) => s.isNew);
  for (const s of newStaff) {
    candidates.push({
      type: "timing",
      category: "stress",
      title: `${s.name} ist Tag 1–14 (neu)`,
      description: `Einfacheres Menü empfohlen — weniger Komplexität für Einarbeitung.`,
      timing: "Heute",
      reasoning: `Neues Teammitglied. Weniger Fehler und Stress durch reduziertes Menü.`,
      expectedImpact: { stress: "reduces" },
      confidence: computeConfidence(analysis.dataQuality, {}),
      riskLevel: "low",
      difficulty: "medium",
      inactionRisk: `Mehr Fehler, längere Wartezeiten, Stress.`,
    });
  }

  // ─── 13. Smart Reorder Alerts ─────────────────────────────────
  for (const p of analysis.productAnalyses) {
    if (p.avgDailySales > 0 && p.currentStock > 0 && p.daysUntilStockout <= 3 && p.daysUntilStockout > 0) {
      const hoursLeft = Math.round(p.daysUntilStockout * 24);
      const deadline = hoursLeft <= 24 ? "heute" : `in ${Math.ceil(p.daysUntilStockout)} Tagen`;
      candidates.push({
        type: "reorder",
        category: "stress",
        title: `${p.productName} reicht noch ~${p.daysUntilStockout.toFixed(1)} Tage`,
        description: `Bestelle ${deadline}, damit keine Luecke entsteht. Verbrauch: ${Math.round(p.avgDailySales)}/Tag, Lager: ${p.currentStock}.`,
        timing: hoursLeft <= 8 ? "Sofort" : "Bis 15:00",
        reasoning: `Bestand: ${p.currentStock}. Tagesverbrauch: ${Math.round(p.avgDailySales)}. Reichweite: ${p.daysUntilStockout.toFixed(1)} Tage.`,
        expectedImpact: { stress: "reduces" },
        confidence: computeConfidence(analysis.dataQuality, { strongPattern: strongPattern }),
        riskLevel: p.daysUntilStockout <= 1 ? "high" : "medium",
        difficulty: "easy",
        inactionRisk: `Ausverkauf in ${deadline}, Umsatzverlust ~EUR ${Math.round(p.avgDailySales * p.margin)}/Tag.`,
      });
    }
  }

  // ─── 14. Weather-Correlation Demand Adjustment ─────────────────
  if (analysis.todayWeather && Object.keys(analysis.revenueByWeather).length > 0) {
    const todayCondition = analysis.todayWeather.condition.toLowerCase();
    const avgForCondition = analysis.revenueByWeather[todayCondition];
    const overallAvg = Object.values(analysis.revenueByWeather).reduce((s, r) => s + r, 0) / Math.max(1, Object.keys(analysis.revenueByWeather).length);

    if (avgForCondition && overallAvg > 0) {
      const weatherRatio = avgForCondition / overallAvg;
      if (weatherRatio < 0.85) {
        candidates.push({
          type: "demand",
          category: "waste",
          title: `${analysis.todayWeather.condition}: Historisch ${Math.round((1 - weatherRatio) * 100)}% weniger Umsatz`,
          description: `Bei diesem Wetter typischerweise weniger Kunden. Produktion anpassen.`,
          timing: "Vor Produktionsstart",
          reasoning: `Historisch: ${avgForCondition.toFixed(0)} EUR bei ${todayCondition} vs. ${overallAvg.toFixed(0)} EUR Durchschnitt.`,
          expectedImpact: { waste: Math.round(overallAvg * 0.1) },
          confidence: computeConfidence(analysis.dataQuality, { strongPattern }),
          riskLevel: "low",
          difficulty: "easy",
          inactionRisk: `Ueberproduktion bei schlechtem Wetter.`,
        });
      } else if (weatherRatio > 1.15) {
        candidates.push({
          type: "demand",
          category: "profit",
          title: `${analysis.todayWeather.condition}: Historisch ${Math.round((weatherRatio - 1) * 100)}% mehr Umsatz`,
          description: `Bei diesem Wetter mehr Nachfrage erwartet. Mehr vorbereiten.`,
          timing: "Morgens",
          reasoning: `Historisch: ${avgForCondition.toFixed(0)} EUR bei ${todayCondition} vs. ${overallAvg.toFixed(0)} EUR Durchschnitt.`,
          expectedImpact: { revenue: Math.round(overallAvg * 0.1) },
          confidence: computeConfidence(analysis.dataQuality, { strongPattern }),
          riskLevel: "low",
          difficulty: "easy",
          inactionRisk: `Ausverkauf bei gutem Wetter.`,
        });
      }
    }
  }

  // ─── 15. Seasonal Product Suggestions ──────────────────────────
  for (const sp of analysis.seasonalProducts) {
    if (sp.isInSeason) {
      candidates.push({
        type: "special",
        category: "profit",
        title: `Saisonprodukt bewerben: ${sp.name}`,
        description: `${sp.name} ist aktuell in Saison. Ideal fuer Tages-Spezial oder Social-Media-Post.`,
        timing: "Ab Oeffnung",
        reasoning: `Saisonmonate: ${sp.seasonMonths.join(", ")}. Aktueller Monat: ${new Date().getMonth() + 1}.`,
        expectedImpact: { revenue: 20 },
        confidence: 70,
        riskLevel: "low",
        difficulty: "easy",
        inactionRisk: `Saisonale Chance verpasst.`,
      });
    }
  }

  // ─── 16. Recipe Costing — Margen-Vorschlaege ──────────────────
  try {
    const recipes = await prisma.recipe.findMany({
      where: { isActive: true },
      include: { ingredients: true },
    });
    for (const recipe of recipes) {
      if (recipe.sellPrice <= 0 || recipe.ingredients.length === 0) continue;
      const totalCost = recipe.ingredients.reduce((s, ing) => s + ing.quantity * ing.costPerUnit, 0);
      const costPerServing = totalCost / Math.max(1, recipe.servings);
      const margin = recipe.sellPrice - costPerServing;
      const marginPercent = (margin / recipe.sellPrice) * 100;

      if (marginPercent < 60) {
        const targetCost = recipe.sellPrice * 0.35;
        const overCost = costPerServing - targetCost;
        const expensiveIng = [...recipe.ingredients].sort((a, b) =>
          (b.quantity * b.costPerUnit) - (a.quantity * a.costPerUnit)
        )[0];

        candidates.push({
          type: "cost",
          category: "profit" as SuggestionCategory,
          title: `${recipe.name}: Marge nur ${marginPercent.toFixed(0)}%`,
          description: expensiveIng
            ? `Teuerste Zutat: ${expensiveIng.name} (${(expensiveIng.quantity * expensiveIng.costPerUnit).toFixed(2)} EUR). Preis anpassen oder Zutat wechseln.`
            : `Kosten pro Portion: ${costPerServing.toFixed(2)} EUR bei VK ${recipe.sellPrice.toFixed(2)} EUR.`,
          timing: "Bei naechster Preisanpassung",
          reasoning: `Zielkostenanteil: 35%. Aktuell: ${((costPerServing / recipe.sellPrice) * 100).toFixed(0)}%. Ueberkosten: ${overCost.toFixed(2)} EUR/Portion.`,
          expectedImpact: { revenue: Math.round(overCost * 10) },
          confidence: computeConfidence(analysis.dataQuality, {}),
          riskLevel: "low" as RiskLevel,
          difficulty: "medium" as Difficulty,
          inactionRisk: `Niedrige Marge frisst Gewinn. Bei 10 Verkäufen/Tag: ${(overCost * 10).toFixed(0)} EUR/Tag Differenz.`,
        });
      }
    }
  } catch {
    // Recipe data not available, skip
  }

  // ─── 17. Revenue Goal Push ──────────────────────────────────────
  if (analysis.revenueGoal && analysis.revenueGoal.remaining > 0) {
    const rg = analysis.revenueGoal;
    candidates.push({
      type: "breakeven",
      category: "profit",
      title: `Noch €${rg.remaining.toFixed(0)} bis ${rg.period === "daily" ? "Tagesziel" : rg.period === "weekly" ? "Wochenziel" : "Monatsziel"}`,
      description: `Ziel: €${rg.target.toFixed(0)}. Aktuell: €${rg.current.toFixed(0)}.`,
      timing: "Heute",
      reasoning: `Revenue Goal ${rg.period}: €${rg.target}. Noch ${((rg.remaining / rg.target) * 100).toFixed(0)}% offen.`,
      expectedImpact: { revenue: rg.remaining },
      confidence: computeConfidence(analysis.dataQuality, {}),
      riskLevel: rg.remaining > rg.target * 0.5 ? "high" : "medium",
      difficulty: "medium",
      inactionRisk: `Ziel wird verfehlt.`,
    });
  }

  // ─── 18. Customer Traffic Suggestions ──────────────────────────
  if (analysis.customerTraffic.trend === "falling" && analysis.customerTraffic.avgDaily > 0) {
    candidates.push({
      type: "demand",
      category: "marketing",
      title: `Kundenfrequenz sinkt (Ø ${analysis.customerTraffic.avgDaily}/Tag)`,
      description: `Weniger Kunden als ueblich. Aktion oder Social-Media-Push empfohlen.`,
      timing: "Heute",
      reasoning: `Letzter Wert: ${analysis.customerTraffic.todayCount}. Ø letzte Woche: ${analysis.customerTraffic.avgDaily}.`,
      expectedImpact: { revenue: Math.round(analysis.customerTraffic.avgDaily * 2) },
      confidence: computeConfidence(analysis.dataQuality, {}),
      riskLevel: "medium",
      difficulty: "medium",
      inactionRisk: `Weitere Umsatzrueckgaenge.`,
    });
  }

  // ─── 19. Promotion Repeat Suggestion ───────────────────────────
  for (const promo of analysis.activePromotions) {
    candidates.push({
      type: "special",
      category: "marketing",
      title: `Aktive Aktion: ${promo.name}`,
      description: `${promo.type}-Aktion laeuft. Heute verstaerkt kommunizieren (Tafel, Social).`,
      timing: "Ab Oeffnung",
      reasoning: `Rabatt: ${promo.discount}%. Typ: ${promo.type}.`,
      expectedImpact: { revenue: 15 },
      confidence: 75,
      riskLevel: "low",
      difficulty: "easy",
      inactionRisk: `Aktion verpufft ohne Sichtbarkeit.`,
    });
  }

  // ─── 20. Competitor Reaction Suggestions ───────────────────────
  for (const comp of analysis.competitorAlerts.slice(0, 2)) {
    candidates.push({
      type: "risk",
      category: "marketing",
      title: `Konkurrent ${comp.name}: ${comp.event}`,
      description: comp.notes ?? `Gegenmaßnahme empfohlen — eigene Staerken betonen.`,
      timing: "Heute",
      reasoning: `Wettbewerber-Beobachtung von den letzten 7 Tagen.`,
      expectedImpact: { revenue: 10 },
      confidence: 55,
      riskLevel: "medium",
      difficulty: "medium",
      inactionRisk: `Kunden koennten zur Konkurrenz wechseln.`,
    });
  }

  // ─── 21. Temperature Compliance Warnings ───────────────────────
  for (const temp of analysis.tempAlerts.slice(0, 2)) {
    candidates.push({
      type: "risk",
      category: "emergency",
      title: `Temperatur-Warnung: ${temp.equipment} (${temp.temperature}°C)`,
      description: `Temperatur ausserhalb des Zielbereichs. Sofort pruefen!`,
      timing: "Sofort",
      reasoning: `Gemessene Temperatur: ${temp.temperature}°C. Ausserhalb des zulaessigen Bereichs.`,
      expectedImpact: { stress: "reduces" },
      confidence: 90,
      riskLevel: "high",
      difficulty: "easy",
      inactionRisk: `Lebensmittelsicherheitsrisiko, moeglicher Warenverlust.`,
    });
  }

  // ─── 22. Cash Discrepancy Alert ────────────────────────────────
  if (analysis.cashDiscrepancy) {
    const cd = analysis.cashDiscrepancy;
    candidates.push({
      type: "risk",
      category: "stress",
      title: `Kassendifferenz: ${cd.diff > 0 ? "+" : ""}${cd.diff.toFixed(2)} EUR (${cd.date})`,
      description: `Erwartet: €${cd.expected.toFixed(2)}, Gezaehlt: €${cd.actual.toFixed(2)}.`,
      timing: "Heute pruefen",
      reasoning: `Differenz von ${Math.abs(cd.diff).toFixed(2)} EUR bei letzter Kassenzaehlung.`,
      expectedImpact: { stress: "reduces" },
      confidence: 85,
      riskLevel: Math.abs(cd.diff) > 20 ? "high" : "medium",
      difficulty: "easy",
      inactionRisk: `Unkontrollierte Kassendifferenzen.`,
    });
  }

  // ─── 23. Pending Orders Context ────────────────────────────────
  for (const po of analysis.pendingOrders.slice(0, 2)) {
    candidates.push({
      type: "reorder",
      category: "stress",
      title: `Offene Bestellung bei ${po.supplierName} (${po.itemCount} Artikel)`,
      description: po.deliveryDate
        ? `Lieferung erwartet am ${po.deliveryDate}. Status pruefen.`
        : `Kein Lieferdatum hinterlegt — nachfragen.`,
      timing: "Heute",
      reasoning: `Bestellung mit ${po.itemCount} Positionen noch offen.`,
      expectedImpact: { stress: "reduces" },
      confidence: 70,
      riskLevel: po.deliveryDate ? "low" : "medium",
      difficulty: "easy",
      inactionRisk: `Lieferverzoegerung, moeglicher Engpass.`,
    });
  }

  // ─── 24. Extras: Cost-Saving, Marketing & New Staff ─────────────
  const costTips = generateCostSavingTips(analysis);
  const marketingTips = generateMarketingSuggestions(analysis);
  const newStaffExtras = await getNewStaffSuggestions(analysis);

  // ─── 25. Time-Based Recommendations ─────────────────────────────
  const timeRecs = generateTimeBasedRecommendations();

  return [...candidates, ...costTips, ...marketingTips, ...newStaffExtras, ...timeRecs];
}

function generateTimeBasedRecommendations(): CandidateSuggestion[] {
  const recs: CandidateSuggestion[] = [];
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Early morning prep (5-7)
  if (hour >= 5 && hour < 7) {
    recs.push({
      type: "production",
      category: "revenue",
      title: "Morgen-Vorbereitung: Backwaren und Kaffee-Setup",
      description: "Croissants aufbacken, Espressomaschine vorheizen, Vitrine bestücken.",
      timing: `Jetzt (${hour}:${minute < 10 ? "0" + minute : minute})`,
      reasoning: "Frueh-Rush beginnt in weniger als 1 Stunde. Alles muss bereit sein.",
      expectedImpact: { revenue: 30, waste: -5 },
      confidence: 90,
      riskLevel: "low",
      difficulty: "easy",
      inactionRisk: "Kunden muessen warten, verlorene Fruehstuecks-Umsaetze.",
    });
  }

  // Morning rush (7-10)
  if (hour >= 7 && hour < 10) {
    recs.push({
      type: "production",
      category: "revenue",
      title: "Morgen-Rush aktiv — Espresso-Nachschub sicherstellen",
      description: "Bohnen pruefen, Milch nachfuellen, Take-Away-Material bereit halten.",
      timing: `Jetzt (Rush Hour)`,
      reasoning: "Zwischen 7 und 10 Uhr liegt typischerweise der groesste Kaffee-Umsatz.",
      expectedImpact: { revenue: 50 },
      confidence: 85,
      riskLevel: "low",
      difficulty: "easy",
      inactionRisk: "Engpaesse waehrend der staerksten Umsatzphase.",
    });
  }

  // Lunch prep (10:30-11:30)
  if (hour === 10 && minute >= 30 || hour === 11 && minute < 30) {
    recs.push({
      type: "production",
      category: "revenue",
      title: "Mittagsvorbereitung starten",
      description: "Sandwiches, Suppen und warme Snacks vorbereiten. Vitrine aktualisieren.",
      timing: "In 30-60 Minuten Mittag",
      reasoning: "Lunch-Rush beginnt typischerweise gegen 11:30-12:00 Uhr.",
      expectedImpact: { revenue: 40 },
      confidence: 80,
      riskLevel: "low",
      difficulty: "medium",
      inactionRisk: "Fehlende Mittagsangebote, Kunden gehen woanders hin.",
    });
  }

  // Afternoon lull (14-16)
  if (hour >= 14 && hour < 16) {
    recs.push({
      type: "discount",
      category: "revenue",
      title: "Nachmittags-Angebot: Kuchen + Kaffee Kombi",
      description: "Kombinationsangebot fuer Nachmittagskuchen mit Getraenk pushen.",
      timing: `Jetzt (${hour}:${minute < 10 ? "0" + minute : minute})`,
      reasoning: "Zwischen 14 und 16 Uhr ist typischerweise eine ruhige Phase. Kombiangebote koennen den Umsatz steigern.",
      expectedImpact: { revenue: 25 },
      confidence: 75,
      riskLevel: "low",
      difficulty: "easy",
      inactionRisk: "Verpasstes Umsatzpotenzial in der Nachmittagsphase.",
    });
  }

  // End of day (16-18) — discount soon-expiring items
  if (hour >= 16 && hour < 18) {
    recs.push({
      type: "discount",
      category: "waste",
      title: "Abverkauf: Restbestande zu reduziertem Preis",
      description: "Backwaren und verderbliche Waren mit 30-50% Rabatt anbieten.",
      timing: `Jetzt — noch ${18 - hour} Stunden bis Ladenschluss`,
      reasoning: "Waren die heute nicht verkauft werden, werden morgen Waste. Lieber guenstig verkaufen.",
      expectedImpact: { waste: -10, revenue: 15 },
      confidence: 80,
      riskLevel: "low",
      difficulty: "easy",
      inactionRisk: "Mehr Waste morgen frueh.",
    });
  }

  return recs;
}
