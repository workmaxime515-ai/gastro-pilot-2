"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/i18n";
import { StrategySelector } from "@/components/StrategySelector";
import { Tutorial } from "@/components/Tutorial";
import { BreakEvenBar } from "@/components/BreakEvenBar";
import { SuggestionCard } from "@/components/SuggestionCard";
import { TomorrowSection } from "@/components/TomorrowSection";
import { SOSButton } from "@/components/SOSButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { QuickLauncher } from "@/components/QuickLauncher";
import { QuickSale } from "@/components/QuickSale";
import { ManagerAlerts } from "@/components/ManagerAlerts";
import { toArray } from "@/lib/api-helpers";
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

interface CostSnapshot {
  fixedCostsDaily: number;
  wasteCost: number;
  grossAfterCosts: number;
  netProfit?: number;
  expensesToday?: number;
  laborCost?: number;
}

interface KpiExplain {
  customers?: {
    formula: string;
    source: string;
    manualSum: number;
    quantitySold: number;
    estimated: number;
  };
  netProfit?: {
    formula: string;
    parts: Record<string, number>;
  };
}

function netProfitColor(value: number): string {
  if (value < 0) return "var(--color-accent-stress)";
  if (value === 0) return "var(--color-text-secondary)";
  return "var(--color-accent-profit)";
}

interface QuickNote {
  id: string;
  text: string;
  category: string;
  date: string;
}

const QUICK_ACTIONS = [
  { href: "/eingabe", labelKey: "home.quickSale", icon: PenLine, color: "var(--color-accent-primary)" },
  { href: "/abend", labelKey: "home.quickRegister", icon: Wallet, color: "var(--color-accent-profit)" },
  { href: "/haccp", labelKey: "home.quickHACCP", icon: ShieldCheck, color: "var(--color-accent-stress)" },
  { href: "/finanzen", labelKey: "home.quickFinanzen", icon: Wallet, color: "var(--color-accent-primary)" },
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
  const [inventoryAlerts, setInventoryAlerts] = useState<{type: string; severity: string; message: string; action?: string}[]>([]);
  const [recentNotes, setRecentNotes] = useState<QuickNote[]>([]);
  const [costSnapshot, setCostSnapshot] = useState<CostSnapshot | null>(null);
  const [kpiExplain, setKpiExplain] = useState<KpiExplain | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [managerToday, setManagerToday] = useState<{
    profit: number;
    revenue: number;
    cogs: number;
    breakEvenRemaining: number;
    breakEvenAchieved: boolean;
  } | null>(null);

  const refreshManagerToday = useCallback(() => {
    fetch("/api/manager/today")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.profit === "number") {
          setManagerToday({
            profit: d.profit,
            revenue: d.revenue ?? 0,
            cogs: d.cogs ?? 0,
            breakEvenRemaining: d.breakEvenRemaining ?? 0,
            breakEvenAchieved: Boolean(d.breakEvenAchieved),
          });
        }
      })
      .catch((e) => console.warn("Manager today fetch error:", e));
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/suggestions");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setData({
            suggestions: [],
            tomorrowSuggestions: [],
            breakEven: {
              dailyCost: 0,
              currentRevenue: 0,
              remainingTarget: 0,
              coffeeEquivalent: 0,
              isAchieved: false,
            },
            strategyMode: "balanced",
          });
          return;
        }
        const breakEven = (json as ApiResponse).breakEven;
        setData({
          suggestions: toArray<SuggestionProps>((json as { suggestions?: unknown })?.suggestions),
          tomorrowSuggestions: toArray<SuggestionProps>((json as { tomorrowSuggestions?: unknown })?.tomorrowSuggestions),
          breakEven: breakEven ?? {
            dailyCost: 0,
            currentRevenue: 0,
            remainingTarget: 0,
            coffeeEquivalent: 0,
            isAchieved: false,
          },
          strategyMode: (json as ApiResponse).strategyMode ?? "balanced",
          dataQuality: (json as ApiResponse).dataQuality,
        });
      } catch (e) {
        console.warn("Home suggestions fetch error:", e);
        setData({
          suggestions: [],
          tomorrowSuggestions: [],
          breakEven: {
            dailyCost: 0,
            currentRevenue: 0,
            remainingTarget: 0,
            coffeeEquivalent: 0,
            isAchieved: false,
          },
          strategyMode: "balanced",
        });
        setError(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLastUpdated(localStorage.getItem("gastro-demo-last-updated"));
    }

    fetch("/api/dashboard/kpis")
      .then(async (r) => (r.ok ? r.json() : {}))
      .then((d) => {
        if (typeof d.shopName === "string" && d.shopName.trim()) setShopName(d.shopName);
        if (typeof d.todayCustomers === "number") setCustomerCount(d.todayCustomers);
        if (typeof d.todayWaste === "number") setWasteToday(d.todayWaste);
        if (d.weather && typeof d.weather === "object") setWeather(d.weather as WeatherInfo);
        setTrends(toArray<TrendDay>(d.trends));
        if (d.revenueGoal && typeof d.revenueGoal === "object") setRevenueGoal(d.revenueGoal as RevenueGoal);
        if (d.costSnapshot && typeof d.costSnapshot === "object") setCostSnapshot(d.costSnapshot as CostSnapshot);
        if (d.kpiExplain && typeof d.kpiExplain === "object") setKpiExplain(d.kpiExplain as KpiExplain);
      })
      .catch((e) => console.warn("Home fetch error:", e));

    fetch("/api/inventory/alerts")
      .then(async (r) => (r.ok ? r.json() : {}))
      .then((d) => {
        const alerts = toArray<{type: string; severity: string; message: string; action?: string}>(d.alerts);
        setInventoryAlerts(alerts.slice(0, 3));
      })
      .catch((e) => console.warn("Home fetch error:", e));

    fetch("/api/quick-notes?all=true")
      .then(async (r) => (r.ok ? r.json() : []))
      .then((d) => {
        const notes = toArray<QuickNote>(d);
        setRecentNotes(notes.slice(0, 3));
      })
      .catch((e) => console.warn("Home quick notes fetch error:", e));

    refreshManagerToday();
  }, [refreshManagerToday]);

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
            {t("common.loadFailed")}
          </p>
          <p className="text-meta mt-1">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-3 text-sm">
            {t("common.retry")}
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
              {lastUpdated && (
                <span className="text-meta">• Updated {new Date(lastUpdated).toLocaleTimeString()}</span>
              )}
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

      {managerToday && (
        <div className="card text-center py-6 px-4">
          <p className="text-meta mb-1">{t("manager.profitToday")}</p>
          <p
            className="text-4xl font-bold text-number"
            style={{ color: netProfitColor(managerToday.profit) }}
          >
            {managerToday.profit.toFixed(2)} €
          </p>
          <p className="text-meta mt-2">
            {managerToday.breakEvenAchieved
              ? t("manager.breakEvenDone")
              : t("manager.breakEvenRemaining").replace(
                  "{amount}",
                  managerToday.breakEvenRemaining.toFixed(0)
                )}
          </p>
          {managerToday.revenue > 0 && (
            <p className="text-meta mt-1">
              Food Cost:{" "}
              {((managerToday.cogs / managerToday.revenue) * 100).toFixed(1)}%
            </p>
          )}
        </div>
      )}

      <ManagerAlerts />

      <QuickSale onSold={refreshManagerToday} />

      <QuickLauncher />

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-3">
          <TrendingUp size={16} className="mx-auto mb-1" style={{ color: "var(--color-accent-profit)" }} />
          <p className="text-number text-lg font-semibold" style={{ color: "var(--color-accent-profit)" }}>
            {todayRevenue.toFixed(0)}
          </p>
          <p className="text-meta">{t("common.revenue")}</p>
        </div>
        <div className="card text-center py-3">
          <Users size={16} className="mx-auto mb-1" style={{ color: "var(--color-accent-primary)" }} />
          <p className="text-number text-lg font-semibold" style={{ color: "var(--color-accent-primary)" }}>
            {customerCount}
          </p>
          <p className="text-meta">{t("home.customers")}</p>
        </div>
        <div className="card text-center py-3">
          <Trash2 size={16} className="mx-auto mb-1" style={{ color: "var(--color-accent-waste)" }} />
          <p className="text-number text-lg font-semibold" style={{ color: "var(--color-accent-waste)" }}>
            {wasteToday}
          </p>
          <p className="text-meta">{t("home.waste")}</p>
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
              <div key={i} className="text-sm">
                <div className="flex items-center gap-2">
                  <Package size={12} style={{ color: alert.severity === "high" ? "var(--color-accent-warning)" : "var(--color-accent-waste)" }} />
                  <span className="text-meta">{alert.message}</span>
                </div>
                {alert.action && (
                  <p className="ml-5 text-xs text-text-secondary dark:text-dark-text-secondary">{alert.action}</p>
                )}
                {"workflow" in alert && Array.isArray((alert as { workflow?: string[] }).workflow) && (
                  <p className="ml-5 text-[11px] text-text-secondary dark:text-dark-text-secondary">
                    {(alert as { workflow?: string[] }).workflow?.[0]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {inventoryAlerts.length === 0 && (
        <div className="card">
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
            Kein akutes Bestandsrisiko. Fuehre am Abend einen kurzen 86-Check durch.
          </p>
        </div>
      )}

      {/* Break-Even */}
      {breakEven && (
        <div data-tutorial-anchor="breakeven">
          <BreakEvenBar {...breakEven} />
        </div>
      )}

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

      {costSnapshot && (
        <div className="card space-y-3">
          <p className="text-sm font-medium">{t("home.costProfitSnapshot")}</p>
          <div className="space-y-1 text-sm">
            <p className="text-text-secondary dark:text-dark-text-secondary">
              {t("home.fixedToday")}: {costSnapshot.fixedCostsDaily.toFixed(2)} EUR
            </p>
            {(costSnapshot.laborCost ?? 0) > 0 && (
              <p className="text-text-secondary dark:text-dark-text-secondary">
                {t("home.laborToday")}: {(costSnapshot.laborCost ?? 0).toFixed(2)} EUR
              </p>
            )}
            <p className="text-text-secondary dark:text-dark-text-secondary">
              {t("home.wasteCostToday")}: {costSnapshot.wasteCost.toFixed(2)} EUR
            </p>
            <p className="text-text-secondary dark:text-dark-text-secondary">
              {t("home.expensesToday")}: {(costSnapshot.expensesToday ?? 0).toFixed(2)} EUR
            </p>
            <p className="font-semibold" style={{ color: netProfitColor(costSnapshot.netProfit ?? costSnapshot.grossAfterCosts) }}>
              {t("home.netProfitToday")}: {(costSnapshot.netProfit ?? costSnapshot.grossAfterCosts).toFixed(2)} EUR
            </p>
          </div>
          {kpiExplain?.customers && (
            <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: "var(--color-track-bg)" }}>
              <p className="font-medium text-text-primary dark:text-dark-text-primary mb-1">{t("home.howCustomersCalculated")}</p>
              <p className="text-text-secondary dark:text-dark-text-secondary">{kpiExplain.customers.formula}</p>
              <p className="text-meta mt-1">
                {t("home.source")}: {kpiExplain.customers.source} · {t("home.estimated")}: {kpiExplain.customers.estimated} · {t("home.manualSum")}: {kpiExplain.customers.manualSum} · {t("home.qtySold")}: {kpiExplain.customers.quantitySold}
              </p>
            </div>
          )}
          {kpiExplain?.netProfit && (
            <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: "var(--color-track-bg)" }}>
              <p className="font-medium text-text-primary dark:text-dark-text-primary mb-1">{t("home.howNetProfitCalculated")}</p>
              <p className="text-text-secondary dark:text-dark-text-secondary">{kpiExplain.netProfit.formula}</p>
            </div>
          )}
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
              data-tutorial-anchor={
                action.href === "/eingabe"
                  ? "eingabe"
                  : action.href === "/abend"
                    ? "abend"
                    : undefined
              }
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
      <div data-tutorial-anchor="strategy">
        <StrategySelector activeMode={strategyMode} />
      </div>

      {/* Suggestions */}
      <section aria-labelledby="suggestions-title" data-tutorial-anchor="suggestions">
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

      {recentNotes.length > 0 && (
        <section className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium">{t("common.notes")}</h2>
            <Link href="/berichte" className="text-sm text-accent hover:underline">
              {t("common.details")}
            </Link>
          </div>
          <div className="space-y-2">
            {recentNotes.map((note) => (
              <div key={note.id} className="rounded-lg bg-[var(--color-track-bg)] px-3 py-2">
                <p className="text-sm">{note.text}</p>
                <p className="text-meta">{note.category}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tomorrow */}
      {tomorrowSuggestions.length > 0 && (
        <TomorrowSection suggestions={tomorrowSuggestions} />
      )}

      <div data-tutorial-anchor="sos">
        <SOSButton />
      </div>
      <Tutorial />
    </div>
  );
}
