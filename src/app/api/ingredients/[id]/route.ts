import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { parseJsonWithLimit } from "@/lib/guardrails";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  stockQty: z.number().min(0).optional(),
  minStock: z.number().min(0).nullable().optional(),
  costPerUnit: z.number().min(0).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = await parseJsonWithLimit(request, 32_000, patchSchema);
    if (!parsed.ok) return parsed.response;

    const existing = await prisma.ingredient.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Zutat nicht gefunden" }, { status: 404 });
    }

    const data: {
      name?: string;
      stockQty?: number;
      minStock?: number | null;
      costPerUnit?: number;
    } = {};

    if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
    if (parsed.data.stockQty !== undefined) data.stockQty = parsed.data.stockQty;
    if (parsed.data.minStock !== undefined) data.minStock = parsed.data.minStock;
    if (parsed.data.costPerUnit !== undefined) data.costPerUnit = parsed.data.costPerUnit;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Keine Felder zum Aktualisieren" }, { status: 400 });
    }

    const prevStock = existing.stockQty;
    const ingredient = await prisma.ingredient.update({ where: { id }, data });

    if (parsed.data.stockQty !== undefined && parsed.data.stockQty !== prevStock) {
      await prisma.inventoryLedger.create({
        data: {
          ingredientId: id,
          deltaQty: parsed.data.stockQty - prevStock,
          balanceAfter: ingredient.stockQty,
          reason: "adjustment",
        },
      });
    }

    if (
      ingredient.minStock != null &&
      ingredient.stockQty < ingredient.minStock
    ) {
      const hasAlert = await prisma.managerAlert.findFirst({
        where: { type: "low_stock", ingredientId: id, isRead: false },
      });
      if (!hasAlert) {
        await prisma.managerAlert.create({
          data: {
            type: "low_stock",
            title: "Nachbestellen",
            message: `${ingredient.name}: nur noch ${ingredient.stockQty} ${ingredient.unit} auf Lager`,
            action: "Bestand prüfen und nachbestellen",
            ingredientId: id,
          },
        });
      }
    }

    return NextResponse.json(ingredient);
  } catch (error) {
    console.error("Ingredients PATCH error:", error);
    return NextResponse.json({ error: "Zutat konnte nicht aktualisiert werden" }, { status: 500 });
  }
}
