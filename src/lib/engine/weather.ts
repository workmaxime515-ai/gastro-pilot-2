/**
 * Weather Integration — OpenWeatherMap Free API
 * Fetches today + 3-day forecast and stores in DB.
 * Called on engine run if data is stale (>4 hours old).
 */

import { prisma } from "@/lib/db";

const CONDITION_MAP: Record<string, string> = {
  Clear: "sunny",
  Clouds: "cloudy",
  Rain: "rainy",
  Drizzle: "rainy",
  Thunderstorm: "stormy",
  Snow: "snowy",
  Mist: "cloudy",
  Fog: "cloudy",
  Haze: "cloudy",
};

function mapCondition(owmMain: string): string {
  return CONDITION_MAP[owmMain] || "cloudy";
}

function toDateOnly(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

interface OWMForecastItem {
  dt: number;
  main: { temp_min: number; temp_max: number; humidity: number };
  weather: { main: string }[];
}

export async function fetchAndStoreWeather(): Promise<void> {
  const settings = await prisma.shopSettings.findFirst();
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) return;

  const location = settings?.location || "Berlin";
  const today = toDateOnly(new Date());

  // Check if we already have today's weather
  const existing = await prisma.weatherData.findUnique({ where: { date: today } });
  if (existing) return;

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&units=metric&appid=${apiKey}&cnt=32`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return;

    const data = await res.json();
    if (!data.list) return;

    // Group forecast items by date
    const byDate = new Map<number, OWMForecastItem[]>();
    for (const item of data.list as OWMForecastItem[]) {
      const date = toDateOnly(new Date(item.dt * 1000)).getTime();
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(item);
    }

    // Store up to 4 days
    for (const [dateMs, items] of Array.from(byDate.entries()).slice(0, 4)) {
      const date = new Date(dateMs);
      const tempHigh = Math.max(...items.map(i => i.main.temp_max));
      const tempLow = Math.min(...items.map(i => i.main.temp_min));
      const humidity = Math.round(items.reduce((s, i) => s + i.main.humidity, 0) / items.length);

      // Most common weather condition
      const condCounts = new Map<string, number>();
      for (const item of items) {
        const cond = item.weather[0]?.main || "Clouds";
        condCounts.set(cond, (condCounts.get(cond) || 0) + 1);
      }
      const mainCondition = [...condCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Clouds";

      await prisma.weatherData.upsert({
        where: { date },
        update: { tempHigh, tempLow, humidity, condition: mapCondition(mainCondition) },
        create: { date, tempHigh, tempLow, humidity, condition: mapCondition(mainCondition) },
      });
    }
  } catch {
    // Weather is non-critical; fail silently
  }
}

export async function getWeatherForDate(date: Date): Promise<{ condition: string; tempHigh: number; tempLow: number } | null> {
  const d = toDateOnly(date);
  const weather = await prisma.weatherData.findUnique({ where: { date: d } });
  if (!weather) return null;
  return { condition: weather.condition, tempHigh: weather.tempHigh, tempLow: weather.tempLow };
}

// ─── Proactive Weather Alerts ────────────────────────────────

interface WeatherAlert {
  type: "rain" | "heat" | "cold" | "storm";
  date: string;
  dayName: string;
  message: string;
  actionSuggestion: string;
}

const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

/**
 * Generate proactive alerts for the next 5 days based on weather forecast.
 */
export async function getWeatherAlerts(): Promise<WeatherAlert[]> {
  const alerts: WeatherAlert[] = [];

  try {
    const today = toDateOnly(new Date());
    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);

    const forecasts = await prisma.weatherData.findMany({
      where: {
        date: { gte: today, lte: fiveDaysLater },
      },
      orderBy: { date: "asc" },
    });

    for (const forecast of forecasts) {
      const date = new Date(forecast.date);
      const dateKey = date.toISOString().split("T")[0];
      const dayName = DAY_NAMES[date.getDay()];

      // Rain / Storm alert
      if (forecast.condition === "rainy" || forecast.condition === "stormy") {
        alerts.push({
          type: forecast.condition === "stormy" ? "storm" : "rain",
          date: dateKey,
          dayName,
          message: forecast.condition === "stormy"
            ? `Gewitter am ${dayName} erwartet — Outdoor-Betrieb einplanen.`
            : `Regen am ${dayName} erwartet — weniger Laufkundschaft.`,
          actionSuggestion: forecast.condition === "stormy"
            ? "Outdoor-Möbel sichern. Weniger verderbliche Ware vorbereiten. Personal fuer Indoor-Rush planen."
            : "20% weniger Outdoor-Produkte vorbereiten. Indoor-Comfort-Getränke pushen (heisse Schokolade, Chai).",
        });
      }

      // Heat alert (>30°C)
      if (forecast.tempHigh >= 30) {
        alerts.push({
          type: "heat",
          date: dateKey,
          dayName,
          message: `Hitzewelle am ${dayName}: ${forecast.tempHigh.toFixed(0)}°C erwartet.`,
          actionSuggestion: "Eiskaffee-Vorrat aufstocken. Cold Brew und Smoothies prominent platzieren. Wasserspender bereitstellen.",
        });
      }

      // Cold alert (<0°C)
      if (forecast.tempLow <= 0) {
        alerts.push({
          type: "cold",
          date: dateKey,
          dayName,
          message: `Frost am ${dayName}: ${forecast.tempLow.toFixed(0)}°C erwartet.`,
          actionSuggestion: "Warme Getränke priorisieren. Suppen/Eintopf als Tagesgericht. Heizung/Dekoration gemütlich gestalten.",
        });
      }
    }
  } catch {
    // Non-critical
  }

  return alerts;
}
