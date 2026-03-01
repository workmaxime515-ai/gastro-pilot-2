import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const checks: Record<string, { status: "ok" | "error"; message?: string; latencyMs?: number }> = {};

  // DB check
  const dbStart = Date.now();
  try {
    await prisma.shopSettings.findFirst();
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch (e) {
    checks.database = { status: "error", message: e instanceof Error ? e.message : "DB unreachable", latencyMs: Date.now() - dbStart };
  }

  // Data freshness
  try {
    const latestDayClose = await prisma.dayClose.findFirst({ orderBy: { date: "desc" } });
    const latestSale = await prisma.dailySales.findFirst({ orderBy: { date: "desc" } });
    const daysSinceClose = latestDayClose
      ? Math.floor((Date.now() - new Date(latestDayClose.date).getTime()) / 86400000)
      : null;
    const daysSinceSale = latestSale
      ? Math.floor((Date.now() - new Date(latestSale.date).getTime()) / 86400000)
      : null;

    checks.dataFreshness = {
      status: (daysSinceClose ?? 99) <= 3 ? "ok" : "error",
      message: `Letzter Abschluss: ${daysSinceClose != null ? `vor ${daysSinceClose} Tagen` : "nie"}. Letzter Verkauf: ${daysSinceSale != null ? `vor ${daysSinceSale} Tagen` : "nie"}.`,
    };
  } catch {
    checks.dataFreshness = { status: "error", message: "Konnte Datenfrische nicht pruefen" };
  }

  // Weather API
  try {
    const latestWeather = await prisma.weatherData.findFirst({ orderBy: { date: "desc" } });
    const weatherAge = latestWeather
      ? Math.floor((Date.now() - new Date(latestWeather.date).getTime()) / 3600000)
      : null;
    checks.weatherApi = {
      status: (weatherAge ?? 99) <= 24 ? "ok" : "error",
      message: latestWeather ? `Letzte Wetterdaten: vor ${weatherAge}h` : "Keine Wetterdaten",
    };
  } catch {
    checks.weatherApi = { status: "error", message: "Konnte Wetterstatus nicht pruefen" };
  }

  // Error log count (last 24h)
  try {
    const since = new Date(Date.now() - 86400000);
    const errorCount = await prisma.appLog.count({
      where: { level: "error", createdAt: { gte: since } },
    });
    const warnCount = await prisma.appLog.count({
      where: { level: "warn", createdAt: { gte: since } },
    });
    checks.errors24h = {
      status: errorCount <= 5 ? "ok" : "error",
      message: `${errorCount} Fehler, ${warnCount} Warnungen in 24h`,
    };
  } catch {
    checks.errors24h = { status: "ok", message: "Log-System nicht verfuegbar" };
  }

  // Model counts
  try {
    const [products, staff, recipes, suppliers] = await Promise.all([
      prisma.product.count(),
      prisma.staffMember.count({ where: { isActive: true } }),
      prisma.recipe.count(),
      prisma.supplier.count({ where: { isActive: true } }),
    ]);
    checks.dataCounts = {
      status: "ok",
      message: `${products} Produkte, ${staff} Mitarbeiter, ${recipes} Rezepte, ${suppliers} Lieferanten`,
    };
  } catch {
    checks.dataCounts = { status: "error", message: "Konnte Datenzaehlung nicht durchfuehren" };
  }

  // Confidence modifiers
  try {
    const paused = await prisma.confidenceModifier.count({ where: { isPaused: true } });
    checks.engine = {
      status: paused === 0 ? "ok" : "error",
      message: paused > 0 ? `${paused} Suggestion-Typen pausiert (zu viele Fehlschlaege)` : "Alle Typen aktiv",
    };
  } catch {
    checks.engine = { status: "error", message: "Konnte Engine-Status nicht pruefen" };
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok");

  return NextResponse.json({
    status: allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
  }, { status: allOk ? 200 : 503 });
}
