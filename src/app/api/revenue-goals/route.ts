import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaginationParams, paginatedResponse } from "@/lib/pagination";

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    await prisma.revenueGoal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("RevenueGoal DELETE error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const where = { isActive: true };
    const baseQuery = { where, orderBy: { startDate: "desc" as const } };
    const all = req.nextUrl.searchParams.get("all") === "true";
    if (all) {
      const goals = await prisma.revenueGoal.findMany(baseQuery);
      return NextResponse.json(goals);
    }
    const params = getPaginationParams(req);
    const [goals, total] = await Promise.all([
      prisma.revenueGoal.findMany({ ...baseQuery, skip: params.skip, take: params.limit }),
      prisma.revenueGoal.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(goals, total, params));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { period, targetAmount, startDate, endDate } = body;

    if (!period || !targetAmount || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Alle Felder erforderlich" },
        { status: 400 }
      );
    }

    const goal = await prisma.revenueGoal.create({
      data: {
        period,
        targetAmount: parseFloat(targetAmount),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return NextResponse.json(goal);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.targetAmount != null) updateData.targetAmount = parseFloat(data.targetAmount);
    if (data.actualAmount != null) updateData.actualAmount = parseFloat(data.actualAmount);
    if (data.isActive !== undefined) updateData.isActive = !!data.isActive;

    const goal = await prisma.revenueGoal.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(goal);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler" },
      { status: 500 }
    );
  }
}
