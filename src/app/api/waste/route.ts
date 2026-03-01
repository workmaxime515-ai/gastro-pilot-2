import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaginationParams, paginatedResponse } from "@/lib/pagination";

function parseDate(dateStr: string): Date {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

export async function GET(req: NextRequest) {
  try {
    const dateStr = req.nextUrl.searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json(
        { error: "Missing query param: date (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const date = parseDate(dateStr);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const where = { date: { gte: startOfDay, lte: endOfDay } };
    const include = { product: true };
    const baseQuery = { where, include };

    const all = req.nextUrl.searchParams.get("all") === "true";
    if (all) {
      const logs = await prisma.wasteLog.findMany(baseQuery);
      const totalValue = logs.reduce(
        (sum, log) => sum + log.quantity * log.product.costPrice,
        0
      );
      return NextResponse.json({
        logs,
        totalValue: Math.round(totalValue * 100) / 100,
      });
    }

    const params = getPaginationParams(req);
    const [logs, total, allLogs] = await Promise.all([
      prisma.wasteLog.findMany({ ...baseQuery, skip: params.skip, take: params.limit }),
      prisma.wasteLog.count({ where }),
      prisma.wasteLog.findMany({ where, include }),
    ]);
    const totalValue = allLogs.reduce(
      (sum, log) => sum + log.quantity * log.product.costPrice,
      0
    );
    return NextResponse.json({
      ...paginatedResponse(logs, total, params),
      totalValue: Math.round(totalValue * 100) / 100,
    });
  } catch (error) {
    console.error("Waste GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch waste" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      productId,
      quantity,
      reason,
      date,
    }: {
      productId: string;
      quantity: number;
      reason: string;
      date?: string;
    } = body;

    if (!productId || typeof quantity !== "number" || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: productId, quantity, reason" },
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

    const wasteDate = date ? parseDate(date) : new Date();

    const wasteLog = await prisma.wasteLog.create({
      data: {
        productId,
        date: wasteDate,
        quantity: Math.round(quantity),
        reason: reason.trim(),
      },
    });

    return NextResponse.json(wasteLog);
  } catch (error) {
    console.error("Waste POST error:", error);
    return NextResponse.json(
      { error: "Failed to log waste" },
      { status: 500 }
    );
  }
}
