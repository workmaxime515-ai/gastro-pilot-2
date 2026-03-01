import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const weekStart = req.nextUrl.searchParams.get("week");
    let start: Date;
    let end: Date;

    if (weekStart) {
      start = new Date(weekStart);
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date();
      const day = start.getDay();
      start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
      start.setHours(0, 0, 0, 0);
    }
    end = new Date(start);
    end.setDate(end.getDate() + 7);

    const [schedules, staff, salesData] = await Promise.all([
      prisma.staffSchedule.findMany({
        where: { date: { gte: start, lt: end } },
        include: { staff: true },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
      prisma.staffMember.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.dailySales.findMany({
        where: {
          date: {
            gte: new Date(Date.now() - 28 * 86400000),
          },
        },
        select: { date: true, revenue: true },
      }),
    ]);

    const revenueByDow = new Map<number, number[]>();
    for (const sale of salesData) {
      const dow = sale.date.getDay();
      const arr = revenueByDow.get(dow) ?? [];
      arr.push(sale.revenue);
      revenueByDow.set(dow, arr);
    }

    const demandByDow: Record<number, string> = {};
    for (let dow = 0; dow < 7; dow++) {
      const revenues = revenueByDow.get(dow) ?? [];
      if (revenues.length === 0) {
        demandByDow[dow] = "normal";
        continue;
      }
      const avg = revenues.reduce((s, r) => s + r, 0) / revenues.length;
      const allAvg = Array.from(revenueByDow.values())
        .flat()
        .reduce((s, r) => s + r, 0) / Math.max(1, Array.from(revenueByDow.values()).flat().length);
      if (avg > allAvg * 1.2) demandByDow[dow] = "hoch";
      else if (avg < allAvg * 0.8) demandByDow[dow] = "ruhig";
      else demandByDow[dow] = "normal";
    }

    const laborCostByDay: Record<string, number> = {};
    for (const s of schedules) {
      const dateKey = s.date.toISOString().split("T")[0];
      const hours = parseTimeToHours(s.endTime) - parseTimeToHours(s.startTime);
      const cost = hours * (s.staff.hourlyWage || 0);
      laborCostByDay[dateKey] = (laborCostByDay[dateKey] ?? 0) + cost;
    }

    return NextResponse.json({
      schedules,
      staff,
      demandByDow,
      laborCostByDay,
      weekStart: start.toISOString().split("T")[0],
    });
  } catch (e) {
    console.error("Schedules GET error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { staffId, date, startTime, endTime, role } = body;

    if (!staffId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: "Pflichtfelder: staffId, date, startTime, endTime" }, { status: 400 });
    }

    const schedule = await prisma.staffSchedule.create({
      data: {
        staffId,
        date: new Date(date),
        startTime,
        endTime,
        role: role || "allrounder",
      },
      include: { staff: true },
    });

    return NextResponse.json(schedule);
  } catch (e) {
    console.error("Schedules POST error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, startTime, endTime, role } = body;
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (startTime) data.startTime = startTime;
    if (endTime) data.endTime = endTime;
    if (role) data.role = role;

    const schedule = await prisma.staffSchedule.update({
      where: { id },
      data,
      include: { staff: true },
    });
    return NextResponse.json(schedule);
  } catch (e) {
    console.error("Schedules PUT error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    await prisma.staffSchedule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Schedules DELETE error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

function parseTimeToHours(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h + (m ?? 0) / 60;
}
