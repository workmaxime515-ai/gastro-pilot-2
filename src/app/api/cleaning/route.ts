import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type");

    if (type === "tasks") {
      const tasks = await prisma.cleaningTask.findMany({
        where: { isActive: true },
        orderBy: { area: "asc" },
      });
      return NextResponse.json(tasks);
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

    const logs = await prisma.cleaningLog.findMany({
      where,
      include: { task: true },
      orderBy: { date: "desc" },
      take: 100,
    });
    return NextResponse.json(logs);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;

    if (type === "task") {
      const { name, area, frequency, assignedTo } = body;
      if (!name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 });
      const task = await prisma.cleaningTask.create({
        data: { name, area: area || "kueche", frequency: frequency || "daily", assignedTo: assignedTo || null },
      });
      return NextResponse.json(task);
    }

    const { taskId, completedBy, notes } = body;
    if (!taskId) return NextResponse.json({ error: "Task erforderlich" }, { status: 400 });

    const log = await prisma.cleaningLog.create({
      data: {
        taskId,
        completedBy: completedBy || null,
        notes: notes || null,
      },
      include: { task: true },
    });
    return NextResponse.json(log);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
