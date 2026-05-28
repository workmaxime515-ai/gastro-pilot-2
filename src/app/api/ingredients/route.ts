import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { parseJsonWithLimit } from "@/lib/guardrails";

const UNITS = ["g", "ml", "l", "stk"] as const;

const createSchema = z.object({
  name: z.string().min(1).max(120),
  unit: z.enum(UNITS),
  stockQty: z.number().min(0).optional(),
  minStock: z.number().min(0).nullable().optional(),
  costPerUnit: z.number().min(0).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const unit = request.nextUrl.searchParams.get("unit");
    const where =
      unit && UNITS.includes(unit as (typeof UNITS)[number])
        ? { unit }
        : undefined;

    const ingredients = await prisma.ingredient.findMany({
      where,
      orderBy: [{ name: "asc" }],
    });

    return NextResponse.json(ingredients);
  } catch (error) {
    console.error("Ingredients GET error:", error);
    return NextResponse.json({ error: "Zutaten konnten nicht geladen werden" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonWithLimit(request, 32_000, createSchema);
    if (!parsed.ok) return parsed.response;

    const { name, unit, stockQty, minStock, costPerUnit } = parsed.data;

    const ingredient = await prisma.ingredient.create({
      data: {
        name: name.trim(),
        unit,
        stockQty: stockQty ?? 0,
        minStock: minStock ?? null,
        costPerUnit: costPerUnit ?? 0,
      },
    });

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { error: "Zutat mit diesem Namen und dieser Einheit existiert bereits" },
        { status: 409 }
      );
    }
    console.error("Ingredients POST error:", error);
    return NextResponse.json({ error: "Zutat konnte nicht angelegt werden" }, { status: 500 });
  }
}
