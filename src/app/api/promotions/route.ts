import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    await prisma.promotion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Promotion DELETE error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const promotions = await prisma.promotion.findMany({
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json(promotions);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, type, startDate, endDate, discount, conditions } = body;
    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "Name, Start- und Enddatum erforderlich" }, { status: 400 });
    }

    const promotion = await prisma.promotion.create({
      data: {
        name,
        description: description || null,
        type: type || "discount",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        discount: discount ? parseFloat(discount) : null,
        conditions: conditions || null,
      },
    });
    return NextResponse.json(promotion);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });

    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.results) updateData.results = JSON.stringify(data.results);

    const promotion = await prisma.promotion.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(promotion);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
