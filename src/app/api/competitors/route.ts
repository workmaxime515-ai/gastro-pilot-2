import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaginationParams, paginatedResponse } from "@/lib/pagination";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, competitorName, observation, category, impactEstimate } = body;
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    const data: Record<string, unknown> = {};
    if (competitorName) data.competitorName = competitorName.trim();
    if (observation !== undefined) data.notes = observation?.trim() ?? null;
    if (category) data.event = category;
    if (impactEstimate) data.impactEstimate = impactEstimate;
    const note = await prisma.competitorNote.update({ where: { id }, data });
    return NextResponse.json(note);
  } catch (e) {
    console.error("Competitors PUT error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    await prisma.competitorNote.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Competitors DELETE error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

const CATEGORIES = ["Preis", "Angebot", "Aktion", "Sonstiges"] as const;

export async function GET(req: NextRequest) {
  try {
    const all = req.nextUrl.searchParams.get("all") === "true";
    const baseQuery = { orderBy: { date: "desc" as const } };
    if (all) {
      const notes = await prisma.competitorNote.findMany(baseQuery);
      return NextResponse.json(notes);
    }
    const params = getPaginationParams(req);
    const [notes, total] = await Promise.all([
      prisma.competitorNote.findMany({ ...baseQuery, skip: params.skip, take: params.limit }),
      prisma.competitorNote.count(),
    ]);
    return NextResponse.json(paginatedResponse(notes, total, params));
  } catch (error) {
    console.error("Competitors GET error:", error);
    return NextResponse.json(
      { error: "Wettbewerber-Notizen konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { competitorName, observation, category } = body as {
      competitorName: string;
      observation: string;
      category: string;
    };

    if (!competitorName?.trim()) {
      return NextResponse.json(
        { error: "Wettbewerber-Name erforderlich" },
        { status: 400 }
      );
    }

    const event = CATEGORIES.includes(category as (typeof CATEGORIES)[number])
      ? category
      : "Sonstiges";

    const note = await prisma.competitorNote.create({
      data: {
        competitorName: competitorName.trim(),
        event,
        notes: observation?.trim() ?? null,
        impactEstimate: "low",
        date: new Date(),
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error("Competitors POST error:", error);
    return NextResponse.json(
      { error: "Notiz konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}
