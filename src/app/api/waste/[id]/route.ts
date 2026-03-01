import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.wasteLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Waste log not found" }, { status: 404 });
    }

    await prisma.wasteLog.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Waste DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete waste log" }, { status: 500 });
  }
}
