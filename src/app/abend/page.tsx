"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useT } from "@/i18n";

// ─── Types ─────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  costPrice?: number;
}

interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  expiresAt: string | null;
  product: Product & { costPrice: number };
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
}

interface SalesEntry {
  productId: string;
  quantity: number;
  revenue: number;
}

const STEPS = [
  "Tagesübersicht",
  "Waste erfassen",
  "Restbestand",
  "Kassenabschluss",
  "Vorschläge bewerten",
  "Abschluss",
] as const;

const REASON_OPTIONS = [
  { value: "Abgelaufen", label: "Abgelaufen" },
  { value: "Beschädigt", label: "Beschädigt" },
  { value: "Nicht verkauft", label: "Nicht verkauft" },
  { value: "Qualität", label: "Qualität" },
  { value: "Sonstiges", label: "Sonstiges" },
] as const;

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-text-secondary/20 ${className}`}
      aria-hidden="true"
    />
  );
}

// ─── Star Rating ─────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex gap-2"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="min-h-[48px] min-w-[48px] rounded-lg border-2 border-accent/30 bg-card p-2 text-2xl transition-colors hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent dark:bg-dark-card"
          aria-label={`${star} von 5 Sternen`}
          aria-pressed={value >= star}
        >
          {value >= star ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

function AbendPageInner() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const targetDateStr =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : formatDate(new Date());

  const [step, setStep] = useState(1);
  const [dayRating, setDayRating] = useState(0);
  const [yesterdayClosed, setYesterdayClosed] = useState<boolean | null>(null);
  const [yesterdayDateStr, setYesterdayDateStr] = useState("");

  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayWasteValue, setTodayWasteValue] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [wasteProductId, setWasteProductId] = useState("");
  const [wasteQuantity, setWasteQuantity] = useState(0);
  const [wasteReason, setWasteReason] = useState("Abgelaufen");
  const [wasteNotes, setWasteNotes] = useState("");
  const [wasteSaving, setWasteSaving] = useState(false);
  const [todayWasteEntries, setTodayWasteEntries] = useState<{id: string; productName: string; quantity: number; reason: string}[]>([]);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryEdits, setInventoryEdits] = useState<Record<string, string>>({});
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventorySaving, setInventorySaving] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionFeedback, setSuggestionFeedback] = useState<Record<string, "done" | "skipped" | "later">>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [cashOpen, setCashOpen] = useState("");
  const [cashClose, setCashClose] = useState("");
  const [cashCard, setCashCard] = useState("");
  const [cashTip, setCashTip] = useState("");
  const [cashSaving, setCashSaving] = useState(false);

  const [closeNotes, setCloseNotes] = useState("");
  const [closing, setClosing] = useState(false);
  const [closeSuccess, setCloseSuccess] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const todayStr = targetDateStr;

  // Yesterday closed check
  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = formatDate(yesterday);
    setYesterdayDateStr(dateStr);
    fetch(`/api/day-close?date=${dateStr}`)
      .then((res) => res.json())
      .then((data) => setYesterdayClosed(data !== null))
      .catch((e) => { console.warn("AbendPage fetch error:", e); setYesterdayClosed(true); });
  }, []);

  // Today's summary (revenue, waste)
  useEffect(() => {
    async function loadSummary() {
      setLoadingSummary(true);
      try {
        const [salesRes, wasteRes] = await Promise.all([
          fetch(`/api/sales?date=${todayStr}`),
          fetch(`/api/waste?date=${todayStr}`),
        ]);
        let revenue = 0;
        if (salesRes.ok) {
          const salesData = await salesRes.json();
          const sales: SalesEntry[] = Array.isArray(salesData) ? salesData : salesData.items ?? [];
          revenue = sales.reduce((s, e) => s + e.revenue, 0);
        }
        let wasteValue = 0;
        if (wasteRes.ok) {
          const waste = await wasteRes.json();
          wasteValue = waste.totalValue ?? 0;
        }
        setTodayRevenue(revenue);
        setTodayWasteValue(wasteValue);
      } catch (e) {
        console.warn("AbendPage error:", e);
        setErrorMessage("Daten konnten nicht geladen werden.");
      } finally {
        setLoadingSummary(false);
      }
    }
    loadSummary();
  }, [todayStr]);

  // Products for waste
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : data.items ?? [];
        setProducts(items.filter((p: Product & { isActive?: boolean }) => p.isActive !== false));
      })
      .catch((e) => console.warn("AbendPage fetch error:", e));
  }, []);

  // Fetch today's waste entries
  useEffect(() => {
    fetch(`/api/waste?date=${todayStr}`)
      .then((res) => res.json())
      .then((data) => {
        const entries = data.items ?? data.entries ?? [];
        setTodayWasteEntries(
          entries.map((e: { id: string; product?: { name: string }; quantity: number; reason: string }) => ({
            id: e.id,
            productName: e.product?.name ?? "Unbekannt",
            quantity: e.quantity,
            reason: e.reason,
          }))
        );
      })
      .catch((e) => console.warn("Waste entries fetch:", e));
  }, [todayStr]);

  // Inventory for step 3
  useEffect(() => {
    if (step !== 3) return;
    setLoadingInventory(true);
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((raw) => {
        const data: InventoryItem[] = Array.isArray(raw) ? raw : raw.items ?? [];
        setInventory(data);
        const edits: Record<string, string> = {};
        data.forEach((inv: InventoryItem) => {
          edits[inv.productId] = String(inv.quantity);
        });
        setInventoryEdits(edits);
      })
      .catch(() => setErrorMessage("Inventar konnte nicht geladen werden."))
      .finally(() => setLoadingInventory(false));
  }, [step]);

  const saveCashCount = useCallback(async () => {
    setCashSaving(true);
    try {
      await fetch("/api/cash-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: todayStr,
          openAmount: cashOpen,
          closeAmount: cashClose,
          cardTotal: cashCard,
          tipTotal: cashTip,
        }),
      });
    } catch (e) { console.warn("AbendPage error:", e); }
    finally { setCashSaving(false); }
  }, [todayStr, cashOpen, cashClose, cashCard, cashTip]);

  // Suggestions for step 5
  useEffect(() => {
    if (step !== 5) return;
    setLoadingSuggestions(true);
    fetch("/api/suggestions")
      .then((res) => res.json())
      .then((data) => {
        setSuggestions(data.suggestions ?? []);
      })
      .catch(() => {
        setErrorMessage("Vorschläge konnten nicht geladen werden.");
        setSuggestions([]);
      })
      .finally(() => setLoadingSuggestions(false));
  }, [step]);

  const saveWaste = useCallback(async () => {
    if (!wasteProductId || wasteQuantity <= 0) return;
    setWasteSaving(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: wasteProductId,
          quantity: wasteQuantity,
          reason: wasteNotes.trim() ? `${wasteReason}: ${wasteNotes}` : wasteReason,
          date: todayStr,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      const prod = products.find((p) => p.id === wasteProductId);
      const wasteValue = (prod?.costPrice ?? 0) * wasteQuantity;
      setTodayWasteValue((v) => v + wasteValue);
      setTodayWasteEntries((prev) => [
        ...prev,
        {
          id: data.id ?? `temp-${Date.now()}`,
          productName: prod?.name ?? "Unbekannt",
          quantity: wasteQuantity,
          reason: wasteNotes.trim() ? `${wasteReason}: ${wasteNotes}` : wasteReason,
        },
      ]);
      setWasteProductId("");
      setWasteQuantity(0);
      setWasteNotes("");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Fehler");
    } finally {
      setWasteSaving(false);
    }
  }, [wasteProductId, wasteQuantity, wasteReason, wasteNotes, todayStr, products]);

  const saveInventory = useCallback(async () => {
    const toUpdate = Object.entries(inventoryEdits).filter(([pid, val]) => {
      const inv = inventory.find((i) => i.productId === pid);
      if (!inv) return false;
      const parsed = parseFloat(val);
      return !isNaN(parsed) && parsed !== inv.quantity;
    });
    if (toUpdate.length === 0) return;

    setInventorySaving(true);
    setErrorMessage("");
    try {
      for (const [productId, val] of toUpdate) {
        const res = await fetch("/api/inventory", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, quantity: parseFloat(val) }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Fehler");
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Fehler");
    } finally {
      setInventorySaving(false);
    }
  }, [inventory, inventoryEdits]);

  const sendSuggestionFeedback = useCallback(
    async (suggestionId: string, action: "done" | "skipped" | "later") => {
      setSuggestionFeedback((prev) => ({ ...prev, [suggestionId]: action }));
      try {
        await fetch("/api/suggestions/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suggestionId, action }),
        });
      } catch (e) {
        console.warn("AbendPage error:", e);
        setSuggestionFeedback((prev) => {
          const next = { ...prev };
          delete next[suggestionId];
          return next;
        });
      }
    },
    []
  );

  const closeDay = useCallback(async () => {
    setClosing(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/day-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: todayStr,
          totalRevenue: todayRevenue,
          totalWaste: todayWasteValue,
          totalCosts: 0,
          dayRating,
          notes: closeNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setCloseSuccess(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Tag konnte nicht abgeschlossen werden.");
      setClosing(false);
    }
  }, [todayStr, todayRevenue, todayWasteValue, dayRating, closeNotes]);

  // Re-fetch waste after step 2
  useEffect(() => {
    if (step === 6 || step === 5) {
      fetch(`/api/waste?date=${todayStr}`)
        .then((res) => res.json())
        .then((data) => setTodayWasteValue(data.totalValue ?? 0))
        .catch((e) => console.warn("AbendPage fetch error:", e));
    }
  }, [step, todayStr]);

  if (closeSuccess) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 pb-24">
        <div
          className="rounded-full bg-profit/20 p-4 text-5xl"
          role="status"
          aria-live="polite"
        >
          ✓
        </div>
        <h2 className="font-heading text-2xl font-semibold text-profit">
          {t("abend.checklistComplete")}
        </h2>
        <p className="text-center text-text-secondary dark:text-dark-text-secondary">
          Gute Arbeit! Bis morgen.
        </p>
        {/* Subtle checkmark animation */}
        <div className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-accent-profit)" }}>
          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <h1 className="font-heading text-2xl font-semibold text-text-primary dark:text-dark-text">
        {t("abend.title")}
      </h1>
      {dateParam && (
        <p className="text-text-secondary dark:text-dark-text-secondary">
          Abschluss für {targetDateStr}
        </p>
      )}

      {/* Yesterday reminder - only when viewing today */}
      {!dateParam && yesterdayClosed === false && (
        <div
          role="alert"
          className="rounded-lg border border-waste/50 bg-waste/10 p-4"
        >
          <p className="font-medium text-waste">Gestern noch nicht abgeschlossen.</p>
          <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
            Jetzt nachholen?
          </p>
          <button
            type="button"
            onClick={() => (window.location.href = `/abend?date=${yesterdayDateStr}`)}
            className="btn-secondary mt-2 min-h-[44px]"
          >
            Gestern abschließen
          </button>
        </div>
      )}

      {/* Progress */}
      <div aria-label={`Schritt ${step} von 6`} className="flex gap-1">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i + 1 <= step ? "bg-accent" : "bg-text-secondary/30 dark:bg-dark-text-secondary/30"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      {step === 1 && (
        <section aria-labelledby="step1-title" className="space-y-4">
          <h2 id="step1-title" className="font-heading text-lg font-semibold">
            {t("abend.daySummary")}
          </h2>
          {loadingSummary ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="space-y-4 rounded-lg border border-text-secondary/10 bg-card p-4 dark:border-dark-text-secondary/10 dark:bg-dark-card">
              <div>
                <span className="text-text-secondary dark:text-dark-text-secondary">{t("abend.todayRevenue")}: </span>
                <span className="text-xl font-semibold">{todayRevenue.toFixed(2)} €</span>
              </div>
              <div>
                <label htmlFor="day-rating" className="block font-medium">
                  Wie war der Tag?
                </label>
                <StarRating
                  value={dayRating}
                  onChange={setDayRating}
                  ariaLabel="Bewertung des Tages von 1 bis 5 Sternen"
                />
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setStep(2)}
            className="btn-primary w-full min-h-[52px]"
          >
            {t("common.next")}
          </button>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="step2-title" className="space-y-4">
          <h2 id="step2-title" className="font-heading text-lg font-semibold">
            Schritt 2: {t("eingabe.wasteEntry")}
          </h2>
          <div className="space-y-3 rounded-lg border border-text-secondary/10 bg-card p-4 dark:border-dark-text-secondary/10 dark:bg-dark-card">
            <div>
              <label htmlFor="abend-waste-product" className="mb-1 block text-sm font-medium">
                {t("eingabe.product")}
              </label>
              <select
                id="abend-waste-product"
                value={wasteProductId}
                onChange={(e) => setWasteProductId(e.target.value)}
                className="input-field min-h-[44px]"
                aria-label="Produkt für Verschwendung"
              >
                <option value="">— Auswählen —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="abend-waste-qty" className="mb-1 block text-sm font-medium">
                {t("eingabe.wasteAmount")}
              </label>
              <input
                id="abend-waste-qty"
                type="number"
                min={0}
                value={wasteQuantity || ""}
                onChange={(e) => setWasteQuantity(parseInt(e.target.value, 10) || 0)}
                className="input-field min-h-[44px]"
                aria-label="Menge"
              />
            </div>
            <div>
              <label htmlFor="abend-waste-reason" className="mb-1 block text-sm font-medium">
                {t("eingabe.wasteReason")}
              </label>
              <select
                id="abend-waste-reason"
                value={wasteReason}
                onChange={(e) => setWasteReason(e.target.value)}
                className="input-field min-h-[44px]"
                aria-label="Grund"
              >
                {REASON_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="abend-waste-notes" className="mb-1 block text-sm font-medium">
                {t("common.notes")} (optional)
              </label>
              <input
                id="abend-waste-notes"
                type="text"
                value={wasteNotes}
                onChange={(e) => setWasteNotes(e.target.value)}
                placeholder="Zusätzliche Infos…"
                className="input-field min-h-[44px]"
                aria-label="Notizen"
              />
            </div>
            <button
              type="button"
              onClick={saveWaste}
              disabled={wasteSaving || !wasteProductId || wasteQuantity <= 0}
              className="btn-primary min-h-[44px] w-full"
            >
              {wasteSaving ? t("common.save") + "…" : t("eingabe.wasteEntry")}
            </button>
          </div>

          {/* Today's waste entries list */}
          {todayWasteEntries.length > 0 && (
            <div className="card">
              <p className="text-meta font-semibold uppercase tracking-wide mb-2">
                {t("abend.todayWaste")} ({todayWasteEntries.length})
              </p>
              <div className="space-y-2">
                {todayWasteEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-[var(--radius-button)] p-3"
                    style={{ backgroundColor: "rgba(240, 100, 73, 0.06)" }}
                  >
                    <div>
                      <p className="text-sm font-medium">{entry.productName}</p>
                      <p className="text-meta">{entry.quantity}x &middot; {entry.reason}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await fetch(`/api/waste/${entry.id}`, { method: "DELETE" });
                          setTodayWasteEntries((prev) => prev.filter((e) => e.id !== entry.id));
                        } catch (e) { console.warn("Delete waste:", e); }
                      }}
                      className="btn-ghost text-[var(--color-accent-waste)] hover:text-[var(--color-accent-warning)]"
                      aria-label="Eintrag entfernen"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary min-h-[52px] flex-1"
            >
              {t("abend.back")}
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="btn-primary min-h-[52px] flex-1"
            >
              {t("common.next")}
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section aria-labelledby="step3-title" className="space-y-4">
          <h2 id="step3-title" className="font-heading text-lg font-semibold">
            Schritt 3: Restbestand
          </h2>
          {loadingInventory ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-2">
              {inventory.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-text-secondary/10 bg-card p-3 dark:border-dark-text-secondary/10 dark:bg-dark-card"
                >
                  <span className="font-medium">{inv.product.name}</span>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={inventoryEdits[inv.productId] ?? ""}
                    onChange={(e) =>
                      setInventoryEdits((prev) => ({
                        ...prev,
                        [inv.productId]: e.target.value,
                      }))
                    }
                    className="h-12 w-24 rounded-lg border border-text-secondary/20 bg-background px-2 text-center focus:outline-none focus:ring-2 focus:ring-accent dark:bg-dark-bg"
                    aria-label={`${inv.product.name} Bestand`}
                  />
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={saveInventory}
            disabled={inventorySaving}
            className="btn-primary w-full min-h-[52px]"
          >
            {inventorySaving ? t("common.save") + "…" : "Restbestand aktualisieren"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-secondary min-h-[52px] flex-1"
            >
              {t("abend.back")}
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="btn-primary min-h-[52px] flex-1"
            >
              {t("common.next")}
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section aria-labelledby="step4-title" className="space-y-4">
          <h2 id="step4-title" className="font-heading text-lg font-semibold">
            Schritt 4: {t("kasse.dayClose")}
          </h2>
          <div className="space-y-3 rounded-lg border border-text-secondary/10 bg-card p-4 dark:border-dark-text-secondary/10 dark:bg-dark-card">
            <div>
              <label htmlFor="cash-open" className="mb-1 block text-sm font-medium">Kassenbestand Oeffnung (EUR)</label>
              <input id="cash-open" type="number" step="0.01" value={cashOpen} onChange={(e) => setCashOpen(e.target.value)} className="input-field min-h-[44px]" placeholder="0.00" />
            </div>
            <div>
              <label htmlFor="cash-close" className="mb-1 block text-sm font-medium">Kassenbestand Schluss (EUR)</label>
              <input id="cash-close" type="number" step="0.01" value={cashClose} onChange={(e) => setCashClose(e.target.value)} className="input-field min-h-[44px]" placeholder="0.00" />
            </div>
            <div>
              <label htmlFor="cash-card" className="mb-1 block text-sm font-medium">Kartenzahlungen (EUR)</label>
              <input id="cash-card" type="number" step="0.01" value={cashCard} onChange={(e) => setCashCard(e.target.value)} className="input-field min-h-[44px]" placeholder="0.00" />
            </div>
            <div>
              <label htmlFor="cash-tip" className="mb-1 block text-sm font-medium">Trinkgeld (EUR)</label>
              <input id="cash-tip" type="number" step="0.01" value={cashTip} onChange={(e) => setCashTip(e.target.value)} className="input-field min-h-[44px]" placeholder="0.00" />
            </div>
            {cashOpen && cashClose && (
              <div className="pt-2 border-t" style={{ borderColor: "rgba(110, 115, 136,0.1)" }}>
                <p className="text-sm">Differenz: <span className="font-medium text-number">{((parseFloat(cashClose) || 0) - (parseFloat(cashOpen) || 0) - (parseFloat(cashCard) || 0) - (parseFloat(cashTip) || 0)).toFixed(2)} EUR</span></p>
              </div>
            )}
          </div>
          <button type="button" onClick={saveCashCount} disabled={cashSaving} className="btn-primary w-full min-h-[44px]">
            {cashSaving ? t("common.loading") : t("kasse.dayClose")}
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(3)} className="btn-secondary min-h-[52px] flex-1">{t("abend.back")}</button>
            <button type="button" onClick={() => setStep(5)} className="btn-primary min-h-[52px] flex-1">{t("common.next")}</button>
          </div>
        </section>
      )}

      {step === 5 && (
        <section aria-labelledby="step5-title" className="space-y-4">
          <h2 id="step5-title" className="font-heading text-lg font-semibold">
            Schritt 5: Vorschläge bewerten
          </h2>
          {loadingSuggestions ? (
            <Skeleton className="h-48 w-full" />
          ) : suggestions.length === 0 ? (
            <p className="rounded-lg bg-card p-4 text-text-secondary dark:bg-dark-card dark:text-dark-text-secondary">
              Keine Vorschläge für heute.
            </p>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-text-secondary/10 bg-card p-4 dark:border-dark-text-secondary/10 dark:bg-dark-card"
                >
                  <h3 className="font-medium">{s.title}</h3>
                  <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
                    {s.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => sendSuggestionFeedback(s.id, "done")}
                      disabled={!!suggestionFeedback[s.id]}
                      className={`min-h-[44px] flex-1 rounded-lg border px-3 text-sm font-medium transition-colors ${
                        suggestionFeedback[s.id] === "done"
                          ? "border-profit bg-profit/20 text-profit"
                          : "border-text-secondary/20 hover:bg-text-secondary/5"
                      }`}
                    >
                      {t("suggestions.done")}
                    </button>
                    <button
                      type="button"
                      onClick={() => sendSuggestionFeedback(s.id, "skipped")}
                      disabled={!!suggestionFeedback[s.id]}
                      className={`min-h-[44px] flex-1 rounded-lg border px-3 text-sm font-medium transition-colors ${
                        suggestionFeedback[s.id] === "skipped"
                          ? "border-waste bg-waste/20 text-waste"
                          : "border-text-secondary/20 hover:bg-text-secondary/5"
                      }`}
                    >
                      {t("suggestions.skipped")}
                    </button>
                    <button
                      type="button"
                      onClick={() => sendSuggestionFeedback(s.id, "later")}
                      disabled={!!suggestionFeedback[s.id]}
                      className={`min-h-[44px] flex-1 rounded-lg border px-3 text-sm font-medium transition-colors ${
                        suggestionFeedback[s.id] === "later"
                          ? "border-text-secondary/40 bg-text-secondary/10"
                          : "border-text-secondary/20 hover:bg-text-secondary/5"
                      }`}
                    >
                      {t("suggestions.later")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="btn-secondary min-h-[52px] flex-1"
            >
              {t("abend.back")}
            </button>
            <button
              type="button"
              onClick={() => setStep(6)}
              className="btn-primary min-h-[52px] flex-1"
            >
              {t("common.next")}
            </button>
          </div>
        </section>
      )}

      {step === 6 && (
        <section aria-labelledby="step6-title" className="space-y-4">
          <h2 id="step6-title" className="font-heading text-lg font-semibold">
            Schritt 6: Abschluss
          </h2>
          <div className="space-y-3 rounded-lg border border-text-secondary/10 bg-card p-4 dark:border-dark-text-secondary/10 dark:bg-dark-card">
            <div>
              <span className="text-text-secondary dark:text-dark-text-secondary">{t("common.revenue")}: </span>
              <span className="text-lg font-semibold">{todayRevenue.toFixed(2)} €</span>
            </div>
            <div>
              <span className="text-text-secondary dark:text-dark-text-secondary">{t("home.waste")}: </span>
              <span className="text-lg font-semibold text-waste">{todayWasteValue.toFixed(2)} €</span>
            </div>
            <div>
              <label htmlFor="close-notes" className="mb-1 block font-medium">
                {t("abend.closingNotes")}
              </label>
              <textarea
                id="close-notes"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Besondere Vorkommnisse…"
                rows={3}
                className="input-field w-full resize-none"
                aria-label="Abschluss-Notizen"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={closeDay}
            disabled={closing}
            className="btn-primary w-full min-h-[56px] text-lg"
          >
            {closing ? t("common.loading") : t("abend.submitDayClose")}
          </button>
        </section>
      )}

      {errorMessage && (
        <div role="alert" className="rounded-lg bg-waste/20 p-3 text-waste">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

export default function AbendPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-text-secondary">Laden...</div>}>
      <AbendPageInner />
    </Suspense>
  );
}
