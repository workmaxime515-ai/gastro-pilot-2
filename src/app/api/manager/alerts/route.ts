import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const unreadOnly = request.nextUrl.searchParams.get("unread") !== "false";
    const limit = Math.min(20, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "10", 10) || 10));

    const alerts = await prisma.managerAlert.findMany({
      where: unreadOnly ? { isRead: false } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Manager alerts GET error:", error);
    return NextResponse.json({ error: "Alerts konnten nicht geladen werden" }, { status: 500 });
  }
}
