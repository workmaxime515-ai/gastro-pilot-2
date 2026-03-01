import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const inventory = await prisma.inventory.findMany({
      include: { product: true },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Inventory GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      productId,
      quantity,
      expiresAt,
    }: {
      productId: string;
      quantity: number;
      expiresAt?: string;
    } = body;

    if (!productId || typeof quantity !== "number") {
      return NextResponse.json(
        { error: "Missing required fields: productId, quantity" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const expiresAtDate = expiresAt ? new Date(expiresAt) : undefined;
    if (expiresAt && isNaN(expiresAtDate!.getTime())) {
      return NextResponse.json(
        { error: "Invalid expiresAt date format" },
        { status: 400 }
      );
    }

    const existing = await prisma.inventory.findFirst({
      where: { productId },
    });

    const inventory = existing
      ? await prisma.inventory.update({
          where: { id: existing.id },
          data: {
            quantity,
            ...(expiresAtDate !== undefined && { expiresAt: expiresAtDate }),
          },
        })
      : await prisma.inventory.create({
          data: {
            productId,
            quantity,
            unit: "pieces",
            expiresAt: expiresAtDate,
          },
        });

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Inventory PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update inventory" },
      { status: 500 }
    );
  }
}
