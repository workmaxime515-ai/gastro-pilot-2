import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100;

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (entry.resetTime <= now) {
      rateLimitMap.delete(key);
    }
  }
}

setInterval(cleanupOldEntries, 30_000);

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip health check from rate limiting
  if (req.nextUrl.pathname === "/api/health") {
    return NextResponse.next();
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();

  let entry = rateLimitMap.get(ip);

  if (!entry || entry.resetTime <= now) {
    entry = { count: 0, resetTime: now + WINDOW_MS };
    rateLimitMap.set(ip, entry);
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warten.", code: "RATE_LIMIT" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(entry.resetTime),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(MAX_REQUESTS));
  response.headers.set("X-RateLimit-Remaining", String(MAX_REQUESTS - entry.count));
  response.headers.set("X-RateLimit-Reset", String(entry.resetTime));
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
