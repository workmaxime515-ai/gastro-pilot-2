import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaginationParams, paginatedResponse } from "@/lib/pagination";

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, hoursWorked, hourlyWage, notes } = body;
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    const data: Record<string, unknown> = {};
    if (hoursWorked != null) { data.hoursWorked = parseFloat(hoursWorked); data.totalCost = parseFloat(hoursWorked) * (parseFloat(hourlyWage) || 0); }
    if (hourlyWage != null) data.hourlyWage = parseFloat(hourlyWage);
    if (notes !== undefined) data.notes = notes || null;
    const entry = await prisma.laborEntry.update({ where: { id }, data });
    return NextResponse.json(entry);
  } catch (e) {
    console.error("Labor PUT error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    await prisma.laborEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Labor DELETE error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

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
    const orderBy = { date: "desc" as const };

    const all = req.nextUrl.searchParams.get("all") === "true";
    if (all) {
      const entries = await prisma.laborEntry.findMany({ where, orderBy });
      const totalHours = entries.reduce((s, e) => s + e.hoursWorked, 0);
      const totalCost = entries.reduce((s, e) => s + e.totalCost, 0);
      return NextResponse.json({ entries, totalHours, totalCost });
    }

    const params = getPaginationParams(req);
    const [entries, total, agg] = await Promise.all([
      prisma.laborEntry.findMany({ where, orderBy, skip: params.skip, take: params.limit }),
      prisma.laborEntry.count({ where }),
      prisma.laborEntry.aggregate({ where, _sum: { hoursWorked: true, totalCost: true } }),
    ]);
    const totalHours = agg._sum.hoursWorked ?? 0;
    const totalCost = Number(agg._sum.totalCost ?? 0);
    return NextResponse.json({
      ...paginatedResponse(entries, total, params),
      totalHours,
      totalCost,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { staffId, date, hoursWorked, hourlyWage, notes } = body;
    if (!staffId || !date || !hoursWorked) {
      return NextResponse.json({ error: "Staff, Datum und Stunden erforderlich" }, { status: 400 });
    }

    const hours = parseFloat(hoursWorked);
    const wage = parseFloat(hourlyWage) || 0;
    const totalCost = hours * wage;

    const entry = await prisma.laborEntry.create({
      data: {
        staffId,
        date: new Date(date),
        hoursWorked: hours,
        hourlyWage: wage,
        totalCost,
        notes: notes || null,
      },
    });
    return NextResponse.json(entry);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
