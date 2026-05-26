import { createHash } from "crypto";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { execSync } from "child_process";
import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter, getClientKey } from "@/lib/guardrails";
import { parseSeedPayload, seedPayloadSchema, type SeedMode } from "@/lib/contracts/seed";
import { logger } from "@/lib/logger";
import { prisma, resolveDbPath } from "@/lib/db";

const seedRateLimit = createRateLimiter(60_000, 8);
let isSeedRunning = false;

function assertSeedFeatureEnabled() {
  const enabled = process.env.ENABLE_DEMO_SEED !== "false";
  if (!enabled) {
    throw new Error("SEED_FEATURE_DISABLED");
  }
}

function assertSeedInAllowedEnvironment() {
  const allowInProd = process.env.ALLOW_SEED_IN_PROD === "true";
  const env = process.env.NODE_ENV;
  // Demo convenience: allow seeding on Vercel production unless explicitly disabled.
  const isVercel = process.env.VERCEL === "1" || typeof process.env.VERCEL_REGION === "string";
  if (env === "production" && isVercel) return;
  if (env !== "development" && env !== "test" && !allowInProd) {
    throw new Error("SEED_NOT_ALLOWED_IN_PRODUCTION");
  }
}

function assertAdminSeedAccess(req: NextRequest) {
  const configuredToken = process.env.SEED_ADMIN_TOKEN;
  if (!configuredToken) return;
  const requestToken = req.headers.get("x-admin-token");
  if (!requestToken || requestToken !== configuredToken) {
    throw new Error("SEED_ADMIN_TOKEN_INVALID");
  }
}

function createSeedHash(seedText: string | undefined) {
  if (!seedText) return null;
  return createHash("sha256").update(seedText).digest("hex").slice(0, 12);
}

function createPreSeedBackup() {
  const dbPath = resolveDbPath();
  if (!existsSync(dbPath)) return null;
  const backupDir = path.join(process.cwd(), ".backups");
  mkdirSync(backupDir, { recursive: true });
  const fileName = `dev-seed-pre-${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
  const backupPath = path.join(backupDir, fileName);
  copyFileSync(dbPath, backupPath);
  return backupPath;
}

async function assertMigrationGuard() {
  const requiredTables = [
    "ShopSettings",
    "Product",
    "DailySales",
    "Inventory",
    "WasteLog",
  ];
  for (const tableName of requiredTables) {
    const rows = await prisma.$queryRaw<{ name: string }[]>`
      SELECT name FROM sqlite_master WHERE type='table' AND name=${tableName}
    `;
    if (!rows || rows.length === 0) {
      throw new Error(`MIGRATION_GUARD_FAILED:${tableName}`);
    }
  }
}

export async function GET(request: NextRequest) {
  // Browser-friendly: GET triggers a quick seed (no body).
  // This avoids HTTP 405 when opening the endpoint directly.
  return POST(request);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const rate = seedRateLimit(getClientKey(request, "seed-post"));
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Zu viele Seed-Anfragen. Bitte in ${rate.retryAfterSec}s erneut versuchen.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  if (isSeedRunning) {
    return NextResponse.json(
      { error: "Seed läuft bereits. Bitte warten." },
      { status: 409 }
    );
  }

  isSeedRunning = true;
  try {
    assertSeedFeatureEnabled();
    assertSeedInAllowedEnvironment();
    assertAdminSeedAccess(request);
    await assertMigrationGuard();

    let mode: SeedMode = "quick";
    let seedText: string | undefined;
    try {
      const body = await request.json();
      const parsed = seedPayloadSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Ungültige Seed-Eingabe." },
          { status: 400 }
        );
      }
      const payload = parseSeedPayload(parsed.data);
      mode = payload.mode === "full" ? "full" : "quick";
      seedText = payload.seedText;
    } catch {
      const payload = parseSeedPayload({});
      mode = payload.mode === "full" ? "full" : "quick";
    }

    const backupPath = createPreSeedBackup();
    const seedHash = createSeedHash(seedText);
    logger.info("seed_start", {
      source: "api/seed",
      mode,
      seedHash,
    });

    execSync("npx tsx prisma/seed.ts", {
      cwd: process.cwd(),
      stdio: "inherit",
      env: { ...process.env, DEMO_MODE: mode, DEMO_SEED_TEXT: seedText ?? "" },
    });

    const elapsedMs = Date.now() - startTime;
    logger.info("seed_success", {
      source: "api/seed",
      mode,
      seedHash,
      elapsedMs,
    });

    return NextResponse.json({
      success: true,
      mode,
      seedHash,
      seededAt: new Date().toISOString(),
      elapsedMs,
      backupPath,
    });
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    const message =
      error instanceof Error ? error.message : "SEED_UNKNOWN_ERROR";
    logger.error("seed_fail", {
      source: "api/seed",
      error: message,
      elapsedMs,
    });

    if (message === "SEED_FEATURE_DISABLED") {
      return NextResponse.json({ error: "Seed-Funktion ist deaktiviert." }, { status: 403 });
    }
    if (message === "SEED_NOT_ALLOWED_IN_PRODUCTION") {
      return NextResponse.json({ error: "Seed ist in Production gesperrt." }, { status: 403 });
    }
    if (message === "SEED_ADMIN_TOKEN_INVALID") {
      return NextResponse.json({ error: "Admin-Token fehlt oder ist ungültig." }, { status: 401 });
    }
    if (message.startsWith("MIGRATION_GUARD_FAILED:")) {
      const table = message.split(":")[1];
      return NextResponse.json(
        { error: `Seed blockiert: Tabelle '${table}' fehlt. Bitte Migration ausführen.` },
        { status: 412 }
      );
    }

    return NextResponse.json(
      { error: "Failed to reset demo data" },
      { status: 500 }
    );
  } finally {
    isSeedRunning = false;
  }
}
