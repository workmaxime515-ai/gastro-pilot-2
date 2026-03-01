import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaginationParams, paginatedResponse } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month");
    let where: object = {};
    if (month) {
      const start = new Date(`${month}-01`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      where = { date: { gte: start, lt: end } };
    }
    const baseQuery = { where, orderBy: { date: "desc" as const } };
    const all = req.nextUrl.searchParams.get("all") === "true";
    if (all) {
      const expenses = await prisma.expense.findMany(baseQuery);
      return NextResponse.json(expenses);
    }
    const params = getPaginationParams(req);
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({ ...baseQuery, skip: params.skip, take: params.limit }),
      prisma.expense.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(expenses, total, params));
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
    const { date, category, amount, description, isRecurring, frequency } = body;

    if (!date || !category || amount == null) {
      return NextResponse.json(
        { error: "Datum, Kategorie und Betrag erforderlich" },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        date: new Date(date),
        category,
        amount: parseFloat(amount),
        description: description || null,
        isRecurring: !!isRecurring,
        frequency: frequency || null,
      },
    });

    return NextResponse.json(expense);
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
    if (data.date) updateData.date = new Date(data.date);
    if (data.category) updateData.category = data.category;
    if (data.amount != null) updateData.amount = parseFloat(data.amount);
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.isRecurring !== undefined) updateData.isRecurring = !!data.isRecurring;
    if (data.frequency !== undefined) updateData.frequency = data.frequency || null;

    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(expense);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    }

    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler" },
      { status: 500 }
    );
  }
}
