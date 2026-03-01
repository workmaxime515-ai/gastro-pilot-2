import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaginationParams, paginatedResponse } from "@/lib/pagination";

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });

    // Cascade protection: check for dependent data
    const [salesCount, wasteCount, inventoryCount] = await Promise.all([
      prisma.dailySales.count({ where: { productId: id } }),
      prisma.wasteLog.count({ where: { productId: id } }),
      prisma.inventory.count({ where: { productId: id } }),
    ]);
    const totalDeps = salesCount + wasteCount + inventoryCount;
    if (totalDeps > 0) {
      return NextResponse.json(
        {
          error: `Produkt hat ${salesCount} Verkaufs-, ${wasteCount} Abfall- und ${inventoryCount} Lagereinträge. Bitte zuerst deaktivieren statt löschen.`,
          code: "CASCADE_PROTECTION",
          suggestion: "Nutze PUT mit isActive=false zum Deaktivieren.",
        },
        { status: 409 }
      );
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Product DELETE error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const all = req.nextUrl.searchParams.get("all") === "true";
    const orderBy = [{ sortOrder: "asc" as const }, { name: "asc" as const }];
    if (all) {
      const products = await prisma.product.findMany({ orderBy });
      return NextResponse.json(products);
    }
    const params = getPaginationParams(req);
    const [products, total] = await Promise.all([
      prisma.product.findMany({ orderBy, skip: params.skip, take: params.limit }),
      prisma.product.count(),
    ]);
    return NextResponse.json(paginatedResponse(products, total, params));
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      category,
      costPrice,
      sellPrice,
      unit,
      spoilageHours,
      isActive,
    }: {
      name: string;
      category: string;
      costPrice: number;
      sellPrice: number;
      unit?: string;
      spoilageHours?: number;
      isActive?: boolean;
    } = body;

    if (!name || !category || typeof costPrice !== "number" || typeof sellPrice !== "number") {
      return NextResponse.json(
        { error: "Missing required fields: name, category, costPrice, sellPrice" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        category: category.trim(),
        costPrice,
        sellPrice,
        spoilageHours: spoilageHours ?? 72,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Products POST error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      category,
      costPrice,
      sellPrice,
      spoilageHours,
      isActive,
      isSeasonal,
      seasonMonths,
      sortOrder,
    }: {
      id: string;
      name?: string;
      category?: string;
      costPrice?: number;
      sellPrice?: number;
      spoilageHours?: number;
      isActive?: boolean;
      isSeasonal?: boolean;
      seasonMonths?: string;
      sortOrder?: number;
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (category !== undefined) data.category = category.trim();
    if (typeof costPrice === "number") data.costPrice = costPrice;
    if (typeof sellPrice === "number") data.sellPrice = sellPrice;
    if (spoilageHours !== undefined) data.spoilageHours = spoilageHours;
    if (isActive !== undefined) data.isActive = isActive;
    if (isSeasonal !== undefined) data.isSeasonal = isSeasonal;
    if (seasonMonths !== undefined) data.seasonMonths = seasonMonths;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    return NextResponse.json(product);
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
    console.error("Products PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}
