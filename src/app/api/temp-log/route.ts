import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET() {
  try {
    const today = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const logs = await prisma.tempLog.findMany({
      where: {
        recordedAt: {
          gte: today,
          lte: todayEnd,
        },
      },
      orderBy: { recordedAt: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("TempLog GET error:", error);
    return NextResponse.json(
      { error: "Temperaturprotokolle konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { equipment, temperature } = body as {
      equipment: string;
      temperature: number;
    };

    if (!equipment?.trim() || typeof temperature !== "number") {
      return NextResponse.json(
        { error: "equipment und temperature erforderlich" },
        { status: 400 }
      );
    }

    const temp = Number(temperature);
    if (isNaN(temp)) {
      return NextResponse.json(
        { error: "Ungültige Temperatur" },
        { status: 400 }
      );
    }

    // 2–8°C = in range (green), 0–2 or 8–10 = yellow, outside = red
    const inRange = temp >= 2 && temp <= 8;

    const log = await prisma.tempLog.create({
      data: {
        equipment: equipment.trim(),
        temperature: temp,
        inRange,
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error("TempLog POST error:", error);
    return NextResponse.json(
      { error: "Temperaturprotokoll konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}
