import { NextResponse } from "next/server";
import { getWeeklyCoachSummary } from "@/lib/engine";

export async function GET() {
  try {
    const summary = await getWeeklyCoachSummary();
    if (!summary) {
      return NextResponse.json({ message: "Nicht genug Daten fuer eine Zusammenfassung" }, { status: 200 });
    }
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
