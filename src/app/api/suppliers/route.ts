import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });

    const [orderCount, productCount] = await Promise.all([
      prisma.purchaseOrder.count({ where: { supplierId: id } }),
      prisma.supplierProduct.count({ where: { supplierId: id } }),
    ]);
    if (orderCount + productCount > 0) {
      return NextResponse.json(
        {
          error: `Lieferant hat ${orderCount} Bestellungen und ${productCount} Produktzuordnungen. Bitte zuerst deaktivieren.`,
          code: "CASCADE_PROTECTION",
        },
        { status: 409 }
      );
    }

    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Supplier DELETE error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: { products: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(suppliers);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, contactPerson, email, phone, deliveryDays, minOrderAmount, notes, products } = body;
    if (!name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 });

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactPerson: contactPerson || null,
        email: email || null,
        phone: phone || null,
        deliveryDays: deliveryDays ? JSON.stringify(deliveryDays) : null,
        minOrderAmount: parseFloat(minOrderAmount) || 0,
        notes: notes || null,
        products: {
          create: (products || []).map((p: { productName: string; unit: string; pricePerUnit: number; articleNumber?: string }) => ({
            productName: p.productName,
            unit: p.unit || "stk",
            pricePerUnit: parseFloat(String(p.pricePerUnit)) || 0,
            articleNumber: p.articleNumber || null,
          })),
        },
      },
      include: { products: true },
    });
    return NextResponse.json(supplier);
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
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson || null;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    // Rating fields
    if (data.rating !== undefined) updateData.rating = parseFloat(data.rating) || null;
    if (data.deliveryReliability !== undefined) updateData.deliveryReliability = parseFloat(data.deliveryReliability) || null;
    if (data.priceScore !== undefined) updateData.priceScore = parseFloat(data.priceScore) || null;
    if (data.qualityScore !== undefined) updateData.qualityScore = parseFloat(data.qualityScore) || null;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: updateData,
      include: { products: true },
    });
    return NextResponse.json(supplier);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
