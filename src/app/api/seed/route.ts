import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function POST() {
  try {
    execSync("npx tsx prisma/seed.ts", {
      cwd: process.cwd(),
      stdio: "inherit",
      env: { ...process.env },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to reset demo data" },
      { status: 500 }
    );
  }
}
