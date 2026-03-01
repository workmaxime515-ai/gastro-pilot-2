import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaginationParams, paginatedResponse } from "@/lib/pagination";

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    await prisma.purchaseOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("PurchaseOrder DELETE error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const where = status ? { status } : {};
    const baseQuery = {
      where,
      include: { supplier: true, items: true },
      orderBy: { orderDate: "desc" as const },
    };
    const all = req.nextUrl.searchParams.get("all") === "true";
    if (all) {
      const orders = await prisma.purchaseOrder.findMany(baseQuery);
      return NextResponse.json(orders);
    }
    const params = getPaginationParams(req);
    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({ ...baseQuery, skip: params.skip, take: params.limit }),
      prisma.purchaseOrder.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(orders, total, params));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { supplierId, deliveryDate, notes, items } = body;
    if (!supplierId) return NextResponse.json({ error: "Lieferant erforderlich" }, { status: 400 });

    const orderItems = (items || []).map((i: { productName: string; quantity: number; unit: string; pricePerUnit: number }) => ({
      productName: i.productName,
      quantity: parseFloat(String(i.quantity)) || 0,
      unit: i.unit || "stk",
      pricePerUnit: parseFloat(String(i.pricePerUnit)) || 0,
      totalPrice: (parseFloat(String(i.quantity)) || 0) * (parseFloat(String(i.pricePerUnit)) || 0),
    }));

    const totalAmount = orderItems.reduce((s: number, i: { totalPrice: number }) => s + i.totalPrice, 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        notes: notes || null,
        totalAmount,
        items: { create: orderItems },
      },
      include: { supplier: true, items: true },
    });
    return NextResponse.json(order);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status: newStatus } = body;
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });

    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: newStatus },
      include: { supplier: true, items: true },
    });
    return NextResponse.json(order);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
