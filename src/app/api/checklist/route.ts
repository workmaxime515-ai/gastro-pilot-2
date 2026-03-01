import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const GROUPS = ["Vor dem Öffnen", "Hygiene", "Maschinen", "Bestand"] as const;

// Default checklist items when no templates exist
const DEFAULT_ITEMS: { text: string; group: string; notes?: string }[] = [
  { text: "Kaffeemaschine aufwärmen", group: "Vor dem Öffnen", notes: "Mind. 20 Min. Aufwärmzeit" },
  { text: "Milch auffüllen", group: "Vor dem Öffnen" },
  { text: "Theke bestücken", group: "Vor dem Öffnen" },
  { text: "Kühltemperatur prüfen", group: "Vor dem Öffnen" },
  { text: "Kasse öffnen", group: "Vor dem Öffnen", notes: "Wechselgeld prüfen" },
  { text: "Boden wischen", group: "Hygiene" },
  { text: "Hände waschen", group: "Hygiene" },
  { text: "Arbeitsoberflächen desinfizieren", group: "Hygiene" },
  { text: "Kaffeemühle einstellen", group: "Maschinen" },
  { text: "Espressomaschine Testbezug", group: "Maschinen" },
  { text: "Milchaufschäumer reinigen", group: "Maschinen" },
  { text: "Backwaren-Bestand prüfen", group: "Bestand" },
  { text: "Frischware-Bestand prüfen", group: "Bestand" },
  { text: "Auslagen-Display aufbauen", group: "Bestand" },
];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  try {
    const today = startOfDay(new Date());

    const templates = await prisma.checklistTemplate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    const entries = await prisma.checklistEntry.findMany({
      where: { date: today },
    });

    const entryByTemplate = new Map(entries.map((e) => [e.templateId, e]));

    // If no templates, use defaults (in-memory only, no persistence of completion)
    if (templates.length === 0) {
      const defaultItems = DEFAULT_ITEMS.map((item, i) => ({
        id: `default-${i}`,
        templateId: `default-${i}`,
        text: item.text,
        group: item.group,
        notes: item.notes,
        isCompleted: false,
        completedAt: null,
        entryNotes: null,
      }));
      return NextResponse.json({
        items: defaultItems,
        grouped: GROUPS.map((g) => ({
          group: g,
          items: defaultItems.filter((i) => i.group === g),
        })).filter((g) => g.items.length > 0),
      });
    }

    const items = templates.map((t) => {
      const entry = entryByTemplate.get(t.id);
      return {
        id: t.id,
        templateId: t.id,
        text: t.text,
        group: t.group ?? "Sonstiges",
        notes: t.notes,
        isCompleted: entry?.isCompleted ?? false,
        completedAt: entry?.completedAt ?? null,
        entryNotes: entry?.notes ?? null,
      };
    });

    const grouped = GROUPS.map((g) => ({
      group: g,
      items: items.filter((i) => i.group === g),
    })).filter((g) => g.items.length > 0);

    return NextResponse.json({ items, grouped });
  } catch (error) {
    console.error("Checklist GET error:", error);
    return NextResponse.json(
      { error: "Checklist konnte nicht geladen werden" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateId, isCompleted, notes } = body as {
      templateId: string;
      isCompleted: boolean;
      notes?: string;
    };

    if (!templateId || typeof isCompleted !== "boolean") {
      return NextResponse.json(
        { error: "templateId und isCompleted erforderlich" },
        { status: 400 }
      );
    }

    const today = startOfDay(new Date());

    // For default (in-memory) items, we can't persist - would need to create templates first
    if (templateId.startsWith("default-")) {
      return NextResponse.json({ success: true, message: "Default-Eintrag (nicht persistiert)" });
    }

    const entry = await prisma.checklistEntry.upsert({
      where: {
        templateId_date: { templateId, date: today },
      },
      create: {
        templateId,
        date: today,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        notes: notes ?? null,
      },
      update: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        notes: notes ?? null,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Checklist POST error:", error);
    return NextResponse.json(
      { error: "Checklist konnte nicht aktualisiert werden" },
      { status: 500 }
    );
  }
}
