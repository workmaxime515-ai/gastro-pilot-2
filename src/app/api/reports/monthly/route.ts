import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const dayCloses = await prisma.dayClose.findMany({
      where: { date: { gte: monthStart, lt: monthEnd } },
      orderBy: { date: "asc" },
    });

    const salesData = dayCloses.map((d) => ({
      date: d.date.toISOString(),
      revenue: d.totalRevenue,
    }));

    return NextResponse.json(salesData);
  } catch (error) {
    console.error("Monthly report error:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
