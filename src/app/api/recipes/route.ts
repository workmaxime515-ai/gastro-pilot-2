import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaginationParams, paginatedResponse } from "@/lib/pagination";

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });

    const force = searchParams.get("force") === "true";
    if (!force) {
      const ingCount = await prisma.recipeIngredient.count({ where: { recipeId: id } });
      if (ingCount > 0) {
        return NextResponse.json(
          {
            error: `Rezept hat ${ingCount} Zutaten. Nutze ?force=true zum endgültigen Löschen oder deaktiviere das Rezept.`,
            code: "CASCADE_PROTECTION",
          },
          { status: 409 }
        );
      }
    }

    await prisma.recipe.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Recipe DELETE error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const baseQuery = {
      include: { ingredients: true },
      orderBy: { name: "asc" as const },
    };
    const all = req.nextUrl.searchParams.get("all") === "true";
    if (all) {
      const recipes = await prisma.recipe.findMany(baseQuery);
      const withCosts = recipes.map((r) => {
        const totalCost = r.ingredients.reduce((s, i) => s + i.quantity * i.costPerUnit, 0);
        const margin = r.sellPrice > 0 ? ((r.sellPrice - totalCost) / r.sellPrice) * 100 : 0;
        return { ...r, totalCost, margin };
      });
      return NextResponse.json(withCosts);
    }
    const params = getPaginationParams(req);
    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({ ...baseQuery, skip: params.skip, take: params.limit }),
      prisma.recipe.count(),
    ]);
    const withCosts = recipes.map((r) => {
      const totalCost = r.ingredients.reduce((s, i) => s + i.quantity * i.costPerUnit, 0);
      const margin = r.sellPrice > 0 ? ((r.sellPrice - totalCost) / r.sellPrice) * 100 : 0;
      return { ...r, totalCost, margin };
    });
    return NextResponse.json(paginatedResponse(withCosts, total, params));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category, sellPrice, servings, prepTimeMin, notes, ingredients } = body;
    if (!name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 });

    const recipe = await prisma.recipe.create({
      data: {
        name,
        category: category || "other",
        sellPrice: parseFloat(sellPrice) || 0,
        servings: parseInt(servings) || 1,
        prepTimeMin: parseInt(prepTimeMin) || 0,
        notes: notes || null,
        ingredients: {
          create: (ingredients || []).map((i: { name: string; quantity: number; unit: string; costPerUnit: number }) => ({
            name: i.name,
            quantity: parseFloat(String(i.quantity)) || 0,
            unit: i.unit || "stk",
            costPerUnit: parseFloat(String(i.costPerUnit)) || 0,
          })),
        },
      },
      include: { ingredients: true },
    });
    return NextResponse.json(recipe);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ingredients, ...data } = body;
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });

    const recipe = await prisma.$transaction(async (tx) => {
      if (ingredients) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
        await tx.recipeIngredient.createMany({
          data: ingredients.map((i: { name: string; quantity: number; unit: string; costPerUnit: number }) => ({
            recipeId: id, name: i.name, quantity: parseFloat(String(i.quantity)) || 0,
            unit: i.unit || "stk", costPerUnit: parseFloat(String(i.costPerUnit)) || 0,
          })),
        });
      }

      const updateData: Record<string, unknown> = {};
      if (data.name) updateData.name = data.name;
      if (data.category) updateData.category = data.category;
      if (data.sellPrice != null) updateData.sellPrice = parseFloat(data.sellPrice);
      if (data.servings != null) updateData.servings = parseInt(data.servings);
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      return tx.recipe.update({
        where: { id },
        data: updateData,
        include: { ingredients: true },
      });
    });
    return NextResponse.json(recipe);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
