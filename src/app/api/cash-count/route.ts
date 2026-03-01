import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const dateParam = req.nextUrl.searchParams.get("date");
    if (dateParam) {
      const date = new Date(dateParam);
      date.setHours(0, 0, 0, 0);
      const record = await prisma.cashCount.findUnique({ where: { date } });
      return NextResponse.json(record);
    }
    const records = await prisma.cashCount.findMany({
      orderBy: { date: "desc" },
      take: 30,
    });
    return NextResponse.json(records);
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
    const { date, openAmount, closeAmount, cardTotal, tipTotal, notes } = body;

    if (!date) {
      return NextResponse.json({ error: "Datum erforderlich" }, { status: 400 });
    }

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    const open = parseFloat(openAmount) || 0;
    const close = parseFloat(closeAmount) || 0;
    const card = parseFloat(cardTotal) || 0;
    const tip = parseFloat(tipTotal) || 0;
    const difference = close - open - card - tip;

    const record = await prisma.cashCount.upsert({
      where: { date: d },
      update: {
        openAmount: open,
        closeAmount: close,
        cardTotal: card,
        tipTotal: tip,
        difference,
        notes: notes || null,
      },
      create: {
        date: d,
        openAmount: open,
        closeAmount: close,
        cardTotal: card,
        tipTotal: tip,
        difference,
        notes: notes || null,
      },
    });

    return NextResponse.json(record);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler" },
      { status: 500 }
    );
  }
}
