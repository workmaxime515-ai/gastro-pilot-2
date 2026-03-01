"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3, Target, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useT } from "@/i18n";

// ─── SVG Sparkline Component ────────────────────────────────

function Sparkline({
  data,
  width = 200,
  height = 50,
  color = "var(--color-accent-primary)",
  fill = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const fillD = fill
    ? `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
    : undefined;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {fill && fillD && (
        <path d={fillD} fill={color} opacity={0.1} />
      )}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill={color} />
    </svg>
  );
}

function BarChart({
  data,
  width = 200,
  height = 50,
  color = "var(--color-accent-waste)",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length === 0) return null;

  const max = Math.max(...data, 1);
  const barWidth = Math.max(4, (width - data.length * 2) / data.length);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {data.map((v, i) => {
        const barH = (v / max) * (height - 4);
        const x = i * (barWidth + 2) + 2;
        return (
          <rect
            key={i}
            x={x}
            y={height - barH - 2}
            width={barWidth}
            height={barH}
            rx={2}
            fill={color}
            opacity={0.7 + (i / data.length) * 0.3}
          />
        );
      })}
    </svg>
  );
}

// ─── Benchmark Gauge ────────────────────────────────────

function BenchmarkGauge({
  label,
  value,
  target,
  unit,
  good,
  tip,
}: {
  label: string;
  value: number | null;
  target: number;
  unit: string;
  good: [number, number];
  tip: string;
}) {
  const isGood = value !== null && value >= good[0] && value <= good[1];
  const statusColor = value === null ? "var(--color-text-secondary)" : isGood ? "var(--color-accent-profit)" : "var(--color-accent-warning)";

  return (
    <div className="bg-[var(--color-card-bg)] rounded-2xl p-4 relative overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: statusColor }} />
      <div className="ml-3">
        <p className="text-[12px] text-[var(--color-text-secondary)]">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-[24px] font-semibold" style={{ fontFamily: "var(--font-mono)", color: statusColor }}>
            {value !== null ? value.toFixed(unit === "%" ? 1 : 0) : "—"}
          </span>
          <span className="text-[12px] text-[var(--color-text-secondary)]">{unit}</span>
          <span className="text-[12px] text-[var(--color-text-secondary)] ml-auto">Ziel: {target}{unit}</span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-[6px] bg-[var(--color-bg-main)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: value !== null ? `${Math.min(100, (value / (target * 1.5)) * 100)}%` : "0%",
              backgroundColor: statusColor,
            }}
          />
        </div>
        <p className="text-[11px] text-[var(--color-text-secondary)] mt-2 leading-relaxed">{tip}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────

interface ForecastDay {
  date: string;
  dayName: string;
  predictedRevenue: number;
  confidenceLow: number;
  confidenceHigh: number;
  factors: string[];
}

interface ForecastModel {
  slope: number;
  intercept: number;
  rSquared: number;
  dataPoints: number;
  trend: "rising" | "falling" | "stable";
}

export default function AnalyticsPage() {
  const { t } = useT();
  const [period, setPeriod] = useState<7 | 14 | 28>(14);
  const [revenueData, setRevenueData] = useState<number[]>([]);
  const [wasteData, setWasteData] = useState<number[]>([]);
  const [customerData, setCustomerData] = useState<number[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [forecastModel, setForecastModel] = useState<ForecastModel | null>(null);
  const [kpis, setKpis] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [trendsRes, forecastRes, kpiRes] = await Promise.all([
        fetch(`/api/analytics?type=trends&days=${period}`),
        fetch(`/api/analytics/forecast-advanced?days=14`),
        fetch("/api/dashboard/kpis"),
      ]);

      if (trendsRes.ok) {
        const data = await trendsRes.json();
        if (data.dailyRevenue) {
          setRevenueData(data.dailyRevenue.map((d: { revenue: number }) => d.revenue));
          setDates(data.dailyRevenue.map((d: { date: string }) => d.date));
        }
        if (data.dailyWaste) {
          setWasteData(data.dailyWaste.map((d: { waste: number }) => d.waste));
        }
        if (data.dailyCustomers) {
          setCustomerData(data.dailyCustomers.map((d: { count: number }) => d.count));
        }
      }

      if (forecastRes.ok) {
        const data = await forecastRes.json();
        setForecast(data.forecast || []);
        setForecastModel(data.model || null);
      }

      if (kpiRes.ok) {
        const data = await kpiRes.json();
        setKpis({
          food_cost: data.foodCostPct ?? null,
          labor_cost: data.laborCostPct ?? null,
          waste_rate: data.wasteRate ?? null,
          avg_ticket: data.avgTicket ?? null,
          gross_margin: data.grossMargin ?? null,
        });
      }
    } catch (e) {
      console.warn("[Analytics] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const trendIcon = (data: number[]) => {
    if (data.length < 3) return <Minus size={16} />;
    const recent = data.slice(-3).reduce((s, v) => s + v, 0) / 3;
    const earlier = data.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
    if (recent > earlier * 1.05) return <TrendingUp size={16} className="text-[var(--color-accent-profit)]" />;
    if (recent < earlier * 0.95) return <TrendingDown size={16} className="text-[var(--color-accent-warning)]" />;
    return <Minus size={16} className="text-[var(--color-text-secondary)]" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const BENCHMARKS = [
    { id: "food_cost", label: "Food-Cost", unit: "%", target: 30, good: [25, 35] as [number, number], tip: "Rezepturen optimieren, Portionsgrößen kontrollieren." },
    { id: "labor_cost", label: "Personalkosten", unit: "%", target: 30, good: [25, 35] as [number, number], tip: "Schichtplanung an Auslastung anpassen." },
    { id: "waste_rate", label: "Waste-Rate", unit: "%", target: 3, good: [0, 5] as [number, number], tip: "Bestellmengen anpassen, Abend-Rabatte." },
    { id: "avg_ticket", label: "Ø Bon-Wert", unit: "EUR", target: 6.5, good: [5, 8] as [number, number], tip: "Upselling, Kombiangebote anbieten." },
    { id: "gross_margin", label: "Bruttomarge", unit: "%", target: 70, good: [65, 80] as [number, number], tip: "Hochmargige Produkte (Kaffee) pushen." },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-[var(--color-text-primary)]" style={{ fontFamily: "var(--font-heading)" }}>
            {t("analytics.title")}
          </h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">
            {t("analytics.trendOverview")}, {t("analytics.forecast")} &amp; {t("analytics.kpiBenchmarks")}
          </p>
        </div>
        <div className="flex gap-1 bg-[var(--color-bg-main)] rounded-xl p-1">
          {([7, 14, 28] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                period === p ? "bg-[var(--color-card-bg)] text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
              style={period === p ? { boxShadow: "var(--shadow-subtle)" } : undefined}
            >
              {p}T
            </button>
          ))}
        </div>
      </div>

      {/* Trend Charts */}
      <section>
        <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)] mb-4" style={{ fontFamily: "var(--font-heading)" }}>
          <BarChart3 size={20} className="inline mr-2 opacity-60" />
          {t("analytics.trendOverview")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Revenue Sparkline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--color-card-bg)] rounded-2xl p-5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] text-[var(--color-text-secondary)]">{t("common.revenue")}</p>
              {trendIcon(revenueData)}
            </div>
            <div className="flex items-end justify-between">
              <span className="text-[24px] font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
                {revenueData.length > 0 ? `${revenueData[revenueData.length - 1]?.toFixed(0) ?? "—"} EUR` : "—"}
              </span>
            </div>
            <div className="mt-3 overflow-hidden">
              <Sparkline data={revenueData} width={280} height={60} color="var(--color-accent-profit)" />
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-2">
              Letzte {period} Tage · {revenueData.length} Datenpunkte
            </p>
          </motion.div>

          {/* Waste Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[var(--color-card-bg)] rounded-2xl p-5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] text-[var(--color-text-secondary)]">{t("home.waste")}</p>
              {trendIcon(wasteData.map((v) => -v))}
            </div>
            <div className="flex items-end justify-between">
              <span className="text-[24px] font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
                {wasteData.length > 0 ? `${wasteData[wasteData.length - 1]?.toFixed(0) ?? "—"} Stk` : "—"}
              </span>
            </div>
            <div className="mt-3 overflow-hidden">
              <BarChart data={wasteData} width={280} height={60} color="var(--color-accent-waste)" />
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-2">
              Letzte {period} Tage
            </p>
          </motion.div>

          {/* Customer Sparkline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[var(--color-card-bg)] rounded-2xl p-5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] text-[var(--color-text-secondary)]">{t("home.customers")}</p>
              {trendIcon(customerData)}
            </div>
            <div className="flex items-end justify-between">
              <span className="text-[24px] font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
                {customerData.length > 0 ? `${customerData[customerData.length - 1] ?? "—"}` : "—"}
              </span>
            </div>
            <div className="mt-3 overflow-hidden">
              <Sparkline data={customerData} width={280} height={60} color="var(--color-accent-stress)" />
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-2">
              Letzte {period} Tage
            </p>
          </motion.div>
        </div>
      </section>

      {/* Forecast Section */}
      <section>
        <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)] mb-4" style={{ fontFamily: "var(--font-heading)" }}>
          <Calendar size={20} className="inline mr-2 opacity-60" />
          {t("analytics.forecast")}
          {forecastModel && (
            <span className="text-[12px] font-normal text-[var(--color-text-secondary)] ml-3">
              R² = {forecastModel.rSquared.toFixed(2)} · Trend: {forecastModel.trend === "rising" ? t("analytics.rising") : forecastModel.trend === "falling" ? t("analytics.falling") : t("analytics.stable")}
            </span>
          )}
        </h2>

        {forecast.length > 0 ? (
          <div className="space-y-2">
            {/* Forecast sparkline */}
            <div className="bg-[var(--color-card-bg)] rounded-2xl p-5 overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
              <Sparkline
                data={forecast.map((f) => f.predictedRevenue)}
                width={700}
                height={80}
                color="var(--color-accent-primary)"
              />
              <div className="flex justify-between mt-2 text-[11px] text-[var(--color-text-secondary)]">
                <span>{forecast[0]?.dayName} ({forecast[0]?.date})</span>
                <span>{forecast[forecast.length - 1]?.dayName} ({forecast[forecast.length - 1]?.date})</span>
              </div>
            </div>

            {/* Daily cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {forecast.slice(0, 7).map((day) => (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[var(--color-card-bg)] rounded-xl p-3 text-center"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <p className="text-[12px] text-[var(--color-text-secondary)]">{day.dayName}</p>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">{day.date.slice(5)}</p>
                  <p className="text-[18px] font-semibold mt-1" style={{ fontFamily: "var(--font-mono)" }}>
                    {day.predictedRevenue.toFixed(0)}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-secondary)]">EUR</p>
                  <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">
                    {day.confidenceLow.toFixed(0)}–{day.confidenceHigh.toFixed(0)}
                  </p>
                  {day.factors.length > 0 && (
                    <p className="text-[9px] text-[var(--color-accent-primary)] mt-1 truncate" title={day.factors.join(", ")}>
                      {day.factors[0]}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[var(--color-card-bg)] rounded-2xl p-8 text-center text-[var(--color-text-secondary)]" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
            <p>{t("common.noData")}</p>
          </div>
        )}
      </section>

      {/* KPI Benchmarks */}
      <section>
        <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)] mb-4" style={{ fontFamily: "var(--font-heading)" }}>
          <Target size={20} className="inline mr-2 opacity-60" />
          {t("analytics.kpiBenchmarks")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BENCHMARKS.map((b) => (
            <BenchmarkGauge
              key={b.id}
              label={b.label}
              value={kpis[b.id] ?? null}
              target={b.target}
              unit={b.unit}
              good={b.good}
              tip={b.tip}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
