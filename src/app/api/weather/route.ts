import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weatherData = await prisma.weatherData.findFirst({
      where: { date: { gte: today, lt: tomorrow } },
      orderBy: { createdAt: "desc" },
    });

    if (!weatherData) {
      return NextResponse.json({ condition: null });
    }

    return NextResponse.json({
      condition: weatherData.condition,
      tempHigh: weatherData.tempHigh,
      tempLow: weatherData.tempLow,
      date: weatherData.date.toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Weather GET error:", error);
    return NextResponse.json({ condition: null });
  }
}
