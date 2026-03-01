"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/i18n";
import { useVoiceInput, parseVoiceEntry } from "@/hooks/useVoiceInput";

// ─── Types ─────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  sellPrice: number;
  isActive?: boolean;
}

interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  expiresAt: string | null;
  product: Product;
}

interface SalesEntry {
  productId: string;
  product: Product;
  quantity: number;
  revenue: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  coffee: "Kaffee",
  bakery: "Gebäck",
  lunch: "Lunch",
  drinks: "Getränke",
  other: "Sonstiges",
};

const REASON_OPTIONS = [
  { value: "Abgelaufen", label: "Abgelaufen" },
  { value: "Beschädigt", label: "Beschädigt" },
  { value: "Nicht verkauft", label: "Nicht verkauft" },
  { value: "Qualität", label: "Qualität" },
  { value: "Sonstiges", label: "Sonstiges" },
] as const;

const QUICK_NOTE_CATEGORIES = [
  { value: "allgemein", label: "Allgemein" },
  { value: "verkauf", label: "Verkauf" },
  { value: "personal", label: "Personal" },
  { value: "lager", label: "Lager" },
  { value: "sonstiges", label: "Sonstiges" },
];

// Plausibility: { category, min, max }
const PLAUSIBILITY_RANGES: Record<string, { min: number; max: number }> = {
  coffee: { min: 50, max: 200 },
  bakery: { min: 20, max: 80 },
  lunch: { min: 5, max: 40 },
  drinks: { min: 10, max: 60 },
  other: { min: 5, max: 50 },
};

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Skeleton ───────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-text-secondary/20 ${className}`}
      aria-hidden="true"
    />
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function EingabePage() {
  const { t } = useT();
  const voice = useVoiceInput("de-DE");
  const [tab, setTab] = useState<"Verkäufe" | "Inventar" | "Waste">("Verkäufe");
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);

  const [salesDate, setSalesDate] = useState(() => new Date());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [approximateMode, setApproximateMode] = useState(false);
  const [plausibilityWarnings, setPlausibilityWarnings] = useState<Record<string, boolean>>({});

  const [inventoryEdits, setInventoryEdits] = useState<Record<string, string>>({});
  const [inventorySaving, setInventorySaving] = useState(false);

  const [wasteProductId, setWasteProductId] = useState("");
  const [wasteQuantity, setWasteQuantity] = useState(0);
  const [wasteReason, setWasteReason] = useState("Abgelaufen");
  const [wasteNotes, setWasteNotes] = useState("");
  const [wasteSaving, setWasteSaving] = useState(false);

  const [quickNoteText, setQuickNoteText] = useState("");
  const [quickNoteCategory, setQuickNoteCategory] = useState("allgemein");
  const [quickNoteSaving, setQuickNoteSaving] = useState(false);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [customerCount, setCustomerCount] = useState(0);
  const [customerSaving, setCustomerSaving] = useState(false);

  // Fetch customer count for today
  useEffect(() => {
    const today = formatDate(new Date());
    fetch(`/api/customer-count?date=${today}`)
      .then(r => r.json())
      .then(d => { if (typeof d.total === "number") setCustomerCount(d.total); })
      .catch((e) => console.warn("EingabePage fetch error:", e));
  }, []);

  const incrementCustomer = useCallback(async () => {
    setCustomerSaving(true);
    const today = formatDate(new Date());
    const hour = new Date().getHours();
    try {
      const res = await fetch("/api/customer-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, hour, count: 1 }),
      });
      if (res.ok) setCustomerCount(c => c + 1);
    } catch (e) { console.warn("EingabePage error:", e); }
    finally { setCustomerSaving(false); }
  }, []);

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      setLoadingProducts(true);
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Produkte konnten nicht geladen werden.");
        const raw = await res.json();
        const data: Product[] = Array.isArray(raw) ? raw : raw.items ?? [];
        setProducts(data.filter((p: Product) => p.isActive !== false));
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : t("common.loadFailed"));
      } finally {
        setLoadingProducts(false);
      }
    }
    fetchProducts();
  }, []);

  // Fetch inventory when Inventar tab is active
  useEffect(() => {
    if (tab !== "Inventar") return;
    async function fetchInventory() {
      setLoadingInventory(true);
      try {
        const res = await fetch("/api/inventory");
        if (!res.ok) throw new Error("Inventar konnte nicht geladen werden.");
        const data = await res.json();
        setInventory(data);
        const edits: Record<string, string> = {};
        data.forEach((inv: InventoryItem) => {
          edits[inv.productId] = String(inv.quantity);
        });
        setInventoryEdits(edits);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : t("common.loadFailed"));
      } finally {
        setLoadingInventory(false);
      }
    }
    fetchInventory();
  }, [tab]);

  // Load yesterday's sales for "Wie gestern"
  const loadYesterdaySales = useCallback(async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = formatDate(yesterday);
    setLoadingSales(true);
    try {
      const res = await fetch(`/api/sales?date=${dateStr}`);
      if (!res.ok) throw new Error("Gestern konnten nicht geladen werden.");
      const salesRaw = await res.json();
      const sales: SalesEntry[] = Array.isArray(salesRaw) ? salesRaw : salesRaw.items ?? [];
      const qty: Record<string, number> = {};
      sales.forEach((s) => {
        const pid = s.productId;
        qty[pid] = (qty[pid] ?? 0) + s.quantity;
      });
      setQuantities(qty);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t("common.loadFailed"));
    } finally {
      setLoadingSales(false);
    }
  }, []);

  // Plausibility check
  const checkPlausibility = useCallback(
    (productId: string, qty: number) => {
      const product = products.find((p) => p.id === productId);
      if (!product || qty === 0) return false;
      const range = PLAUSIBILITY_RANGES[product.category] ?? PLAUSIBILITY_RANGES.other;
      const avg = (range.min + range.max) / 2;
      return qty > avg * 3;
    },
    [products]
  );

  const updateQuantity = useCallback(
    (productId: string, delta: number) => {
      setQuantities((prev) => {
        const current = prev[productId] ?? 0;
        const next = Math.max(0, current + delta);
        const rounded = approximateMode ? Math.round(next / 5) * 5 : next;
        const warning = checkPlausibility(productId, rounded);
        setPlausibilityWarnings((w) => (warning ? { ...w, [productId]: true } : { ...w, [productId]: false }));
        return { ...prev, [productId]: rounded };
      });
    },
    [approximateMode, checkPlausibility]
  );

  const setQuantityDirect = useCallback(
    (productId: string, value: number) => {
      const rounded = approximateMode ? Math.round(value / 5) * 5 : Math.max(0, Math.round(value));
      setQuantities((prev) => ({ ...prev, [productId]: rounded }));
      const warning = checkPlausibility(productId, rounded);
      setPlausibilityWarnings((w) => (warning ? { ...w, [productId]: true } : { ...w, [productId]: false }));
    },
    [approximateMode, checkPlausibility]
  );

  // Save sales
  const saveSales = useCallback(async () => {
    const entries = products
      .filter((p) => (quantities[p.id] ?? 0) > 0)
      .map((p) => ({
        productId: p.id,
        quantity: quantities[p.id] ?? 0,
        revenue: (quantities[p.id] ?? 0) * p.sellPrice,
      }));

    if (entries.length === 0) {
      setErrorMessage(t("common.noData"));
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saving");
    setErrorMessage("");
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formatDate(salesDate),
          entries,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("common.saveFailed"));
      setSaveStatus("success");
      setQuantities({});
      setPlausibilityWarnings({});
    } catch (err) {
      setSaveStatus("error");
      setErrorMessage(err instanceof Error ? err.message : t("common.saveFailed"));
    }
  }, [products, quantities, salesDate]);

  // Save inventory updates
  const saveInventory = useCallback(async () => {
    const toUpdate = Object.entries(inventoryEdits).filter(([pid, val]) => {
      const inv = inventory.find((i) => i.productId === pid);
      if (!inv) return false;
      const parsed = parseFloat(val);
      return !isNaN(parsed) && parsed !== inv.quantity;
    });

    if (toUpdate.length === 0) {
      setErrorMessage("Keine Änderungen zum Speichern.");
      return;
    }

    setInventorySaving(true);
    setErrorMessage("");
    try {
      for (const [productId, val] of toUpdate) {
        const res = await fetch("/api/inventory", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            quantity: parseFloat(val),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Inventar-Update fehlgeschlagen");
        }
      }
      const res = await fetch("/api/inventory");
      const data = await res.json();
      setInventory(data);
      setInventoryEdits(
        data.reduce((acc: Record<string, string>, inv: InventoryItem) => {
          acc[inv.productId] = String(inv.quantity);
          return acc;
        }, {})
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setInventorySaving(false);
    }
  }, [inventory, inventoryEdits]);

  // Save waste
  const saveWaste = useCallback(async () => {
    if (!wasteProductId || wasteQuantity <= 0) {
      setErrorMessage("Produkt und Menge erforderlich.");
      return;
    }

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
          date: formatDate(new Date()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Erfassen");
      setWasteProductId("");
      setWasteQuantity(0);
      setWasteNotes("");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setWasteSaving(false);
    }
  }, [wasteProductId, wasteQuantity, wasteReason, wasteNotes]);

  // Save quick note
  const saveQuickNote = useCallback(async () => {
    const text = quickNoteText.trim();
    if (!text) return;

    setQuickNoteSaving(true);
    setErrorMessage("");
    try {
      const noteText = quickNoteCategory !== "allgemein" ? `[${quickNoteCategory}] ${text}` : text;
      const res = await fetch("/api/quick-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: noteText,
          date: formatDate(new Date()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Speichern");
      setQuickNoteText("");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setQuickNoteSaving(false);
    }
  }, [quickNoteText, quickNoteCategory]);

  // Voice input processing
  useEffect(() => {
    if (!voice.isListening && voice.transcript && products.length > 0) {
      const { productName, quantity } = parseVoiceEntry(
        voice.transcript,
        products.map((p) => p.name)
      );
      if (productName && quantity) {
        const product = products.find(
          (p) => p.name.toLowerCase() === productName.toLowerCase()
        );
        if (product) {
          setQuantityDirect(product.id, (quantities[product.id] ?? 0) + quantity);
        }
      }
    }
  }, [voice.isListening, voice.transcript, products]);

  const totalRevenue = products.reduce((sum, p) => sum + (quantities[p.id] ?? 0) * p.sellPrice, 0);

  const productsByCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    const cat = p.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const exp = new Date(expiresAt);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return exp.toDateString() <= tomorrow.toDateString();
  };

  return (
    <div className="space-y-4 pb-8">
      <h1 className="font-heading text-2xl font-semibold text-text-primary dark:text-dark-text">
        {t("nav.dataEntry")}
      </h1>

      {/* Customer Counter */}
      <div className="card flex items-center justify-between">
        <div>
          <p className="text-meta">{t("eingabe.customerCount")}</p>
          <p className="text-card-title text-number" style={{ color: "var(--color-accent-profit)" }}>{customerCount}</p>
        </div>
        <button
          type="button"
          onClick={incrementCustomer}
          disabled={customerSaving}
          className="flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold text-white transition-colors"
          style={{ backgroundColor: "var(--color-accent-primary)" }}
          aria-label="Kunde zaehlen"
        >
          +1
        </button>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Eingabe-Bereiche"
        className="flex rounded-xl bg-text-secondary/10 p-1 dark:bg-dark-card"
      >
        {(["Verkäufe", "Inventar", "Waste"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            className={`min-h-[44px] min-w-[88px] flex-1 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background dark:focus:ring-offset-dark-bg ${
              tab === t ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {tab === "Verkäufe" && (
        <div role="tabpanel" aria-labelledby="tab-verkaufe" className="space-y-4">
          {/* Date + Wie gestern + Ungefähr-Modus */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label htmlFor="sales-date" className="sr-only">
                {t("common.date")}
              </label>
              <input
                id="sales-date"
                type="date"
                value={formatDate(salesDate)}
                onChange={(e) => setSalesDate(new Date(e.target.value))}
                className="input-field min-h-[44px] w-auto"
                aria-label="Datum für Verkäufe"
              />
            </div>
            <button
              type="button"
              onClick={loadYesterdaySales}
              disabled={loadingSales}
              className="btn-secondary min-h-[44px] px-4"
            >
              {loadingSales ? t("common.loading") : t("common.yesterday")}
            </button>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={approximateMode}
                onChange={(e) => setApproximateMode(e.target.checked)}
                className="h-5 w-5 rounded border-text-secondary/30"
                aria-label="Ungefähr-Modus (runde Mengen auf 5er)"
              />
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                Ungefähr-Modus
              </span>
            </label>
            {voice.supported && (
              <button
                type="button"
                onClick={voice.toggle}
                className={`flex min-h-[44px] items-center gap-2 rounded-[var(--radius-button)] px-4 text-sm font-medium transition-all ${
                  voice.isListening
                    ? "bg-[var(--color-accent-waste)] text-white animate-pulse"
                    : "btn-secondary"
                }`}
                aria-label="Spracheingabe"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                {voice.isListening ? voice.transcript || "..." : "Mikrofon"}
              </button>
            )}
          </div>

          {loadingProducts ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(productsByCategory).map(([cat, prods]) => (
                <section key={cat}>
                  <h2 className="mb-2 font-medium text-text-secondary dark:text-dark-text-secondary">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </h2>
                  <div className="space-y-2">
                    {prods.map((product) => {
                      const qty = quantities[product.id] ?? 0;
                      const warn = plausibilityWarnings[product.id];
                      return (
                        <div
                          key={product.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-text-secondary/10 bg-card p-3 dark:border-dark-text-secondary/10 dark:bg-dark-card"
                        >
                          <span className="font-medium">{product.name}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, -1)}
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-text-secondary/20 bg-background text-xl font-bold transition-colors hover:bg-text-secondary/10 focus:outline-none focus:ring-2 focus:ring-accent dark:bg-dark-bg"
                              aria-label={`${product.name} minus 1`}
                            >
                              −
                            </button>
                            {approximateMode ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={0}
                                  max={Math.min(200, (PLAUSIBILITY_RANGES[product.category]?.max ?? 50) * 2)}
                                  step={5}
                                  value={qty}
                                  onChange={(e) => setQuantityDirect(product.id, parseInt(e.target.value, 10))}
                                  className="h-10 w-20 accent-accent"
                                  aria-label={`${product.name} Menge`}
                                />
                                <span
                                  className="min-w-[3ch] rounded-lg px-2 py-1 text-center text-lg font-semibold"
                                  style={{
                                    fontFamily: "var(--font-mono)",
                                    backgroundColor: qty > 0 ? "rgba(240, 160, 96, 0.12)" : "rgba(110, 115, 136, 0.06)",
                                    color: qty > 0 ? "var(--color-accent-primary)" : "var(--color-text-secondary)",
                                  }}
                                >
                                  {qty}
                                </span>
                              </div>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                value={qty}
                                onChange={(e) => setQuantityDirect(product.id, parseInt(e.target.value, 10) || 0)}
                                className="h-12 w-20 rounded-lg border border-text-secondary/20 bg-background px-2 text-center text-lg focus:outline-none focus:ring-2 focus:ring-accent dark:bg-dark-bg"
                                aria-label={`${product.name} Menge`}
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, 1)}
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-text-secondary/20 bg-background text-xl font-bold transition-colors hover:bg-text-secondary/10 focus:outline-none focus:ring-2 focus:ring-accent dark:bg-dark-bg"
                              aria-label={`${product.name} plus 1`}
                            >
                              +
                            </button>
                          </div>
                          {warn && (
                            <div
                              className="w-full rounded bg-waste/20 px-2 py-1 text-sm text-waste"
                              role="alert"
                            >
                              {t("eingabe.plausibilityWarning")}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          <div className="rounded-lg bg-accent/10 p-3 text-right">
            <span className="text-text-secondary dark:text-dark-text-secondary">{t("common.revenue")}: </span>
            <span className="text-xl font-semibold text-accent">
              {totalRevenue.toFixed(2)} €
            </span>
          </div>

          <button
            type="button"
            onClick={saveSales}
            disabled={saveStatus === "saving"}
            className="btn-primary w-full min-h-[52px] text-lg"
          >
            {saveStatus === "saving"
              ? t("common.loading")
              : saveStatus === "success"
                ? t("common.saveSuccess")
                : t("common.save")}
          </button>
        </div>
      )}

      {tab === "Inventar" && (
        <div role="tabpanel" aria-labelledby="tab-inventar" className="space-y-4">
          {loadingInventory ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {inventory.map((inv) => {
                  const expiring = isExpiringSoon(inv.expiresAt);
                  return (
                    <div
                      key={inv.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 ${
                        expiring
                          ? "border-waste/50 bg-waste/5"
                          : "border-text-secondary/10 bg-card dark:border-dark-text-secondary/10 dark:bg-dark-card"
                      }`}
                    >
                      <div>
                        <span className="font-medium">{inv.product.name}</span>
                        {inv.expiresAt && (
                          <p
                            className={`text-xs ${expiring ? "text-waste font-medium" : "text-text-secondary dark:text-dark-text-secondary"}`}
                          >
                            Ablauf: {formatDateDisplay(new Date(inv.expiresAt))}
                          </p>
                        )}
                      </div>
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
                        aria-label={`${inv.product.name} Bestand ändern`}
                      />
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={saveInventory}
                disabled={inventorySaving}
                className="btn-primary w-full min-h-[52px]"
              >
                {inventorySaving ? t("common.update") + "…" : t("common.save")}
              </button>
            </>
          )}
        </div>
      )}

      {tab === "Waste" && (
        <div role="tabpanel" aria-labelledby="tab-waste" className="space-y-4">
          <div>
            <label htmlFor="waste-product" className="mb-1 block text-sm font-medium">
              {t("eingabe.product")}
            </label>
            <select
              id="waste-product"
              value={wasteProductId}
              onChange={(e) => setWasteProductId(e.target.value)}
              className="input-field min-h-[44px]"
              aria-label="Produkt für Verschwendung auswählen"
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
            <label htmlFor="waste-quantity" className="mb-1 block text-sm font-medium">
              {t("eingabe.wasteAmount")}
            </label>
            <input
              id="waste-quantity"
              type="number"
              min={0}
              value={wasteQuantity || ""}
              onChange={(e) => setWasteQuantity(parseInt(e.target.value, 10) || 0)}
              className="input-field min-h-[44px]"
              aria-label="Verschwendete Menge"
            />
          </div>
          <div>
            <label htmlFor="waste-reason" className="mb-1 block text-sm font-medium">
              {t("eingabe.wasteReason")}
            </label>
            <select
              id="waste-reason"
              value={wasteReason}
              onChange={(e) => setWasteReason(e.target.value)}
              className="input-field min-h-[44px]"
              aria-label="Grund der Verschwendung"
            >
              {REASON_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="waste-notes" className="mb-1 block text-sm font-medium">
              {t("common.notes")} (optional)
            </label>
            <input
              id="waste-notes"
              type="text"
              value={wasteNotes}
              onChange={(e) => setWasteNotes(e.target.value)}
              placeholder="Zusätzliche Infos…"
              className="input-field min-h-[44px]"
              aria-label="Optionale Notizen zur Verschwendung"
            />
          </div>
          <button
            type="button"
            onClick={saveWaste}
            disabled={wasteSaving || !wasteProductId || wasteQuantity <= 0}
            className="btn-primary w-full min-h-[52px]"
          >
            {wasteSaving ? t("common.save") + "…" : t("eingabe.wasteEntry")}
          </button>
        </div>
      )}

      {/* Quick Notes - always visible */}
      <section className="mt-8 rounded-lg border border-text-secondary/10 bg-card p-4 dark:border-dark-text-secondary/10 dark:bg-dark-card">
        <h2 className="mb-2 font-medium text-text-primary dark:text-dark-text">
          Schnellnotiz
        </h2>
        <div className="flex gap-2">
          <select
            value={quickNoteCategory}
            onChange={(e) => setQuickNoteCategory(e.target.value)}
            className="input-field min-h-[44px] w-32 shrink-0"
            aria-label="Notiz-Kategorie"
          >
            {QUICK_NOTE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={quickNoteText}
            onChange={(e) => setQuickNoteText(e.target.value)}
            placeholder="Notiz eingeben…"
            className="input-field min-h-[44px] flex-1"
            aria-label="Schnellnotiz"
          />
        </div>
        <button
          type="button"
          onClick={saveQuickNote}
          disabled={quickNoteSaving || !quickNoteText.trim()}
          className="btn-secondary mt-2 min-h-[44px] w-full"
        >
          {quickNoteSaving ? "Speichern…" : "Notiz speichern"}
        </button>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg bg-waste/20 p-3 text-waste"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}
