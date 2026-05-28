import { prisma } from "@/lib/db";

export type ProcessSaleInput = {
  productId: string;
  qty: number;
  source?: string;
  idempotencyKey?: string;
};

export type ProcessSaleResult = {
  saleEventId: string;
  revenue: number;
  cogs: number;
  cogsStatus: "complete" | "pending";
  idempotent: boolean;
};

const UNIT_ALIASES: Record<string, string> = {
  kg: "g",
  piece: "stk",
  pieces: "stk",
  stück: "stk",
};

function normalizeUnit(unit: string): string {
  const u = unit.trim().toLowerCase();
  return UNIT_ALIASES[u] ?? u;
}

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

async function findRecipeForProduct(productId: string, productName: string) {
  const byProduct = await prisma.recipe.findFirst({
    where: { productId, isActive: true },
    include: { ingredients: true },
  });
  if (byProduct) return byProduct;

  return prisma.recipe.findFirst({
    where: {
      isActive: true,
      name: { equals: productName },
    },
    include: { ingredients: true },
  });
}

type BomLine = {
  ingredientId: string;
  name: string;
  unit: string;
  deductQty: number;
  lineCogs: number;
};

async function resolveBom(
  recipeIngredients: { name: string; quantity: number; unit: string; costPerUnit: number }[],
  qty: number
): Promise<{ complete: boolean; lines: BomLine[]; missing: string[] }> {
  const lines: BomLine[] = [];
  const missing: string[] = [];

  for (const ri of recipeIngredients) {
    const unit = normalizeUnit(ri.unit);
    const deductQty = ri.quantity * qty;

    const ingredient = await prisma.ingredient.findFirst({
      where: {
        name: { equals: ri.name.trim() },
        unit,
      },
    });

    if (!ingredient) {
      missing.push(`${ri.name} (${unit})`);
      continue;
    }

    const costUnit = ri.costPerUnit > 0 ? ri.costPerUnit : ingredient.costPerUnit;
    lines.push({
      ingredientId: ingredient.id,
      name: ingredient.name,
      unit: ingredient.unit,
      deductQty,
      lineCogs: deductQty * costUnit,
    });
  }

  const complete = missing.length === 0 && lines.length === recipeIngredients.length && recipeIngredients.length > 0;
  return { complete, lines, missing };
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function upsertLowStockAlert(
  tx: TxClient,
  ingredientId: string,
  name: string,
  stockQty: number,
  minStock: number | null
) {
  if (minStock == null || stockQty >= minStock) return;

  const existing = await tx.managerAlert.findFirst({
    where: {
      type: "low_stock",
      ingredientId,
      isRead: false,
    },
  });
  if (existing) return;

  await tx.managerAlert.create({
    data: {
      type: "low_stock",
      title: "Nachbestellen",
      message: `${name}: nur noch ${stockQty} auf Lager`,
      action: "Bestand prüfen und nachbestellen",
      ingredientId,
    },
  });
}

export async function processSale(input: ProcessSaleInput): Promise<ProcessSaleResult> {
  const qty = Math.max(1, Math.round(input.qty));
  const externalId = input.idempotencyKey?.trim() || undefined;

  if (externalId) {
    const existing = await prisma.saleEvent.findUnique({
      where: { externalId },
    });
    if (existing) {
      return {
        saleEventId: existing.id,
        revenue: existing.revenue,
        cogs: existing.cogs,
        cogsStatus: existing.cogsStatus as "complete" | "pending",
        idempotent: true,
      };
    }
  }

  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }
  if (!product.isActive) {
    throw new Error("PRODUCT_INACTIVE");
  }

  const revenue = qty * product.sellPrice;
  const recipe = await findRecipeForProduct(product.id, product.name);
  const bom = recipe
    ? await resolveBom(recipe.ingredients, qty)
    : { complete: false, lines: [] as BomLine[], missing: ["Rezept"] as string[] };

  const cogs = bom.complete ? bom.lines.reduce((s, l) => s + l.lineCogs, 0) : 0;
  const cogsStatus = bom.complete ? "complete" : "pending";
  const soldAt = new Date();
  const today = startOfToday();
  const todayEnd = endOfToday();

  const result = await prisma.$transaction(async (tx) => {
    if (externalId) {
      const dup = await tx.saleEvent.findUnique({ where: { externalId } });
      if (dup) {
        return {
          saleEventId: dup.id,
          revenue: dup.revenue,
          cogs: dup.cogs,
          cogsStatus: dup.cogsStatus as "complete" | "pending",
          idempotent: true,
        };
      }
    }

    const saleEvent = await tx.saleEvent.create({
      data: {
        productId: product.id,
        quantity: qty,
        unitPrice: product.sellPrice,
        revenue,
        cogs,
        cogsStatus,
        source: input.source ?? "manual",
        externalId,
        soldAt,
      },
    });

    await tx.financeLedger.create({
      data: {
        saleEventId: saleEvent.id,
        type: "revenue",
        amount: revenue,
        productId: product.id,
        date: soldAt,
        notes: `${qty}× ${product.name}`,
      },
    });

    if (bom.complete) {
      await tx.financeLedger.create({
        data: {
          saleEventId: saleEvent.id,
          type: "cogs",
          amount: cogs,
          productId: product.id,
          date: soldAt,
          notes: `COGS ${product.name}`,
        },
      });

      for (const line of bom.lines) {
        const updated = await tx.ingredient.update({
          where: { id: line.ingredientId },
          data: { stockQty: { decrement: line.deductQty } },
        });

        await tx.inventoryLedger.create({
          data: {
            ingredientId: line.ingredientId,
            saleEventId: saleEvent.id,
            deltaQty: -line.deductQty,
            balanceAfter: updated.stockQty,
            reason: "sale",
          },
        });

        await upsertLowStockAlert(
          tx,
          line.ingredientId,
          line.name,
          updated.stockQty,
          updated.minStock
        );
      }
    } else {
      const msg =
        bom.missing.length > 0
          ? `Fehlend: ${bom.missing.join(", ")}`
          : "Kein vollständiges Rezept verknüpft";
      await tx.managerAlert.create({
        data: {
          type: "recipe_pending",
          title: "Rezept anlegen",
          message: `${product.name}: ${msg}`,
          action: "Rezept mit Zutaten verknüpfen",
          productId: product.id,
        },
      });
    }

    const existingDaily = await tx.dailySales.findFirst({
      where: {
        productId: product.id,
        date: { gte: today, lte: todayEnd },
      },
    });

    if (existingDaily) {
      await tx.dailySales.update({
        where: { id: existingDaily.id },
        data: {
          quantity: existingDaily.quantity + qty,
          revenue: existingDaily.revenue + revenue,
        },
      });
    } else {
      await tx.dailySales.create({
        data: {
          productId: product.id,
          date: today,
          quantity: qty,
          revenue,
        },
      });
    }

    return {
      saleEventId: saleEvent.id,
      revenue,
      cogs,
      cogsStatus: cogsStatus as "complete" | "pending",
      idempotent: false,
    };
  });

  return result;
}

export async function getManagerToday() {
  const today = startOfToday();
  const todayEnd = endOfToday();

  const [settings, revenueAgg, cogsAgg] = await Promise.all([
    prisma.shopSettings.findFirst(),
    prisma.financeLedger.aggregate({
      where: { type: "revenue", date: { gte: today, lte: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.financeLedger.aggregate({
      where: { type: "cogs", date: { gte: today, lte: todayEnd } },
      _sum: { amount: true },
    }),
  ]);

  const revenue = revenueAgg._sum.amount ?? 0;
  const cogs = cogsAgg._sum.amount ?? 0;
  const grossProfit = revenue - cogs;
  const fixedCostsDaily = settings?.fixedCostsDaily ?? 0;
  const profit = grossProfit - fixedCostsDaily;
  const breakEvenRemaining = Math.max(0, fixedCostsDaily - grossProfit);

  return {
    revenue,
    cogs,
    grossProfit,
    fixedCostsDaily,
    profit,
    breakEvenRemaining,
    breakEvenAchieved: breakEvenRemaining <= 0,
  };
}
