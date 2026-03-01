import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const plans = await prisma.menuPlan.findMany({
      include: { items: true },
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json(plans);
  } catch (e) {
    console.error("MenuPlan GET error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, season, startDate, endDate, notes, items } = body;
    if (!name || !season) {
      return NextResponse.json({ error: "Name und Saison erforderlich" }, { status: 400 });
    }

    const plan = await prisma.menuPlan.create({
      data: {
        name,
        season,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 90 * 86400000),
        notes: notes || null,
        items: {
          create: (items || []).map((item: { productName: string; category: string; sellPrice: number; isNew?: boolean }) => ({
            productName: item.productName,
            category: item.category || "other",
            sellPrice: parseFloat(String(item.sellPrice)) || 0,
            isNew: item.isNew ?? false,
          })),
        },
      },
      include: { items: true },
    });
    return NextResponse.json(plan);
  } catch (e) {
    console.error("MenuPlan POST error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, items, ...data } = body;
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });

    const plan = await prisma.$transaction(async (tx) => {
      if (items) {
        await tx.menuPlanItem.deleteMany({ where: { planId: id } });
        await tx.menuPlanItem.createMany({
          data: items.map((item: { productName: string; category: string; sellPrice: number; isNew?: boolean }) => ({
            planId: id,
            productName: item.productName,
            category: item.category || "other",
            sellPrice: parseFloat(String(item.sellPrice)) || 0,
            isNew: item.isNew ?? false,
          })),
        });
      }

      const updateData: Record<string, unknown> = {};
      if (data.name) updateData.name = data.name;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.notes !== undefined) updateData.notes = data.notes || null;

      return tx.menuPlan.update({
        where: { id },
        data: updateData,
        include: { items: true },
      });
    });
    return NextResponse.json(plan);
  } catch (e) {
    console.error("MenuPlan PUT error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    await prisma.menuPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("MenuPlan DELETE error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
