import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type");

    if (type === "templates") {
      const templates = await prisma.hACCPTemplate.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(templates);
    }

    const date = req.nextUrl.searchParams.get("date");
    const where: Record<string, unknown> = {};
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.date = { gte: d, lt: next };
    }

    const checks = await prisma.hACCPCheck.findMany({
      where,
      include: { template: true },
      orderBy: { date: "desc" },
      take: 100,
    });
    return NextResponse.json(checks);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;

    if (type === "template") {
      const { name, category, description, frequency } = body;
      if (!name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 });
      const template = await prisma.hACCPTemplate.create({
        data: { name, category: category || "sonstiges", description: description || null, frequency: frequency || "daily" },
      });
      return NextResponse.json(template);
    }

    const { templateId, value, isCompliant, notes, performedBy } = body;
    if (!templateId || !value) return NextResponse.json({ error: "Template und Wert erforderlich" }, { status: 400 });

    const check = await prisma.hACCPCheck.create({
      data: {
        templateId,
        value: String(value),
        isCompliant: isCompliant !== false,
        notes: notes || null,
        performedBy: performedBy || null,
      },
      include: { template: true },
    });
    return NextResponse.json(check);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
