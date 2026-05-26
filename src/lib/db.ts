import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1" || typeof process.env.VERCEL_REGION === "string";
}

export function resolveDbPath(): string {
  if (isVercelRuntime()) {
    // Vercel serverless: only /tmp is writable. Ignore file:./dev.db from .env.
    return "/tmp/dev.db";
  }

  const url = process.env.DATABASE_URL;
  if (url?.startsWith("file:")) {
    const raw = url.slice("file:".length);
    const normalized = raw.replace(/^\/\//, "");
    if (path.isAbsolute(normalized)) return normalized;
    return path.join(process.cwd(), normalized.replace(/^\.\//, ""));
  }
  if (process.env.DATABASE_PATH) {
    return path.resolve(process.env.DATABASE_PATH);
  }
  return path.join(process.cwd(), "dev.db");
}

const dbPath = resolveDbPath();
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbReady: boolean | undefined;
};

function ensureSchema() {
  if (globalForPrisma.dbReady) return;
  const needsInit = !fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0;
  if (needsInit || isVercelRuntime()) {
    try {
      execSync("npx prisma db push --skip-generate", {
        cwd: process.cwd(),
        stdio: "pipe",
        env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      });
    } catch (e) {
      console.warn("prisma db push:", e);
    }
  }
  globalForPrisma.dbReady = true;
}

function createPrismaClient() {
  ensureSchema();
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
} else {
  globalForPrisma.prisma = prisma;
}
