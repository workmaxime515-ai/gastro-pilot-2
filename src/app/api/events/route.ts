import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaginationParams, paginatedResponse } from "@/lib/pagination";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, date, expectedImpact, description } = body;
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    const data: Record<string, unknown> = {};
    if (name) data.name = name.trim();
    if (date) data.date = new Date(date);
    if (expectedImpact) data.expectedImpact = expectedImpact;
    if (description !== undefined) data.notes = description ?? null;
    const event = await prisma.localEvent.update({ where: { id }, data });
    return NextResponse.json(event);
  } catch (e) {
    console.error("Events PUT error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    await prisma.localEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Events DELETE error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    if (!fromStr || !toStr) {
      return NextResponse.json(
        { error: "Missing query params: from, to (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const from = new Date(fromStr);
    const to = new Date(toStr);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    const where = { date: { gte: from, lte: to } };
    const orderBy = { date: "asc" as const };
    const baseQuery = { where, orderBy };

    const all = searchParams.get("all") === "true";
    if (all) {
      const events = await prisma.localEvent.findMany(baseQuery);
      return NextResponse.json(events);
    }
    const params = getPaginationParams(req);
    const [events, total] = await Promise.all([
      prisma.localEvent.findMany({ ...baseQuery, skip: params.skip, take: params.limit }),
      prisma.localEvent.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(events, total, params));
  } catch (error) {
    console.error("Events GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      date,
      endDate,
      expectedImpact,
      description,
    }: {
      name: string;
      date: string;
      endDate?: string;
      expectedImpact?: string;
      description?: string;
    } = body;

    if (!name || !date) {
      return NextResponse.json(
        { error: "Missing required fields: name, date" },
        { status: 400 }
      );
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    const event = await prisma.localEvent.create({
      data: {
        name: name.trim(),
        date: parsedDate,
        expectedImpact: expectedImpact ?? "medium",
        notes: description ?? null,
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("Events POST error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
