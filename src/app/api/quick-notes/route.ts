import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaginationParams, paginatedResponse } from "@/lib/pagination";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, content, category } = body;
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    const data: Record<string, unknown> = {};
    if (content) data.text = content.trim();
    if (category) data.category = category;
    const note = await prisma.quickNote.update({ where: { id }, data });
    return NextResponse.json(note);
  } catch (e) {
    console.error("QuickNote PUT error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    await prisma.quickNote.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("QuickNote DELETE error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const where = { date: { gte: thirtyDaysAgo } };
    const orderBy = { date: "desc" as const };
    const baseQuery = { where, orderBy };

    const all = req.nextUrl.searchParams.get("all") === "true";
    if (all) {
      const notes = await prisma.quickNote.findMany(baseQuery);
      return NextResponse.json(notes);
    }
    const params = getPaginationParams(req);
    const [notes, total] = await Promise.all([
      prisma.quickNote.findMany({ ...baseQuery, skip: params.skip, take: params.limit }),
      prisma.quickNote.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(notes, total, params));
  } catch (error) {
    console.error("Quick notes GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quick notes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      content,
      category,
      date,
    }: {
      content: string;
      category?: string;
      date?: string;
    } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Missing required field: content" },
        { status: 400 }
      );
    }

    const noteDate = date ? new Date(date) : new Date();
    if (isNaN(noteDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    const validCategories = ["Allgemein", "Verkauf", "Personal", "Lager", "Sonstiges"];
    const cat = category && validCategories.includes(category) ? category : "Allgemein";

    const note = await prisma.quickNote.create({
      data: {
        date: noteDate,
        text: content.trim(),
        category: cat,
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error("Quick notes POST error:", error);
    return NextResponse.json(
      { error: "Failed to create quick note" },
      { status: 500 }
    );
  }
}
