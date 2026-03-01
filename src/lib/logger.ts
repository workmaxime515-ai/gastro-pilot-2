type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  source?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LEVEL];
}

function formatLog(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.toUpperCase()}]`,
    entry.source ? `[${entry.source}]` : "",
    entry.message,
  ].filter(Boolean);
  return parts.join(" ");
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    source: meta?.source as string | undefined,
    meta,
    timestamp: new Date().toISOString(),
  };

  const formatted = formatLog(entry);

  switch (level) {
    case "error":
      console.error(formatted, meta ? JSON.stringify(meta) : "");
      break;
    case "warn":
      console.warn(formatted, meta ? JSON.stringify(meta) : "");
      break;
    case "debug":
      console.debug(formatted, meta ? JSON.stringify(meta) : "");
      break;
    default:
      console.log(formatted, meta ? JSON.stringify(meta) : "");
  }

  if (level === "error" || level === "warn") {
    persistLog(entry).catch(() => {});
  }
}

async function persistLog(entry: LogEntry): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.appLog.create({
      data: {
        level: entry.level,
        source: entry.source ?? "unknown",
        message: entry.message,
        meta: entry.meta ? JSON.stringify(entry.meta) : null,
      },
    });
  } catch {
    // DB might not be available during startup — silently ignore
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),

  api: (route: string, method: string, status: number, durationMs?: number) =>
    log("info", `${method} ${route} → ${status}${durationMs ? ` (${durationMs}ms)` : ""}`, {
      source: "api",
      route,
      method,
      status,
      durationMs,
    }),
};
