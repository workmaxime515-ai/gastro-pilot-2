import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const contacts = await prisma.emergencyContact.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Emergency contacts GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch emergency contacts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, role, phone } = body as {
      name: string;
      role: string;
      phone: string;
    };

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: "Name und Telefonnummer sind erforderlich" },
        { status: 400 }
      );
    }

    const contact = await prisma.emergencyContact.create({
      data: {
        name: name.trim(),
        role: role?.trim() || "other",
        phone: phone.trim(),
      },
    });

    return NextResponse.json(contact);
  } catch (error) {
    console.error("Emergency contacts POST error:", error);
    return NextResponse.json(
      { error: "Failed to create emergency contact" },
      { status: 500 }
    );
  }
}
