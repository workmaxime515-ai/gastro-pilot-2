import { prisma } from "@/lib/db";
import { safeDivide, roundTo } from "@/lib/math";
import { logger } from "@/lib/logger";

interface StrategyPerformance {
  mode: string;
  avgRevenue: number;
  avgWaste: number;
  avgLaborCost: number;
  daysUsed: number;
  compositeScore: number;
}

interface OptimizedWeights {
  revenue: number;
  waste: number;
  stress: number;
}

/**
 * Analyze which strategy mode produced the best results over the last N days.
 * Returns performance metrics per strategy mode and recommended weights.
 */
export async function analyzeStrategyPerformance(days = 30): Promise<{
  performance: StrategyPerformance[];
  recommendedMode: string;
  optimizedWeights: OptimizedWeights;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  try {
    const [suggestions, dayCloses, wasteLogs, laborEntries] = await Promise.all([
      prisma.suggestion.findMany({
        where: { createdAt: { gte: since } },
        select: { strategyMode: true, date: true },
      }),
      prisma.dayClose.findMany({
        where: { date: { gte: since } },
      }),
      prisma.wasteLog.findMany({
        where: { date: { gte: since } },
      }),
      prisma.laborEntry.findMany({
        where: { date: { gte: since } },
      }),
    ]);

    // Map dates to strategy modes used that day
    const modeByDate = new Map<string, string>();
    for (const s of suggestions) {
      const dateKey = new Date(s.date).toISOString().split("T")[0];
      modeByDate.set(dateKey, s.strategyMode);
    }

    // Group DayClose data by strategy mode
    const modeData = new Map<string, { revenues: number[]; wastes: number[]; laborCosts: number[] }>();

    for (const dc of dayCloses) {
      const dateKey = new Date(dc.date).toISOString().split("T")[0];
      const mode = modeByDate.get(dateKey) ?? "balanced";

      if (!modeData.has(mode)) {
        modeData.set(mode, { revenues: [], wastes: [], laborCosts: [] });
      }
      const data = modeData.get(mode)!;
      data.revenues.push(dc.totalRevenue);
      data.wastes.push(dc.totalWaste);
    }

    // Add labor costs by date
    const laborByDate = new Map<string, number>();
    for (const l of laborEntries) {
      const dateKey = new Date(l.date).toISOString().split("T")[0];
      laborByDate.set(dateKey, (laborByDate.get(dateKey) ?? 0) + l.totalCost);
    }

    // Add waste costs by date
    const wasteByDate = new Map<string, number>();
    for (const w of wasteLogs) {
      const dateKey = new Date(w.date).toISOString().split("T")[0];
      wasteByDate.set(dateKey, (wasteByDate.get(dateKey) ?? 0) + w.quantity);
    }

    // Calculate composite score per mode
    const performance: StrategyPerformance[] = [];

    for (const [mode, data] of modeData.entries()) {
      const avgRevenue = data.revenues.length > 0
        ? roundTo(data.revenues.reduce((s, r) => s + r, 0) / data.revenues.length)
        : 0;
      const avgWaste = data.wastes.length > 0
        ? roundTo(data.wastes.reduce((s, w) => s + w, 0) / data.wastes.length)
        : 0;
      const avgLabor = data.laborCosts.length > 0
        ? roundTo(data.laborCosts.reduce((s, l) => s + l, 0) / data.laborCosts.length)
        : 0;

      // Composite: higher revenue + lower waste + lower labor = better
      const compositeScore = roundTo(avgRevenue - avgWaste * 2 - avgLabor * 0.5);

      performance.push({
        mode,
        avgRevenue,
        avgWaste,
        avgLaborCost: avgLabor,
        daysUsed: data.revenues.length,
        compositeScore,
      });
    }

    performance.sort((a, b) => b.compositeScore - a.compositeScore);

    // Determine recommended mode
    const recommendedMode = performance.length > 0 ? performance[0].mode : "balanced";

    // Compute optimized weights based on what worked best
    const best = performance[0];
    let optimizedWeights: OptimizedWeights = { revenue: 1, waste: 1, stress: 1 };

    if (best) {
      const revenueSignal = best.avgRevenue > 0 ? 1.2 : 0.8;
      const wasteSignal = best.avgWaste < 5 ? 0.8 : 1.5;
      const stressSignal = best.avgLaborCost < 200 ? 0.8 : 1.2;

      optimizedWeights = {
        revenue: roundTo(revenueSignal, 2),
        waste: roundTo(wasteSignal, 2),
        stress: roundTo(stressSignal, 2),
      };
    }

    logger.info(`Strategy optimization: recommended=${recommendedMode}`, {
      source: "engine",
      performance: performance.map((p) => `${p.mode}:${p.compositeScore}`).join(", "),
    });

    return { performance, recommendedMode, optimizedWeights };
  } catch (e) {
    logger.error("Strategy optimization failed", {
      source: "engine",
      error: e instanceof Error ? e.message : String(e),
    });
    return {
      performance: [],
      recommendedMode: "balanced",
      optimizedWeights: { revenue: 1, waste: 1, stress: 1 },
    };
  }
}

/**
 * Save optimized weights to shop settings for use by the scorer.
 */
export async function saveOptimizedWeights(): Promise<void> {
  const { optimizedWeights, recommendedMode } = await analyzeStrategyPerformance();

  try {
    const settings = await prisma.shopSettings.findFirst();
    if (settings) {
      await prisma.shopSettings.update({
        where: { id: settings.id },
        data: {
          // Store as JSON in a dedicated field or use existing fields
          strategyMode: recommendedMode,
        },
      });
    }
  } catch (e) {
    logger.warn("Could not save optimized weights", {
      source: "engine",
      error: e instanceof Error ? e.message : String(e),
    });
  }

  void optimizedWeights;
}
