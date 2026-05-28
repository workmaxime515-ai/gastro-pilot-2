import { NextResponse } from "next/server";
import { blankResetManagerData } from "@/lib/manager/blankReset";

export async function POST() {
  try {
    await blankResetManagerData();
    return NextResponse.json({ success: true, blank: true });
  } catch (error) {
    console.error("Demo reset POST error:", error);
    return NextResponse.json(
      { error: "Reset fehlgeschlagen" },
      { status: 500 }
    );
  }
}
