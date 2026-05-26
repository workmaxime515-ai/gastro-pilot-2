import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type RateWindow = {
  count: number;
  resetAt: number;
};

const RATE_BUCKETS = new Map<string, RateWindow>();

export function createRateLimiter(windowMs: number, maxRequests: number) {
  return (key: string) => {
    const now = Date.now();
    const bucket = RATE_BUCKETS.get(key);

    if (!bucket || bucket.resetAt <= now) {
      RATE_BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        retryAfterSec: 0,
        remaining: maxRequests - 1,
      };
    }

    bucket.count += 1;
    RATE_BUCKETS.set(key, bucket);
    if (bucket.count <= maxRequests) {
      return {
        allowed: true,
        retryAfterSec: 0,
        remaining: maxRequests - bucket.count,
      };
    }

    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      remaining: 0,
    };
  };
}

export function getClientKey(req: NextRequest, scope: string): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const clientIp = forwarded?.split(",")[0]?.trim() || "unknown";
  return `${scope}:${clientIp}`;
}

export async function parseJsonWithLimit<T>(
  req: NextRequest,
  maxBytes: number,
  schema: z.ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const contentLengthRaw = req.headers.get("content-length");
  const contentLength = contentLengthRaw ? Number(contentLengthRaw) : NaN;
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Payload zu gross (max ${maxBytes} Bytes)` },
        { status: 413 }
      ),
    };
  }

  const text = await req.text();
  if (text.length > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Payload zu gross (max ${maxBytes} Bytes)` },
        { status: 413 }
      ),
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Ungueltiges JSON" }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      ok: false,
      response: NextResponse.json(
        { error: firstIssue?.message || "Ungueltige Eingaben" },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
