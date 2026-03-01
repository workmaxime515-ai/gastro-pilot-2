"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, BarChart3, FileText, Clock, TrendingUp, Trash2, Users, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useT } from "@/i18n";

interface SalesData { date: string; revenue: number; }
interface WeeklyReport { weekStart: string; totalRevenue: number; totalExpenses: number; totalWaste: number; avgDailyRevenue: number; bestDay: string; }
interface ProfitHour { hour: number; avgRevenue: number; avgProfit: number; recommendation: string; }
interface CoachSummary { totalRevenue: number; avgDailyRevenue: number; bestDay: string; worstDay: string; totalWaste: number; topProducts: { name: string; units: number; profit: number }[]; wasteLeaders: { name: string; units: number }[]; laborCost: number; learnings: string[]; }
interface ProductPerf { name: string; totalRevenue: number; marginPercent: number; category: "star" | "cash_cow" | "question_mark" | "dog"; }

type Tab = "weekly" | "monthly" | "performance" | "hours" | "waste" | "labor" | "comparison";

interface ComparisonData {
  period: string;
  current: { label: string; revenue: number; waste: number; laborCost: number; customers: number };
  previous: { label: string; revenue: number; waste: number; laborCost: number; customers: number };
  changes: { revenue: number; waste: number; laborCost: number; customers: number };
}

const TABS: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: "weekly", label: "Woche", icon: BarChart3 },
  { key: "monthly", label: "Monat", icon: TrendingUp },
  { key: "comparison", label: "Vergleich", icon: ArrowUpRight },
  { key: "performance", label: "Produkte", icon: FileText },
  { key: "hours", label: "Stunden", icon: Clock },
  { key: "waste", label: "Waste", icon: Trash2 },
  { key: "labor", label: "Personal", icon: Users },
];

export default function BerichtePage() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("weekly");
  const [weeklyData, setWeeklyData] = useState<WeeklyReport | null>(null);
  const [monthlySales, setMonthlySales] = useState<SalesData[]>([]);
  const [profitHours, setProfitHours] = useState<ProfitHour[]>([]);
  const [coachSummary, setCoachSummary] = useState<CoachSummary | null>(null);
  const [products, setProducts] = useState<ProductPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [laborData, setLaborData] = useState<{ totalCost: number; totalHours: number; monthlyRevenue: number }>({ totalCost: 0, totalHours: 0, monthlyRevenue: 0 });
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [compPeriod, setCompPeriod] = useState<"week" | "month">("week");

  const fetchData = useCallback(async () => {
    try {
      const [wRes, mRes, phRes, csRes, recRes, labRes, revRes] = await Promise.all([
        fetch("/api/reports/weekly").catch((e) => { console.warn("BerichtePage fetch error:", e); return null; }),
        fetch("/api/reports/monthly").catch((e) => { console.warn("BerichtePage fetch error:", e); return null; }),
        fetch("/api/profit-per-hour").catch((e) => { console.warn("BerichtePage fetch error:", e); return null; }),
        fetch("/api/coach-summary").catch((e) => { console.warn("BerichtePage fetch error:", e); return null; }),
        fetch("/api/recipes").catch((e) => { console.warn("BerichtePage fetch error:", e); return null; }),
        fetch("/api/labor").catch((e) => { console.warn("BerichtePage fetch error:", e); return null; }),
        fetch("/api/analytics?type=monthly-revenue").catch((e) => { console.warn("BerichtePage fetch error:", e); return null; }),
      ]);
      if (wRes?.ok) setWeeklyData(await wRes.json());
      if (mRes?.ok) { const d = await mRes.json(); setMonthlySales(Array.isArray(d) ? d : d.items ?? []); }
      if (phRes?.ok) { const d = await phRes.json(); setProfitHours(Array.isArray(d) ? d : d.items ?? []); }
      if (csRes?.ok) {
        const data = await csRes.json();
        if (data.totalRevenue) setCoachSummary(data);
      }
      if (recRes?.ok) {
        const recipes = await recRes.json();
        if (Array.isArray(recipes)) {
          const prods: ProductPerf[] = recipes.map((r: { name: string; sellPrice: number; ingredients?: { quantity: number; costPerUnit: number }[] }) => {
            const cost = (r.ingredients || []).reduce((s: number, i: { quantity: number; costPerUnit: number }) => s + i.quantity * i.costPerUnit, 0);
            const margin = r.sellPrice > 0 ? ((r.sellPrice - cost) / r.sellPrice) * 100 : 0;
            return { name: r.name, totalRevenue: r.sellPrice, marginPercent: margin, category: "star" as const };
          });
          const avgRev = prods.reduce((s, p) => s + p.totalRevenue, 0) / Math.max(1, prods.length);
          const avgMargin = prods.reduce((s, p) => s + p.marginPercent, 0) / Math.max(1, prods.length);
          for (const p of prods) {
            if (p.totalRevenue >= avgRev && p.marginPercent >= avgMargin) p.category = "star";
            else if (p.totalRevenue >= avgRev && p.marginPercent < avgMargin) p.category = "cash_cow";
            else if (p.totalRevenue < avgRev && p.marginPercent >= avgMargin) p.category = "question_mark";
            else p.category = "dog";
          }
          setProducts(prods);
        }
      }
      if (labRes?.ok) {
        const lab = await labRes.json();
        if (Array.isArray(lab)) {
          const totalCost = lab.reduce((s: number, e: { totalCost: number }) => s + e.totalCost, 0);
          const totalHours = lab.reduce((s: number, e: { hoursWorked: number }) => s + e.hoursWorked, 0);
          setLaborData(prev => ({ ...prev, totalCost, totalHours }));
        }
      }
      if (revRes?.ok) {
        const rev = await revRes.json();
        if (rev.totalRevenue) setLaborData(prev => ({ ...prev, monthlyRevenue: rev.totalRevenue }));
      }
    } catch (e) { console.warn("BerichtePage error:", e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch(`/api/analytics/comparison?period=${compPeriod}`)
      .then((r) => r.json())
      .then((d) => { if (d.current) setComparison(d); })
      .catch((e) => console.warn("BerichtePage fetch error:", e));
  }, [compPeriod]);

  const downloadFile = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl; a.download = filename; a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (e) { console.warn("BerichtePage error:", e); }
  };

  const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
    star: { label: "Stars", color: "var(--color-accent-profit)" },
    cash_cow: { label: "Cash Cows", color: "var(--color-accent-primary)" },
    question_mark: { label: "Fragezeichen", color: "var(--color-accent-stress)" },
    dog: { label: "Auslaufmodelle", color: "var(--color-accent-warning)" },
  };

  const laborPercent = laborData.monthlyRevenue > 0 ? (laborData.totalCost / laborData.monthlyRevenue) * 100 : 0;

  return (
    <div className="space-y-6 pb-8">
      <header>
        <h1 className="text-greeting">{t("berichte.title")}</h1>
        <p className="text-meta mt-1">{t("berichte.weeklyReport")} &amp; {t("berichte.monthlyReport")}</p>
      </header>

      {/* Export Buttons */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => downloadFile("/api/export/csv?type=sales", "umsatz-export.csv")} className="btn-secondary btn-sm flex items-center gap-1"><Download size={14} /> CSV</button>
        <button type="button" onClick={() => downloadFile("/api/export/pdf?type=weekly", "wochenbericht.pdf")} className="btn-secondary btn-sm flex items-center gap-1"><FileText size={14} /> Wochen PDF</button>
        <button type="button" onClick={() => downloadFile("/api/export/pdf?type=monthly", "monatsbericht.pdf")} className="btn-secondary btn-sm flex items-center gap-1"><FileText size={14} /> Monat PDF</button>
        <button type="button" onClick={() => downloadFile("/api/export/haccp-pdf", "haccp-bericht.pdf")} className="btn-secondary btn-sm flex items-center gap-1"><FileText size={14} /> HACCP PDF</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`tab-button flex items-center gap-1.5 ${tab === t.key ? "active" : ""}`}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Weekly Tab */}
          {tab === "weekly" && (
            <div className="space-y-4">
              {weeklyData ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="card">
                    <p className="text-meta">Wochenumsatz</p>
                    <p className="text-card-title text-number" style={{ color: "var(--color-accent-profit)" }}>{weeklyData.totalRevenue.toFixed(0)} EUR</p>
                  </div>
                  <div className="card">
                    <p className="text-meta">Ausgaben</p>
                    <p className="text-card-title text-number" style={{ color: "var(--color-accent-waste)" }}>{weeklyData.totalExpenses.toFixed(0)} EUR</p>
                  </div>
                  <div className="card">
                    <p className="text-meta">Tagesschnitt</p>
                    <p className="text-card-title text-number">{weeklyData.avgDailyRevenue.toFixed(0)} EUR</p>
                  </div>
                  <div className="card">
                    <p className="text-meta">Waste-Wert</p>
                    <p className="text-card-title text-number" style={{ color: "var(--color-accent-warning)" }}>{weeklyData.totalWaste.toFixed(0)} EUR</p>
                  </div>
                </div>
              ) : (
                <div className="card empty-state">
                  <div className="empty-state-icon"><BarChart3 size={24} style={{ color: "var(--color-accent-primary)" }} /></div>
                  <p className="font-medium">Nicht genug Daten</p>
                  <p className="text-meta mt-1">Wochenbericht benoetigt mindestens 3 Tage mit Daten.</p>
                </div>
              )}

              {coachSummary && (
                <div className="card space-y-3">
                  <p className="text-sm font-semibold">Wochen-Coach Zusammenfassung</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-meta">Bester Tag:</span> <span className="font-medium">{coachSummary.bestDay}</span></div>
                    <div><span className="text-meta">Schwaechster Tag:</span> <span className="font-medium">{coachSummary.worstDay}</span></div>
                  </div>
                  {coachSummary.topProducts.length > 0 && (
                    <div>
                      <p className="text-meta font-medium mb-1">Top Produkte</p>
                      {coachSummary.topProducts.map((p, i) => (
                        <div key={i} className="flex justify-between text-sm py-0.5">
                          <span>{p.name}</span>
                          <span className="text-number" style={{ color: "var(--color-accent-profit)" }}>+{p.profit.toFixed(0)} EUR</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {coachSummary.learnings.length > 0 && (
                    <div>
                      <p className="text-meta font-medium mb-1">Learnings</p>
                      <ul className="space-y-1 text-sm">
                        {coachSummary.learnings.map((l, i) => <li key={i} className="pl-3 border-l-2" style={{ borderLeftColor: "var(--color-accent-primary)" }}>{l}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Monthly — Horizontal bar chart */}
          {tab === "monthly" && (
            <div className="space-y-4">
              {monthlySales.length > 0 ? (
                <div className="card">
                  <p className="text-sm font-medium mb-3">Tagesumsaetze</p>
                  <div className="space-y-1.5">
                    {(() => {
                      const maxRev = Math.max(...monthlySales.map(s => s.revenue), 1);
                      return monthlySales.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm group">
                          <span className="text-meta w-8 text-number">{new Date(d.date).getDate()}.</span>
                          <div className="flex-1 h-5 rounded" style={{ backgroundColor: "var(--color-track-bg)" }}>
                            <div className="h-full rounded transition-all duration-300" style={{
                              width: `${(d.revenue / maxRev) * 100}%`,
                              backgroundColor: "var(--color-accent-primary)",
                              opacity: 0.7 + (d.revenue / maxRev) * 0.3,
                            }} />
                          </div>
                          <span className="text-number text-meta w-14 text-right opacity-0 group-hover:opacity-100 transition-opacity">{d.revenue.toFixed(0)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              ) : (
                <div className="card empty-state">
                  <div className="empty-state-icon"><TrendingUp size={24} style={{ color: "var(--color-accent-primary)" }} /></div>
                  <p className="font-medium">Keine Monatsdaten</p>
                </div>
              )}
            </div>
          )}

          {/* Product Performance — BCG Matrix */}
          {tab === "performance" && (
            <div className="space-y-3">
              {(["star", "cash_cow", "question_mark", "dog"] as const).map(cat => {
                const items = products.filter(p => p.category === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat} className="card" style={{ borderLeft: `4px solid ${CATEGORY_LABELS[cat].color}` }}>
                    <p className="text-sm font-medium mb-1" style={{ color: CATEGORY_LABELS[cat].color }}>{CATEGORY_LABELS[cat].label}</p>
                    {items.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1">
                        <span>{p.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-track-bg)" }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.marginPercent)}%`, backgroundColor: CATEGORY_LABELS[cat].color }} />
                          </div>
                          <span className="text-number text-meta w-10 text-right">{p.marginPercent.toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              {products.length === 0 && (
                <div className="card empty-state">
                  <div className="empty-state-icon"><FileText size={24} style={{ color: "var(--color-accent-primary)" }} /></div>
                  <p className="font-medium">Keine Rezepte hinterlegt</p>
                </div>
              )}
            </div>
          )}

          {/* Hours — Heatmap style */}
          {tab === "hours" && (
            <div className="space-y-4">
              {profitHours.length > 0 ? (
                <>
                  {/* Heatmap Grid */}
                  <div className="card">
                    <p className="text-sm font-medium mb-3">Umsatz-Heatmap nach Stunde</p>
                    <div className="grid grid-cols-6 gap-1">
                      {profitHours.map((h) => {
                        const maxRev = Math.max(...profitHours.map(p => p.avgRevenue), 1);
                        const intensity = h.avgRevenue / maxRev;
                        return (
                          <div key={h.hour} className="flex flex-col items-center gap-0.5 tooltip-wrapper">
                            <div
                              className="w-full aspect-square rounded-lg flex items-center justify-center text-xs font-medium"
                              style={{
                                backgroundColor: `color-mix(in srgb, var(--color-accent-profit) ${Math.round(intensity * 80 + 10)}%, transparent)`,
                                color: intensity > 0.4 ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                              }}
                            >
                              {h.hour}
                            </div>
                            <span className="text-[10px] text-meta text-number">{h.avgRevenue.toFixed(0)}</span>
                            <div className="tooltip-content">{h.avgProfit >= 0 ? "+" : ""}{h.avgProfit.toFixed(0)} EUR Profit</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Profit per hour bars */}
                  <div className="card">
                    <p className="text-sm font-medium mb-3">Profit pro Stunde</p>
                    <div className="space-y-1.5">
                      {profitHours.map((h) => (
                        <div key={h.hour} className="flex items-center gap-3 text-sm">
                          <span className="text-meta w-10 text-number">{h.hour}:00</span>
                          <div className="flex-1 h-4 rounded" style={{ backgroundColor: "var(--color-track-bg)" }}>
                            <div className="h-full rounded transition-all" style={{
                              width: `${Math.min(100, Math.max(5, (h.avgRevenue / Math.max(1, Math.max(...profitHours.map(p => p.avgRevenue)))) * 100))}%`,
                              backgroundColor: h.avgProfit >= 0 ? "var(--color-accent-profit)" : "var(--color-accent-warning)",
                            }} />
                          </div>
                          <span className="text-number text-xs w-16 text-right" style={{ color: h.avgProfit >= 0 ? "var(--color-accent-profit)" : "var(--color-accent-warning)" }}>
                            {h.avgProfit >= 0 ? "+" : ""}{h.avgProfit.toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="card empty-state">
                  <div className="empty-state-icon"><Clock size={24} style={{ color: "var(--color-accent-primary)" }} /></div>
                  <p className="font-medium">Nicht genug Daten</p>
                </div>
              )}
            </div>
          )}

          {/* Waste — Conic gradient ring */}
          {tab === "waste" && (
            <div className="space-y-4">
              {coachSummary && coachSummary.totalWaste > 0 ? (
                <>
                  <div className="card flex items-center gap-6">
                    {/* CSS Conic gradient donut */}
                    <div className="relative" style={{ width: 100, height: 100 }}>
                      <div
                        className="w-full h-full rounded-full"
                        style={{
                          background: `conic-gradient(var(--color-accent-warning) ${Math.min(100, (coachSummary.totalWaste / Math.max(1, coachSummary.totalRevenue)) * 100 * 3.6)}deg, var(--color-track-bg) 0deg)`,
                        }}
                      />
                      <div className="absolute inset-2 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--color-card-bg)" }}>
                        <div className="text-center">
                          <p className="text-number text-lg font-semibold" style={{ color: "var(--color-accent-warning)" }}>
                            {((coachSummary.totalWaste / Math.max(1, coachSummary.totalRevenue)) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Waste-Quote</p>
                      <p className="text-meta">vom Wochenumsatz</p>
                      <p className="text-number mt-1" style={{ color: "var(--color-accent-warning)" }}>{coachSummary.totalWaste.toFixed(0)} EUR</p>
                    </div>
                  </div>

                  {coachSummary.wasteLeaders.length > 0 && (
                    <div className="card">
                      <p className="text-sm font-medium mb-2">Waste-Treiber</p>
                      {coachSummary.wasteLeaders.map((w, i) => {
                        const maxWaste = Math.max(...coachSummary.wasteLeaders.map(wl => wl.units), 1);
                        return (
                          <div key={i} className="flex items-center gap-3 py-1.5">
                            <span className="text-sm flex-1">{w.name}</span>
                            <div className="w-20 h-2 rounded-full" style={{ backgroundColor: "var(--color-track-bg)" }}>
                              <div className="h-full rounded-full" style={{ width: `${(w.units / maxWaste) * 100}%`, backgroundColor: "var(--color-accent-warning)" }} />
                            </div>
                            <span className="text-number text-sm text-meta w-12 text-right">{w.units} Stk</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="card empty-state">
                  <div className="empty-state-icon"><Trash2 size={24} style={{ color: "var(--color-accent-waste)" }} /></div>
                  <p className="font-medium">Keine Waste-Daten</p>
                  <p className="text-meta mt-1">Waste wird im Abend-Flow erfasst.</p>
                </div>
              )}
            </div>
          )}

          {/* Comparison */}
          {tab === "comparison" && (
            <div className="space-y-4">
              <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: "var(--color-track-bg)" }}>
                <button onClick={() => setCompPeriod("week")} className={`tab-button flex-1 ${compPeriod === "week" ? "active" : ""}`}>Woche</button>
                <button onClick={() => setCompPeriod("month")} className={`tab-button flex-1 ${compPeriod === "month" ? "active" : ""}`}>Monat</button>
              </div>

              {comparison ? (
                <>
                  {[
                    { label: "Umsatz", key: "revenue" as const, unit: " EUR", color: "var(--color-accent-profit)", invertBetter: false },
                    { label: "Kunden", key: "customers" as const, unit: "", color: "var(--color-accent-stress)", invertBetter: false },
                    { label: "Waste", key: "waste" as const, unit: " Stk", color: "var(--color-accent-waste)", invertBetter: true },
                    { label: "Personalkosten", key: "laborCost" as const, unit: " EUR", color: "var(--color-accent-warning)", invertBetter: true },
                  ].map((metric) => {
                    const change = comparison.changes[metric.key];
                    const isBetter = metric.invertBetter ? change < 0 : change > 0;
                    const ChangeIcon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
                    return (
                      <div key={metric.key} className="card">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{metric.label}</p>
                          <div className="flex items-center gap-1">
                            <ChangeIcon size={14} style={{ color: isBetter ? "var(--color-accent-profit)" : change === 0 ? "var(--color-text-secondary)" : "var(--color-accent-warning)" }} />
                            <span className="text-number text-sm font-semibold" style={{
                              color: isBetter ? "var(--color-accent-profit)" : change === 0 ? "var(--color-text-secondary)" : "var(--color-accent-warning)",
                            }}>
                              {change > 0 ? "+" : ""}{change}%
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <div>
                            <p className="text-meta">{comparison.current.label}</p>
                            <p className="text-number font-semibold" style={{ color: metric.color }}>
                              {comparison.current[metric.key].toFixed(0)}{metric.unit}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-meta">{comparison.previous.label}</p>
                            <p className="text-number text-meta">{comparison.previous[metric.key].toFixed(0)}{metric.unit}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="card empty-state">
                  <p className="font-medium">Lade Vergleichsdaten...</p>
                </div>
              )}
            </div>
          )}

          {/* Labor — Stacked bars */}
          {tab === "labor" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="card">
                  <p className="text-meta">Personalkosten</p>
                  <p className="text-card-title text-number">{laborData.totalCost.toFixed(0)} EUR</p>
                </div>
                <div className="card">
                  <p className="text-meta">Arbeitsstunden</p>
                  <p className="text-card-title text-number">{laborData.totalHours.toFixed(0)} h</p>
                </div>
              </div>

              {laborData.monthlyRevenue > 0 && (
                <div className="card">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Personal vs. Umsatz</p>
                    <span className="text-number text-sm font-semibold" style={{
                      color: laborPercent > 35 ? "var(--color-accent-warning)" : laborPercent > 30 ? "var(--color-accent-waste)" : "var(--color-accent-profit)",
                    }}>
                      {laborPercent.toFixed(1)}%
                    </span>
                  </div>
                  {/* Stacked bar: labor vs rest */}
                  <div className="h-6 rounded-lg overflow-hidden flex" style={{ backgroundColor: "var(--color-track-bg)" }}>
                    <div className="h-full transition-all duration-300" style={{
                      width: `${Math.min(100, laborPercent)}%`,
                      backgroundColor: laborPercent > 35 ? "var(--color-accent-warning)" : "var(--color-accent-stress)",
                    }} />
                    <div className="h-full flex-1" style={{ backgroundColor: "var(--color-accent-profit)", opacity: 0.3 }} />
                  </div>
                  <div className="flex justify-between text-meta mt-1">
                    <span>Personal: {laborData.totalCost.toFixed(0)} EUR</span>
                    <span>Umsatz: {laborData.monthlyRevenue.toFixed(0)} EUR</span>
                  </div>
                  {laborPercent > 35 && (
                    <p className="text-xs mt-2" style={{ color: "var(--color-accent-warning)" }}>
                      Personalkosten ueber 35% — Schichten ueberpruefen.
                    </p>
                  )}
                </div>
              )}

              {laborData.totalCost === 0 && laborData.monthlyRevenue === 0 && (
                <div className="card empty-state">
                  <div className="empty-state-icon"><Users size={24} style={{ color: "var(--color-accent-stress)" }} /></div>
                  <p className="font-medium">Keine Personaldaten</p>
                  <p className="text-meta mt-1">Personalkosten werden unter Personal erfasst.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
