"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n";
import { StrategySelector } from "@/components/StrategySelector";
import { Tutorial } from "@/components/Tutorial";
import { BreakEvenBar } from "@/components/BreakEvenBar";
import { SuggestionCard } from "@/components/SuggestionCard";
import { TomorrowSection } from "@/components/TomorrowSection";
import { SOSButton } from "@/components/SOSButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import {
  PenLine,
  Wallet,
  ShieldCheck,
  Cloud,
  Sun,
  CloudRain,
  Snowflake,
  CloudLightning,
  CloudDrizzle,
  Users,
  TrendingUp,
  Trash2,
  AlertTriangle,
  Package,
} from "lucide-react";
import type { StrategyMode } from "@/lib/engine/types";
import type { SuggestionProps } from "@/components/SuggestionCard";

const DAY_NAMES_DE = [
  "Sonntag", "Montag", "Dienstag", "Mittwoch",
  "Donnerstag", "Freitag", "Samstag",
];
const MONTH_NAMES_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "home.greetingNight";
  if (hour < 11) return "home.greetingMorning";
  if (hour < 14) return "home.greetingDay";
  if (hour < 17) return "home.greetingAfternoon";
  if (hour < 21) return "home.greetingEvening";
  return "home.greetingNight";
}

function formatDateDE(): string {
  const d = new Date();
  return `${DAY_NAMES_DE[d.getDay()]}, ${d.getDate()}. ${MONTH_NAMES_DE[d.getMonth()]}`;
}

const WEATHER_ICONS: Record<string, typeof Sun> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: Snowflake,
  stormy: CloudLightning,
  drizzle: CloudDrizzle,
};

interface ApiResponse {
  suggestions: SuggestionProps[];
  tomorrowSuggestions: SuggestionProps[];
  breakEven: {
    dailyCost: number;
    currentRevenue: number;
    remainingTarget: number;
    coffeeEquivalent: number;
    isAchieved: boolean;
  };
  strategyMode: StrategyMode;
  dataQuality?: number;
}

interface WeatherInfo {
  tempHigh: number;
  tempLow: number;
  condition: string;
}

interface RevenueGoal {
  id: string;
  period: string;
  targetAmount: number;
  actualAmount: number;
  isActive: boolean;
}

interface TrendDay {
  date: string;
  revenue: number;
  dayOfWeek: number;
}

const QUICK_ACTIONS = [
  { href: "/eingabe", labelKey: "home.quickSale", icon: PenLine, color: "var(--color-accent-primary)" },
  { href: "/abend", labelKey: "home.quickRegister", icon: Wallet, color: "var(--color-accent-profit)" },
  { href: "/haccp", labelKey: "home.quickHACCP", icon: ShieldCheck, color: "var(--color-accent-stress)" },
];

export default function Home() {
  const { t } = useT();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shopName, setShopName] = useState("Max");
  const [revenueGoal, setRevenueGoal] = useState<RevenueGoal | null>(null);
  const [customerCount, setCustomerCount] = useState(0);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [trends, setTrends] = useState<TrendDay[]>([]);
  const [wasteToday, setWasteToday] = useState(0);
  const [inventoryAlerts, setInventoryAlerts] = useState<{type: string; severity: string; message: string}[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/suggestions");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Fehler beim Laden");
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    fetch("/api/dashboard/kpis")
      .then((r) => r.json())
      .then((d) => {
        if (d.shopName) setShopName(d.shopName);
        if (typeof d.todayCustomers === "number") setCustomerCount(d.todayCustomers);
        if (typeof d.todayWaste === "number") setWasteToday(d.todayWaste);
        if (d.weather) setWeather(d.weather);
        if (Array.isArray(d.trends)) setTrends(d.trends);
        if (d.revenueGoal) setRevenueGoal(d.revenueGoal);
      })
      .catch((e) => console.warn("Home fetch error:", e));

    fetch("/api/inventory/alerts")
      .then((r) => r.json())
      .then((d) => { if (d.alerts) setInventoryAlerts(d.alerts.slice(0, 3)); })
      .catch((e) => console.warn("Home fetch error:", e));
  }, []);

  const greeting = t(getGreetingKey());
  const dateStr = formatDateDE();

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="h-8 w-56 skeleton" />
          <div className="h-4 w-40 skeleton" />
        </div>
        <div className="skeleton h-16 rounded-2xl" />
        <div className="skeleton h-12 rounded-2xl" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-greeting">{greeting}.</h1>
          <p className="text-meta mt-1">{dateStr}</p>
        </div>
        <div className="card stripe-warning" role="alert">
          <p className="text-sm font-medium" style={{ color: "var(--color-accent-warning)" }}>
            Laden fehlgeschlagen
          </p>
          <p className="text-meta mt-1">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-3 text-sm">
            Nochmal versuchen
          </button>
        </div>
      </div>
    );
  }

  const suggestions = data?.suggestions ?? [];
  const tomorrowSuggestions = data?.tomorrowSuggestions ?? [];
  const breakEven = data?.breakEven;
  const strategyMode = data?.strategyMode ?? "balanced";

  const todayRevenue = breakEven?.currentRevenue ?? 0;
  const WeatherIcon = weather ? (WEATHER_ICONS[weather.condition] ?? Cloud) : Cloud;
  const maxTrend = Math.max(1, ...trends.map((t) => t.revenue));

  const totalSuggestions = suggestions.length;

  const handleFeedback = async (suggestionId: string, action: "done" | "skipped" | "later") => {
    try {
      await fetch("/api/suggestions/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId, action }),
      });
      if (action === "done" || action === "skipped") {
        setData((prev) =>
          prev ? { ...prev, suggestions: prev.suggestions.filter((s) => s.id !== suggestionId) } : prev
        );
      }
    } catch (e) {
      console.error("Feedback error:", e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Greeting + Weather */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-greeting">
            {greeting}, {shopName}.
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-meta">{dateStr}</p>
            {weather && (
              <span className="flex items-center gap-1 text-meta">
                <WeatherIcon size={14} />
                {Math.round(weather.tempHigh)}°
              </span>
            )}
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-3">
          <TrendingUp size={16} className="mx-auto mb-1" style={{ color: "var(--color-accent-profit)" }} />
          <p className="text-number text-lg font-semibold" style={{ color: "var(--color-accent-profit)" }}>
            {todayRevenue.toFixed(0)}
          </p>
          <p className="text-meta">Umsatz</p>
        </div>
        <div className="card text-center py-3">
          <Users size={16} className="mx-auto mb-1" style={{ color: "var(--color-accent-stress)" }} />
          <p className="text-number text-lg font-semibold" style={{ color: "var(--color-accent-stress)" }}>
            {customerCount}
          </p>
          <p className="text-meta">Kunden</p>
        </div>
        <div className="card text-center py-3">
          <Trash2 size={16} className="mx-auto mb-1" style={{ color: "var(--color-accent-waste)" }} />
          <p className="text-number text-lg font-semibold" style={{ color: "var(--color-accent-waste)" }}>
            {wasteToday}
          </p>
          <p className="text-meta">Waste</p>
        </div>
      </div>

      {/* Inventory Alerts */}
      {inventoryAlerts.length > 0 && (
        <div className="card" style={{ borderLeft: "4px solid var(--color-accent-warning)" }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} style={{ color: "var(--color-accent-warning)" }} />
            <p className="text-sm font-medium">{t("home.inventoryAlerts")}</p>
          </div>
          <div className="space-y-1.5">
            {inventoryAlerts.map((alert, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Package size={12} style={{ color: alert.severity === "high" ? "var(--color-accent-warning)" : "var(--color-accent-waste)" }} />
                <span className="text-meta">{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Break-Even */}
      {breakEven && <BreakEvenBar {...breakEven} />}

      {/* Revenue Goal */}
      {revenueGoal && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">
              {t("home.revenueTarget")} ({revenueGoal.period === "daily" ? t("common.day") : revenueGoal.period === "weekly" ? t("common.week") : t("common.month")})
            </p>
            <span className="text-number text-sm font-semibold" style={{
              color: revenueGoal.actualAmount >= revenueGoal.targetAmount ? "var(--color-accent-profit)" : "var(--color-accent-primary)",
            }}>
              {Math.round((revenueGoal.actualAmount / revenueGoal.targetAmount) * 100)}%
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{
              width: `${Math.min(100, (revenueGoal.actualAmount / revenueGoal.targetAmount) * 100)}%`,
              backgroundColor: revenueGoal.actualAmount >= revenueGoal.targetAmount ? "var(--color-accent-profit)" : "var(--color-accent-primary)",
            }} />
          </div>
          <p className="text-meta mt-1">{revenueGoal.actualAmount.toFixed(0)} / {revenueGoal.targetAmount.toFixed(0)} EUR</p>
        </div>
      )}

      {/* Mini Trend Bars */}
      {trends.length > 0 && trends.some((t) => t.revenue > 0) && (
        <div className="card">
          <p className="text-sm font-medium mb-2">{t("home.last7Days")}</p>
          <div className="flex items-end gap-1.5" style={{ height: 48 }}>
            {trends.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm transition-all duration-300"
                  style={{
                    height: `${Math.max(4, (day.revenue / maxTrend) * 48)}px`,
                    backgroundColor: i === trends.length - 1 ? "var(--color-accent-primary)" : "var(--color-track-bg)",
                  }}
                />
                <span className="text-[10px] text-meta">
                  {DAY_NAMES_DE[day.dayOfWeek]?.substring(0, 2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="card card-interactive flex-1 flex flex-col items-center gap-1.5 py-3 text-center"
            >
              <Icon size={18} style={{ color: action.color }} />
              <span className="text-xs font-medium">{t(action.labelKey)}</span>
            </Link>
          );
        })}
      </div>

      {/* Day Info */}
      {totalSuggestions > 0 && (
        <div className="card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("home.recommendations")}</p>
            <span className="text-number text-sm" style={{ color: "var(--color-accent-primary)" }}>{totalSuggestions}</span>
          </div>
        </div>
      )}

      {/* Strategy Selector */}
      <StrategySelector activeMode={strategyMode} />

      {/* Suggestions */}
      <section aria-labelledby="suggestions-title">
        <h2 id="suggestions-title" className="text-section mb-3">
          {t("home.todayRecommendations")}
        </h2>
        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon">
                <Sun size={24} style={{ color: "var(--color-accent-primary)" }} />
              </div>
              <p className="text-card-title">{t("home.noRecommendationsNeeded")}</p>
              <p className="text-meta mt-1">{t("home.allGood")}</p>
            </div>
          ) : (
            suggestions.map((s, i) => (
              <div key={s.id ?? `${s.title}-${i}`} className="stagger-item">
                <SuggestionCard
                  suggestion={s}
                  onDone={() => handleFeedback(String(s.id ?? ""), "done")}
                  onSkip={() => handleFeedback(String(s.id ?? ""), "skipped")}
                  onLater={() => handleFeedback(String(s.id ?? ""), "later")}
                />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Tomorrow */}
      {tomorrowSuggestions.length > 0 && (
        <TomorrowSection suggestions={tomorrowSuggestions} />
      )}

      <SOSButton />
      <Tutorial />
    </div>
  );
}
