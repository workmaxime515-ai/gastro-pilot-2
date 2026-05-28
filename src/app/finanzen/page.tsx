"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/i18n";
import { AnimatedNumber } from "@/components/animations";
import { toArray } from "@/lib/api-helpers";

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string | null;
  isRecurring: boolean;
}

interface RevenueGoal {
  id: string;
  period: string;
  targetAmount: number;
  actualAmount: number;
  isActive: boolean;
}

const EXPENSE_CATEGORIES = [
  { value: "miete", label: "Miete" },
  { value: "strom", label: "Strom/Energie" },
  { value: "versicherung", label: "Versicherung" },
  { value: "werbung", label: "Werbung" },
  { value: "reparatur", label: "Reparatur" },
  { value: "personal", label: "Personal" },
  { value: "waren", label: "Wareneinkauf" },
  { value: "sonstiges", label: "Sonstiges" },
];

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface LaborData { totalHours: number; totalCost: number; }

export default function FinanzenPage() {
  const { t } = useT();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [goals, setGoals] = useState<RevenueGoal[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [laborData, setLaborData] = useState<LaborData>({ totalHours: 0, totalCost: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"ledger" | "expenses" | "goals">("ledger");
  const [period, setPeriod] = useState<"day" | "month" | "year">("day");
  const [ledger, setLedger] = useState<{
    revenue: number;
    cogs: number;
    grossProfit: number;
    fixedCosts: number;
    profit: number;
    foodCostPercent: number;
  } | null>(null);
  const [ledgerSales, setLedgerSales] = useState<
    { id: string; quantity: number; revenue: number; cogs: number; soldAt: string; product: { name: string } }[]
  >([]);
  const [showWhy, setShowWhy] = useState(false);

  // Expense form
  const [showExpForm, setShowExpForm] = useState(false);
  const [expDate, setExpDate] = useState(() => new Date().toISOString().split("T")[0]!);
  const [expCategory, setExpCategory] = useState("sonstiges");
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expRecurring, setExpRecurring] = useState(false);
  const [saving, setSaving] = useState(false);

  const month = getCurrentMonth();

  const fetchLedger = useCallback(async () => {
    try {
      const res = await fetch(`/api/manager/finance?period=${period}&sales=true`);
      if (!res.ok) return;
      const data = await res.json();
      setLedger({
        revenue: data.revenue ?? 0,
        cogs: data.cogs ?? 0,
        grossProfit: data.grossProfit ?? 0,
        fixedCosts: data.fixedCosts ?? 0,
        profit: data.profit ?? 0,
        foodCostPercent: data.foodCostPercent ?? 0,
      });
      setLedgerSales(
        Array.isArray(data.sales)
          ? data.sales.map(
              (s: {
                id: string;
                quantity: number;
                revenue: number;
                cogs: number;
                soldAt: string;
                product: { name: string };
              }) => ({
                id: s.id,
                quantity: s.quantity,
                revenue: s.revenue,
                cogs: s.cogs,
                soldAt: s.soldAt,
                product: { name: s.product?.name ?? "—" },
              })
            )
          : []
      );
    } catch {
      /* ignore */
    }
  }, [period]);

  const fetchData = useCallback(async () => {
    try {
      const [expRes, goalRes, salesRes, laborRes] = await Promise.all([
        fetch(`/api/expenses?month=${month}`),
        fetch("/api/revenue-goals"),
        fetch(`/api/analytics?type=monthly-revenue&month=${month}`),
        fetch(`/api/labor?month=${month}`),
      ]);

      if (expRes.ok) {
        const expData = await expRes.json();
        setExpenses(toArray<Expense>(expData));
      }
      if (goalRes.ok) {
        const goalData = await goalRes.json();
        setGoals(toArray<RevenueGoal>(goalData));
      }
      if (salesRes.ok) {
        const data = await salesRes.json();
        setMonthlyRevenue(data.totalRevenue ?? 0);
      }
      if (laborRes.ok) {
        const ldata = await laborRes.json();
        setLaborData({ totalHours: ldata.totalHours ?? 0, totalCost: ldata.totalCost ?? 0 });
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (tab === "ledger") {
      setLoading(true);
      void fetchLedger().finally(() => setLoading(false));
    }
  }, [tab, fetchLedger]);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = monthlyRevenue - totalExpenses;
  const foodCostExpenses = expenses
    .filter((e) => e.category === "waren")
    .reduce((sum, e) => sum + e.amount, 0);
  const foodCostPercent = monthlyRevenue > 0 ? (foodCostExpenses / monthlyRevenue) * 100 : 0;
  const personalExpenses = expenses
    .filter((e) => e.category === "personal")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalLaborCost = personalExpenses + laborData.totalCost;
  const laborCostPercent = monthlyRevenue > 0 ? (totalLaborCost / monthlyRevenue) * 100 : 0;

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount) return;
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: expDate,
          category: expCategory,
          amount: expAmount,
          description: expDesc.trim() || undefined,
          isRecurring: expRecurring,
        }),
      });
      if (!res.ok) throw new Error(t("common.error"));
      setShowExpForm(false);
      setExpAmount("");
      setExpDesc("");
      await fetchData();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const deleteExpense = async (id: string) => {
    try {
      await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
      await fetchData();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6 pb-8">
      <header>
        <h1 className="text-greeting">{t("finanzen.title")}</h1>
        <p className="text-meta mt-1">{t("finanzen.fromSales")}</p>
      </header>

      {/* Tab selector */}
      <div className="card flex p-1 gap-1">
        {(["ledger", "expenses", "goals"] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={`flex-1 rounded-[var(--radius-button)] px-3 py-2 text-sm font-medium transition-colors duration-200 ${
              tab === tabKey
                ? "bg-[var(--color-accent-primary)] text-white"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {tabKey === "ledger"
              ? t("finanzen.fromSales")
              : tabKey === "expenses"
                ? t("finanzen.extrasTab")
                : t("finanzen.revenueGoals")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse h-20" />
          ))}
        </div>
      ) : (
        <>
          {/* Ledger (sales-driven) */}
          {tab === "ledger" && ledger && (
            <div className="space-y-4">
              <div
                role="group"
                aria-label="Zeitraum"
                className="flex flex-wrap gap-2"
              >
                {(["day", "month", "year"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`min-h-[40px] rounded-lg px-3 text-sm font-medium ${
                      period === p
                        ? "bg-accent text-white"
                        : "border border-text-secondary/20 text-text-secondary"
                    }`}
                  >
                    {p === "day"
                      ? t("finanzen.periodDay")
                      : p === "month"
                        ? t("finanzen.periodMonth")
                        : t("finanzen.periodYear")}
                  </button>
                ))}
              </div>

              <div className="card text-center py-6">
                <p className="text-meta">{t("finanzen.netProfit")}</p>
                <p
                  className="text-4xl font-bold text-number mt-1"
                  style={{
                    color:
                      ledger.profit >= 0
                        ? "var(--color-accent-profit)"
                        : "var(--color-accent-warning)",
                  }}
                >
                  <AnimatedNumber value={ledger.profit} suffix=" €" decimals={2} />
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="card">
                  <p className="text-meta">{t("finanzen.revenue")}</p>
                  <p className="text-card-title text-number text-[var(--color-accent-profit)]">
                    {ledger.revenue.toFixed(2)} €
                  </p>
                </div>
                <div className="card">
                  <p className="text-meta">{t("finanzen.cogs")}</p>
                  <p className="text-card-title text-number">
                    {ledger.cogs.toFixed(2)} €
                  </p>
                </div>
                <div className="card">
                  <p className="text-meta">{t("finanzen.grossProfit")}</p>
                  <p className="text-card-title text-number">
                    {ledger.grossProfit.toFixed(2)} €
                  </p>
                </div>
                <div className="card">
                  <p className="text-meta">{t("finanzen.fixedCosts")}</p>
                  <p className="text-card-title text-number">
                    {ledger.fixedCosts.toFixed(2)} €
                  </p>
                </div>
              </div>

              <div className="card">
                <p className="text-meta">{t("finanzen.foodCost")}</p>
                <p className="text-card-title text-number">
                  {ledger.foodCostPercent.toFixed(1)}%
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowWhy(!showWhy)}
                className="btn-secondary w-full min-h-[48px]"
              >
                {t("finanzen.whySales")}
              </button>

              {showWhy && (
                <div className="card space-y-2">
                  {ledgerSales.length === 0 ? (
                    <p className="text-meta">{t("finanzen.noSalesInPeriod")}</p>
                  ) : (
                    ledgerSales.map((s) => (
                      <div
                        key={s.id}
                        className="flex justify-between text-sm border-b border-text-secondary/10 py-2 last:border-0"
                      >
                        <span>
                          {s.quantity}× {s.product.name}
                          <span className="text-meta block text-xs">
                            {new Date(s.soldAt).toLocaleString("de-DE")}
                          </span>
                        </span>
                        <span className="text-number text-right">
                          +{s.revenue.toFixed(2)} €
                          <span className="text-meta block text-xs">
                            COGS {s.cogs.toFixed(2)} €
                          </span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "ledger" && !ledger && !loading && (
            <p className="text-meta">{t("common.noData")}</p>
          )}

          {/* Expenses tab */}
          {tab === "expenses" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-section">{t("finanzen.expenses")}</h2>
                <button
                  type="button"
                  onClick={() => setShowExpForm(!showExpForm)}
                  className="btn-secondary text-sm"
                >
                  + {t("finanzen.addExpense")}
                </button>
              </div>

              {showExpForm && (
                <form onSubmit={saveExpense} className="card space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">{t("common.date")}</label>
                      <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Betrag (EUR)</label>
                      <input type="number" step="0.01" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className="input-field" required />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t("common.category")}</label>
                    <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)} className="input-field">
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t("common.description")}</label>
                    <input type="text" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} className="input-field" placeholder="Optional" />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={expRecurring} onChange={(e) => setExpRecurring(e.target.checked)} />
                    {t("finanzen.recurring")}
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="btn-primary flex-1">
                      {saving ? t("common.loading") : t("common.save")}
                    </button>
                    <button type="button" onClick={() => setShowExpForm(false)} className="btn-secondary">
                      {t("common.cancel")}
                    </button>
                  </div>
                </form>
              )}

              {/* Expense by category summary */}
              <div className="card">
                <p className="text-meta font-semibold uppercase tracking-wide mb-2">{t("common.category")}</p>
                {EXPENSE_CATEGORIES.map((cat) => {
                  const catTotal = expenses.filter((e) => e.category === cat.value).reduce((s, e) => s + e.amount, 0);
                  if (catTotal === 0) return null;
                  return (
                    <div key={cat.value} className="flex justify-between py-1 text-sm">
                      <span>{cat.label}</span>
                      <span className="text-number">{catTotal.toFixed(2)} EUR</span>
                    </div>
                  );
                })}
                <div className="mt-2 border-t pt-2 flex justify-between font-medium" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <span>{t("common.total")}</span>
                  <span className="text-number">{totalExpenses.toFixed(2)} EUR</span>
                </div>
              </div>

              {/* Expense list */}
              <div className="space-y-2">
                {expenses.map((exp) => (
                  <div key={exp.id} className="card flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.label ?? exp.category}
                      </p>
                      {exp.description && <p className="text-meta">{exp.description}</p>}
                      <p className="text-meta">
                        {new Date(exp.date).toLocaleDateString("de-DE")}
                        {exp.isRecurring && " (wiederkehrend)"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-number text-sm font-medium">{exp.amount.toFixed(2)} EUR</span>
                      <button
                        type="button"
                        onClick={() => deleteExpense(exp.id)}
                        className="text-meta hover:text-[var(--color-accent-warning)]"
                        aria-label={t("common.delete")}
                      >
                        x
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goals tab */}
          {tab === "goals" && (
            <div className="space-y-4">
              <h2 className="text-section">Umsatzziele</h2>
              {goals.length === 0 ? (
                <p className="text-meta">{t("common.noData")}</p>
              ) : (
                goals.map((g) => {
                  const progress = g.targetAmount > 0 ? Math.min(100, (monthlyRevenue / g.targetAmount) * 100) : 0;
                  return (
                    <div key={g.id} className="card">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">
                          {g.period === "monthly" ? "Monatsziel" : g.period === "weekly" ? "Wochenziel" : "Tagesziel"}
                        </span>
                        <span className="text-number font-medium">{g.targetAmount.toFixed(0)} EUR</span>
                      </div>
                      <div className="h-2 w-full rounded-full" style={{ backgroundColor: "var(--color-track-bg)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: progress >= 100 ? "var(--color-accent-profit)" : "var(--color-accent-primary)",
                          }}
                        />
                      </div>
                      <p className="text-meta mt-1">{monthlyRevenue.toFixed(0)} / {g.targetAmount.toFixed(0)} EUR ({Math.round(progress)}%)</p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
