import { prisma } from "@/lib/db";
import type { CandidateSuggestion } from "./types";

interface ReorderSuggestion {
  supplierName: string;
  supplierId: string;
  products: {
    name: string;
    currentStock: number;
    avgDailyUsage: number;
    daysUntilStockout: number;
    suggestedQuantity: number;
    unit: string;
  }[];
  urgency: "critical" | "soon" | "planned";
  nextDeliveryDay: string | null;
}

export async function generateReorderSuggestions(): Promise<CandidateSuggestion[]> {
  const candidates: CandidateSuggestion[] = [];

  try {
    const [suppliers, inventory, recentSales] = await Promise.all([
      prisma.supplier.findMany({
        where: { isActive: true },
        include: { products: true },
      }),
      prisma.inventory.findMany({
        include: { product: true },
      }),
      prisma.dailySales.findMany({
        where: {
          date: { gte: new Date(Date.now() - 14 * 86400000) },
        },
        select: { productId: true, quantity: true },
      }),
    ]);

    const avgDailyUsage = new Map<string, number>();
    const usageByProduct = new Map<string, number>();
    for (const sale of recentSales) {
      usageByProduct.set(sale.productId, (usageByProduct.get(sale.productId) ?? 0) + sale.quantity);
    }
    for (const [productId, total] of usageByProduct) {
      avgDailyUsage.set(productId, total / 14);
    }

    const stockMap = new Map<string, { quantity: number; unit: string; expiresAt: Date | null }>();
    for (const inv of inventory) {
      stockMap.set(inv.productId, {
        quantity: inv.quantity,
        unit: inv.unit,
        expiresAt: inv.expiresAt,
      });
    }

    const reorderGroups: ReorderSuggestion[] = [];

    for (const supplier of suppliers) {
      const deliveryDays: string[] = supplier.deliveryDays
        ? JSON.parse(supplier.deliveryDays)
        : [];

      const productsNeedingReorder: ReorderSuggestion["products"] = [];

      for (const sp of supplier.products) {
        const matchingInv = inventory.find(
          (inv) => inv.product.name.toLowerCase() === sp.productName.toLowerCase()
        );

        if (!matchingInv) continue;

        const stock = matchingInv.quantity;
        const usage = avgDailyUsage.get(matchingInv.productId) ?? 0;

        if (usage <= 0) continue;

        const daysLeft = stock / usage;

        const leadTimeDays = deliveryDays.length > 0 ? 2 : 3;

        if (daysLeft <= leadTimeDays + 1) {
          const orderDays = Math.max(5, 7);
          const suggestedQty = Math.ceil(usage * orderDays);

          productsNeedingReorder.push({
            name: sp.productName,
            currentStock: stock,
            avgDailyUsage: usage,
            daysUntilStockout: daysLeft,
            suggestedQuantity: suggestedQty,
            unit: sp.unit,
          });
        }
      }

      if (productsNeedingReorder.length > 0) {
        const minDays = Math.min(...productsNeedingReorder.map((p) => p.daysUntilStockout));
        const urgency: "critical" | "soon" | "planned" =
          minDays <= 1 ? "critical" : minDays <= 3 ? "soon" : "planned";

        const nextDelivery = getNextDeliveryDay(deliveryDays);

        reorderGroups.push({
          supplierName: supplier.name,
          supplierId: supplier.id,
          products: productsNeedingReorder,
          urgency,
          nextDeliveryDay: nextDelivery,
        });
      }
    }

    for (const group of reorderGroups) {
      const productList = group.products.map((p) => `${p.name} (${p.suggestedQuantity} ${p.unit})`).join(", ");

      candidates.push({
        type: "reorder",
        category: group.urgency === "critical" ? "emergency" : "stress",
        title: `Bestellung bei ${group.supplierName}: ${group.products.length} Produkt(e)`,
        description: `Bestellen: ${productList}. ${group.nextDeliveryDay ? `Naechster Liefertag: ${group.nextDeliveryDay}.` : ""}`,
        timing: group.urgency === "critical" ? "Sofort" : "Heute",
        reasoning: `Bestandsanalyse: ${group.products.map((p) => `${p.name} reicht noch ${p.daysUntilStockout.toFixed(1)} Tage (${p.currentStock} auf Lager, Verbrauch ${p.avgDailyUsage.toFixed(1)}/Tag)`).join(". ")}.`,
        expectedImpact: { stress: "reduces" },
        confidence: 80,
        riskLevel: group.urgency === "critical" ? "high" : "medium",
        difficulty: "easy",
        inactionRisk: `Ausverkauf bei ${group.products.map((p) => p.name).join(", ")}. Umsatzverlust.`,
      });
    }
  } catch (e) {
    console.error("Reorder suggestion error:", e);
  }

  return candidates;
}

function getNextDeliveryDay(deliveryDays: string[]): string | null {
  if (deliveryDays.length === 0) return null;

  const dayMap: Record<string, number> = {
    Mo: 1, Di: 2, Mi: 3, Do: 4, Fr: 5, Sa: 6, So: 0,
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0,
  };

  const today = new Date().getDay();
  const deliveryDowList = deliveryDays
    .map((d) => dayMap[d])
    .filter((d) => d != null);

  for (let offset = 1; offset <= 7; offset++) {
    const checkDay = (today + offset) % 7;
    if (deliveryDowList.includes(checkDay)) {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + offset);
      const dayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
      return `${dayNames[checkDay]}, ${nextDate.getDate()}.${nextDate.getMonth() + 1}.`;
    }
  }

  return deliveryDays[0] ?? null;
}
