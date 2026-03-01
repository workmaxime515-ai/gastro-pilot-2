import { NextResponse } from "next/server";
import { getProfitPerHour } from "@/lib/engine";

export async function GET() {
  try {
    const data = await getProfitPerHour();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
