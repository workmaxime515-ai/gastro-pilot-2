"use client";

import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/animations";
import { Cloud, Sun, CloudRain, CloudSnow, CloudDrizzle, Wind } from "lucide-react";

interface YesterdayData {
  totalRevenue: number;
  totalWaste: number;
  dayRating: string | null;
  notes: string | null;
}

interface TomorrowItem {
  title: string;
  description: string;
}

interface WeatherData {
  condition: string;
  tempHigh: number;
  tempLow: number;
  date: string;
}

interface TrendDay {
  date: string;
  revenue: number;
  percent: number;
}

const WEATHER_ICONS: Record<string, typeof Sun> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  stormy: CloudRain,
  snowy: CloudSnow,
  drizzle: CloudDrizzle,
  windy: Wind,
};

const WEATHER_LABELS: Record<string, string> = {
  sunny: "Sonnig",
  cloudy: "Bewoelkt",
  rainy: "Regen",
  stormy: "Gewitter",
  snowy: "Schnee",
  drizzle: "Nieselregen",
  windy: "Windig",
};

const DAY_ABBR = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function ContextPanel() {
  const [yesterday, setYesterday] = useState<YesterdayData | null>(null);
  const [tomorrowItems, setTomorrowItems] = useState<TomorrowItem[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [trends, setTrends] = useState<TrendDay[]>([]);

  useEffect(() => {
    fetch("/api/analytics?type=yesterday")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.totalRevenue != null) setYesterday(d);
      })
      .catch((e) => console.warn("ContextPanel fetch error:", e));

    fetch("/api/suggestions?tomorrow=true")
      .then((r) => r.json())
      .then((d) => {
        if (d?.tomorrowSuggestions) {
          setTomorrowItems(
            d.tomorrowSuggestions.slice(0, 3).map((s: { title: string; description: string }) => ({
              title: s.title,
              description: s.description,
            }))
          );
        }
      })
      .catch((e) => console.warn("ContextPanel fetch error:", e));

    fetch("/api/weather")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.condition) setWeather(d);
      })
      .catch((e) => console.warn("ContextPanel fetch error:", e));

    fetch("/api/analytics?type=weekly-trends")
      .then((r) => r.json())
      .then((d) => {
        if (d?.days && Array.isArray(d.days)) setTrends(d.days);
      })
      .catch((e) => console.warn("ContextPanel fetch error:", e));
  }, []);

  const WeatherIcon = weather ? (WEATHER_ICONS[weather.condition] || Cloud) : Cloud;

  return (
    <aside className="hidden lg:block lg:border-l lg:border-[var(--color-border-subtle)] lg:bg-[var(--color-card-bg)] dark:lg:bg-[var(--color-dark-card)]">
      <div className="sticky top-0 space-y-6 px-5 py-6">
        {/* Gestern */}
        <section>
          <h3 className="text-meta mb-3 font-semibold uppercase tracking-wide">
            Gestern
          </h3>
          {yesterday ? (
            <div className="space-y-2">
              <div className="card p-3">
                <p className="text-meta">Umsatz</p>
                <p className="text-card-title text-number">
                  <AnimatedNumber value={yesterday.totalRevenue} prefix="EUR " decimals={2} />
                </p>
              </div>
              <div className="card p-3">
                <p className="text-meta">Waste</p>
                <p className="text-card-title text-number">
                  <AnimatedNumber value={yesterday.totalWaste} decimals={0} suffix=" Stk" />
                </p>
              </div>
              {yesterday.dayRating && (
                <div className="card p-3">
                  <p className="text-meta">Bewertung</p>
                  <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {yesterday.dayRating === "good" ? "Guter Tag" : yesterday.dayRating === "weak" ? "Schwacher Tag" : "Normaler Tag"}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-meta">Keine Daten vorhanden</p>
          )}
        </section>

        {/* Wetter */}
        {weather && (
          <section>
            <h3 className="text-meta mb-3 font-semibold uppercase tracking-wide">
              Wetter heute
            </h3>
            <div className="card p-3 flex items-center gap-3">
              <WeatherIcon size={28} strokeWidth={1.5} style={{ color: "var(--color-accent-primary)" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {WEATHER_LABELS[weather.condition] || weather.condition}
                </p>
                <p className="text-meta">
                  {weather.tempLow}° / {weather.tempHigh}°C
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Morgen */}
        <section>
          <h3 className="text-meta mb-3 font-semibold uppercase tracking-wide">
            Morgen vorbereiten
          </h3>
          {tomorrowItems.length > 0 ? (
            <ul className="space-y-2">
              {tomorrowItems.map((item, i) => (
                <li key={i} className="card p-3">
                  <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {item.title}
                  </p>
                  <p className="text-meta mt-0.5 line-clamp-2">{item.description}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-meta">Keine Vorbereitungen noetig</p>
          )}
        </section>

        {/* Mini Trend-Bars */}
        <section>
          <h3 className="text-meta mb-3 font-semibold uppercase tracking-wide">
            Diese Woche
          </h3>
          {trends.length > 0 && trends.some((t) => t.revenue > 0) ? (
            <div className="card p-3">
              <div className="flex items-end gap-1.5" style={{ height: 64 }}>
                {trends.map((day) => {
                  const d = new Date(day.date);
                  const isToday = day.date === new Date().toISOString().split("T")[0];
                  return (
                    <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-sm transition-all duration-300"
                        style={{
                          height: `${Math.max(day.percent, 4)}%`,
                          backgroundColor: isToday
                            ? "var(--color-accent-primary)"
                            : "var(--color-track-bg)",
                          minHeight: 3,
                        }}
                      />
                      <span className="text-[10px]" style={{ color: isToday ? "var(--color-accent-primary)" : "var(--color-text-secondary)" }}>
                        {DAY_ABBR[d.getDay()]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="card p-3">
              <p className="text-meta">Trend-Daten werden mit mehr Eintraegen verfuegbar.</p>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
