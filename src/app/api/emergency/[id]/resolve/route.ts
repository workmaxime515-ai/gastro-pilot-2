import { NextResponse } from "next/server";
import { resolveEmergency } from "@/lib/engine/emergency";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { actionsTaken }: { actionsTaken: string[] } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing emergency ID" },
        { status: 400 }
      );
    }

    if (!Array.isArray(actionsTaken)) {
      return NextResponse.json(
        { error: "actionsTaken must be an array of strings" },
        { status: 400 }
      );
    }

    await resolveEmergency(id, actionsTaken);

    return NextResponse.json({
      success: true,
      message: "Emergency resolved",
    });
  } catch (error) {
    console.error("Resolve emergency error:", error);
    return NextResponse.json(
      { error: "Failed to resolve emergency" },
      { status: 500 }
    );
  }
}
