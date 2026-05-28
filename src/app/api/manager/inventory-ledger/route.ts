import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10) || 20));

    const entries = await prisma.inventoryLedger.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        ingredient: { select: { id: true, name: true, unit: true } },
        saleEvent: {
          select: {
            product: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        ingredientName: e.ingredient.name,
        unit: e.ingredient.unit,
        deltaQty: e.deltaQty,
        balanceAfter: e.balanceAfter,
        reason: e.reason,
        createdAt: e.createdAt,
        productName: e.saleEvent?.product?.name ?? null,
      })),
    });
  } catch (error) {
    console.error("Inventory ledger GET error:", error);
    return NextResponse.json(
      { error: "Verlauf konnte nicht geladen werden" },
      { status: 500 }
    );
  }
}
