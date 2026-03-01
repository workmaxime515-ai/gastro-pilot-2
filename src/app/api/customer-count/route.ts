import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date");
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const counts = await prisma.customerCount.findMany({
        where: { date: { gte: d, lt: next } },
        orderBy: { hour: "asc" },
      });
      return NextResponse.json(counts);
    }
    const counts = await prisma.customerCount.findMany({
      orderBy: { date: "desc" },
      take: 30,
    });
    return NextResponse.json(counts);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, hour, count, notes } = body;
    if (!date || count == null) return NextResponse.json({ error: "Datum und Anzahl erforderlich" }, { status: 400 });

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const h = hour != null ? parseInt(hour) : null;

    const record = await prisma.customerCount.upsert({
      where: { date_hour: { date: d, hour: h ?? 0 } },
      update: { count: parseInt(count), notes: notes || null },
      create: { date: d, hour: h, count: parseInt(count), notes: notes || null },
    });
    return NextResponse.json(record);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
