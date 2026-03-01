import { NextResponse } from "next/server";
import {
  getActiveEmergencies,
  handleEmergency,
} from "@/lib/engine/emergency";
import type { EmergencyType } from "@/lib/engine/types";

export async function GET() {
  try {
    const emergencies = await getActiveEmergencies();
    return NextResponse.json(emergencies);
  } catch (error) {
    console.error("Emergency GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch emergencies" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type,
      details,
      affectedProductIds,
      affectedEquipment,
      severity,
    }: {
      type: EmergencyType;
      details?: string;
      affectedProductIds?: string[];
      affectedEquipment?: string;
      severity?: "low" | "medium" | "high" | "critical";
    } = body;

    if (!type) {
      return NextResponse.json(
        { error: "Missing required field: type" },
        { status: 400 }
      );
    }

    const validTypes: EmergencyType[] = [
      "vendor",
      "damaged",
      "equipment",
      "staff",
      "rush",
      "power",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await handleEmergency({
      type,
      details,
      affectedProductIds,
      affectedEquipment,
      severity,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Emergency POST error:", error);
    return NextResponse.json(
      { error: "Failed to handle emergency" },
      { status: 500 }
    );
  }
}
