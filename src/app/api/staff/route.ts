import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaginationParams, paginatedResponse } from "@/lib/pagination";

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    await prisma.staffMember.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Staff DELETE error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where = { isActive: true };
    const include = {
      schedules: {
        where: {
          date: { gte: today, lt: tomorrow },
        },
      },
    };
    const orderBy = { name: "asc" as const };
    const baseQuery = { where, include, orderBy };

    const all = req.nextUrl.searchParams.get("all") === "true";
    if (all) {
      const staff = await prisma.staffMember.findMany(baseQuery);
      return NextResponse.json(staff);
    }
    const params = getPaginationParams(req);
    const [staff, total] = await Promise.all([
      prisma.staffMember.findMany({ ...baseQuery, skip: params.skip, take: params.limit }),
      prisma.staffMember.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(staff, total, params));
  } catch (error) {
    console.error("Staff GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      role,
      startDate,
    }: {
      name: string;
      role: string;
      startDate?: string;
    } = body;

    if (!name || !role) {
      return NextResponse.json(
        { error: "Missing required fields: name, role" },
        { status: 400 }
      );
    }

    const parsedStartDate = startDate ? new Date(startDate) : new Date();
    if (startDate && isNaN(parsedStartDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid startDate format" },
        { status: 400 }
      );
    }

    const staff = await prisma.staffMember.create({
      data: {
        name: name.trim(),
        role: role.trim(),
        startDate: parsedStartDate,
        hourlyWage: typeof body.hourlyWage === "number" ? body.hourlyWage : 0,
        monthlyFixed: typeof body.monthlyFixed === "number" ? body.monthlyFixed : 0,
      },
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error("Staff POST error:", error);
    return NextResponse.json(
      { error: "Failed to create staff member" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, role, hourlyWage, monthlyFixed, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (name != null) data.name = name.trim();
    if (role != null) data.role = role.trim();
    if (typeof hourlyWage === "number") data.hourlyWage = hourlyWage;
    if (typeof monthlyFixed === "number") data.monthlyFixed = monthlyFixed;
    if (typeof isActive === "boolean") data.isActive = isActive;

    const updated = await prisma.staffMember.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Staff PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update staff member" },
      { status: 500 }
    );
  }
}
