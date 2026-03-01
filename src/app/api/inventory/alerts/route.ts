import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface Alert {
  id: string;
  type: "expiring" | "low_stock" | "expired";
  severity: "low" | "medium" | "high";
  productName: string;
  productId: string;
  message: string;
  quantity?: number;
  expiresAt?: string;
}

export async function GET() {
  try {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const inventory = await prisma.inventory.findMany({
      include: { product: true },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSales = await prisma.dailySales.findMany({
      where: { date: { gte: sevenDaysAgo } },
      select: { productId: true, quantity: true },
    });

    const avgDailySales = new Map<string, number>();
    for (const sale of recentSales) {
      const current = avgDailySales.get(sale.productId) ?? 0;
      avgDailySales.set(sale.productId, current + sale.quantity);
    }
    for (const [key, total] of avgDailySales) {
      avgDailySales.set(key, total / 7);
    }

    const alerts: Alert[] = [];

    for (const inv of inventory) {
      if (inv.expiresAt) {
        if (inv.expiresAt < now) {
          alerts.push({
            id: `expired-${inv.id}`,
            type: "expired",
            severity: "high",
            productName: inv.product.name,
            productId: inv.productId,
            message: `${inv.product.name} ist abgelaufen (${inv.quantity} ${inv.unit})`,
            quantity: inv.quantity,
            expiresAt: inv.expiresAt.toISOString(),
          });
        } else if (inv.expiresAt <= in48h) {
          alerts.push({
            id: `expiring-${inv.id}`,
            type: "expiring",
            severity: "medium",
            productName: inv.product.name,
            productId: inv.productId,
            message: `${inv.product.name} laeuft in ${Math.ceil((inv.expiresAt.getTime() - now.getTime()) / 3600000)}h ab`,
            quantity: inv.quantity,
            expiresAt: inv.expiresAt.toISOString(),
          });
        }
      }

      const dailyAvg = avgDailySales.get(inv.productId) ?? 0;
      if (dailyAvg > 0 && inv.quantity < dailyAvg * 2) {
        alerts.push({
          id: `low-${inv.id}`,
          type: "low_stock",
          severity: inv.quantity < dailyAvg ? "high" : "medium",
          productName: inv.product.name,
          productId: inv.productId,
          message: `${inv.product.name}: Nur noch ${inv.quantity} ${inv.unit} (Bedarf ~${dailyAvg.toFixed(1)}/Tag)`,
          quantity: inv.quantity,
        });
      }
    }

    alerts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return NextResponse.json({
      alerts,
      summary: {
        total: alerts.length,
        expired: alerts.filter((a) => a.type === "expired").length,
        expiring: alerts.filter((a) => a.type === "expiring").length,
        lowStock: alerts.filter((a) => a.type === "low_stock").length,
      },
    });
  } catch (e) {
    console.error("Inventory alerts error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
