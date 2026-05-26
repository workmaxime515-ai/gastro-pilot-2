import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import fs from "fs";

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1" || typeof process.env.VERCEL_REGION === "string";
}

export function resolveDbPath(): string {
  if (isVercelRuntime()) {
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
const templatePath = path.join(process.cwd(), "prisma/vercel-template.db");
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

  const missing = !fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0;
  if (missing && fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, dbPath);
  }

  globalForPrisma.dbReady = true;
}

function createPrismaClient() {
  ensureSchema();
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
