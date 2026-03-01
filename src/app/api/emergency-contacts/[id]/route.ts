import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, role, phone } = body as {
      name?: string;
      role?: string;
      phone?: string;
    };

    const data: Record<string, string> = {};
    if (name !== undefined) data.name = name.trim();
    if (role !== undefined) data.role = role.trim() || "other";
    if (phone !== undefined) data.phone = phone.trim();

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const contact = await prisma.emergencyContact.update({
      where: { id },
      data,
    });

    return NextResponse.json(contact);
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }
    console.error("Emergency contact PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update emergency contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.emergencyContact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }
    console.error("Emergency contact DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete emergency contact" },
      { status: 500 }
    );
  }
}
