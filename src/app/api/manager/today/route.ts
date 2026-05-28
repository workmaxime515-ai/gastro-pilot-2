import { NextResponse } from "next/server";
import { getManagerToday } from "@/lib/manager/processSale";

export async function GET() {
  try {
    const data = await getManagerToday();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Manager today GET error:", error);
    return NextResponse.json(
      { error: "Tages-Kennzahlen konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}
