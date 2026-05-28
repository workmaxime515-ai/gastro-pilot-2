"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/i18n";
import { useVoiceInput, parseVoiceEntry } from "@/hooks/useVoiceInput";
import { useProducts } from "@/hooks/useProducts";
import { toArray } from "@/lib/api-helpers";
import { REASON_OPTIONS } from "@/constants/waste";
import { formatDate, formatDateDisplay } from "@/lib/date";
import { Skeleton } from "@/components/common/Skeleton";
import { CustomerCounter } from "@/app/eingabe/components/CustomerCounter";
import { TrendingUp, Users, Wallet, AlertTriangle, Package } from "lucide-react";
import { QuickNoteSection } from "@/app/eingabe/components/QuickNoteSection";
import type {
  Product as DomainProduct,
  InventoryItem as DomainInventoryItem,
  SalesEntry as DomainSalesEntry,
} from "@/types/domain";

type Product = DomainProduct & {
  category: string;
  costPrice: number;
  sellPrice: number;
};

type InventoryItem = DomainInventoryItem<Product>;
type SalesEntry = DomainSalesEntry<Product>;

type IngredientRow = {
  id: string;
  name: string;
  unit: string;
  stockQty: number;
  minStock: number | null;
  costPerUnit: number;
};

type LedgerEntryRow = {
  id: string;
  ingredientName: string;
  unit: string;
  deltaQty: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
  productName: string | null;
};

type UnitFilter = "all" | "g" | "ml" | "l" | "stk";

const CATEGORY_LABELS: Record<string, string> = {
  coffee: "Kaffee",
  bakery: "Gebäck",
  lunch: "Lunch",
  drinks: "Getränke",
  other: "Sonstiges",
};

// Plausibility: { category, min, max }
const PLAUSIBILITY_RANGES: Record<string, { min: number; max: number }> = {
  coffee: { min: 50, max: 200 },
  bakery: { min: 20, max: 80 },
  lunch: { min: 5, max: 40 },
  drinks: { min: 10, max: 60 },
  other: { min: 5, max: 50 },
};

// ─── Main Page ───────────────────────────────────────────────────

export default function EingabePage() {
  const { t } = useT();
  const voice = useVoiceInput("de-DE");
  const [tab, setTab] = useState<"Verkäufe" | "Inventar" | "Waste">("Verkäufe");
  const {
    products: rawProducts,
    loading: loadingProducts,
    error: productsError,
  } = useProducts();
  const products = rawProducts as Product[];
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);

  const [salesDate, setSalesDate] = useState(() => new Date());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [approximateMode, setApproximateMode] = useState(false);
  const [plausibilityWarnings, setPlausibilityWarnings] = useState<Record<string, boolean>>({});

  const [inventoryEdits, setInventoryEdits] = useState<Record<string, string>>({});
  const [inventorySaving, setInventorySaving] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [ingredientEdits, setIngredientEdits] = useState<Record<string, string>>({});
  const [unitFilter, setUnitFilter] = useState<UnitFilter>("all");
  const [ingredientSaving, setIngredientSaving] = useState(false);
  const [newIngName, setNewIngName] = useState("");
  const [newIngUnit, setNewIngUnit] = useState<"g" | "ml" | "l" | "stk">("g");
  const [newIngStock, setNewIngStock] = useState("");
  const [newIngCost, setNewIngCost] = useState("");
  const [newIngMin, setNewIngMin] = useState("");
  const [addingIngredient, setAddingIngredient] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntryRow[]>([]);

  const [wasteProductId, setWasteProductId] = useState("");
  const [wasteQuantity, setWasteQuantity] = useState(0);
  const [wasteReason, setWasteReason] = useState("Abgelaufen");
  const [wasteNotes, setWasteNotes] = useState("");
  const [wasteSaving, setWasteSaving] = useState(false);
  const [wasteDrafts, setWasteDrafts] = useState<
    { productId: string; productName: string; quantity: number; reason: string }[]
  >([]);

  const [quickNoteText, setQuickNoteText] = useState("");
  const [quickNoteCategory, setQuickNoteCategory] = useState("allgemein");
  const [quickNoteSaving, setQuickNoteSaving] = useState(false);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [customerCount, setCustomerCount] = useState(0);
  const [customerSaving, setCustomerSaving] = useState(false);
  const [dashKpis, setDashKpis] = useState<{
    todayRevenue: number;
    todayCustomers: number;
    netProfit: number;
    todayWaste: number;
    kpiExplain?: {
      customers?: { formula: string; source: string; manualSum: number; quantitySold: number; estimated: number };
      netProfit?: { formula: string };
    };
  } | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [inventoryAlertsTop, setInventoryAlertsTop] = useState<
    { type: string; severity: string; message: string; action?: string }[]
  >([]);

  const refreshDashboardKpis = useCallback(async () => {
    setKpiLoading(true);
    try {
      const [kpisRes, alertsRes] = await Promise.all([
        fetch("/api/dashboard/kpis"),
        fetch("/api/inventory/alerts"),
      ]);
      if (kpisRes.ok) {
        const d = await kpisRes.json();
        if (typeof d.todayCustomers === "number") setCustomerCount(d.todayCustomers);
        setDashKpis({
          todayRevenue: typeof d.todayRevenue === "number" ? d.todayRevenue : 0,
          todayCustomers: typeof d.todayCustomers === "number" ? d.todayCustomers : 0,
          netProfit: typeof d.netProfit === "number" ? d.netProfit : (d.costSnapshot?.netProfit ?? d.costSnapshot?.grossAfterCosts ?? 0),
          todayWaste: typeof d.todayWaste === "number" ? d.todayWaste : 0,
          kpiExplain: d.kpiExplain,
        });
      }
      if (alertsRes.ok) {
        const ad = await alertsRes.json();
        const alerts = toArray<{ type: string; severity: string; message: string; action?: string }>(ad.alerts);
        setInventoryAlertsTop(alerts.slice(0, 4));
      }
    } catch (e) {
      console.warn("EingabePage KPI fetch error:", e);
    } finally {
      setKpiLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDashboardKpis();
  }, [refreshDashboardKpis]);

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
      if (res.ok) await refreshDashboardKpis();
    } catch (e) {
      console.warn("EingabePage error:", e);
    } finally {
      setCustomerSaving(false);
    }
  }, [refreshDashboardKpis]);

  useEffect(() => {
    if (productsError) {
      setErrorMessage(productsError);
    }
  }, [productsError]);

  // Fetch ingredients when Inventar tab is active
  useEffect(() => {
    if (tab !== "Inventar") return;
    async function fetchIngredients() {
      setLoadingInventory(true);
      try {
        const qs = unitFilter !== "all" ? `?unit=${unitFilter}` : "";
        const [ingRes, ledgerRes] = await Promise.all([
          fetch(`/api/ingredients${qs}`),
          fetch("/api/manager/inventory-ledger?limit=15"),
        ]);
        if (!ingRes.ok) throw new Error("Zutaten konnten nicht geladen werden.");
        const data = toArray<IngredientRow>(await ingRes.json());
        setIngredients(data);
        const edits: Record<string, string> = {};
        data.forEach((ing) => {
          edits[ing.id] = String(ing.stockQty);
        });
        setIngredientEdits(edits);
        if (ledgerRes.ok) {
          const ledgerJson = await ledgerRes.json();
          setLedgerEntries(Array.isArray(ledgerJson.entries) ? ledgerJson.entries : []);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : t("common.loadFailed"));
      } finally {
        setLoadingInventory(false);
      }
    }
    fetchIngredients();
    const onChange = () => fetchIngredients();
    window.addEventListener("manager-data-changed", onChange);
    return () => window.removeEventListener("manager-data-changed", onChange);
  }, [tab, unitFilter, t]);

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
      const sales = toArray<SalesEntry>(salesRaw);
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
      void refreshDashboardKpis();
    } catch (err) {
      setSaveStatus("error");
      setErrorMessage(err instanceof Error ? err.message : t("common.saveFailed"));
    }
  }, [products, quantities, salesDate, t, refreshDashboardKpis]);

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
      const raw = await res.json();
      const data = toArray<InventoryItem>(raw);
      setInventory(data);
      setInventoryEdits(
        data.reduce((acc: Record<string, string>, inv: InventoryItem) => {
          acc[inv.productId] = String(inv.quantity);
          return acc;
        }, {})
      );
      void refreshDashboardKpis();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setInventorySaving(false);
    }
  }, [inventory, inventoryEdits, t, refreshDashboardKpis]);

  const saveIngredients = useCallback(async () => {
    const toUpdate = Object.entries(ingredientEdits).filter(([id, val]) => {
      const ing = ingredients.find((i) => i.id === id);
      if (!ing) return false;
      const parsed = parseFloat(val);
      return !isNaN(parsed) && parsed !== ing.stockQty;
    });

    if (toUpdate.length === 0) {
      setErrorMessage("Keine Änderungen zum Speichern.");
      return;
    }

    setIngredientSaving(true);
    setErrorMessage("");
    try {
      for (const [id, val] of toUpdate) {
        const res = await fetch(`/api/ingredients/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stockQty: parseFloat(val) }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Bestand konnte nicht gespeichert werden");
        }
      }
      const qs = unitFilter !== "all" ? `?unit=${unitFilter}` : "";
      const res = await fetch(`/api/ingredients${qs}`);
      const data = toArray<IngredientRow>(await res.json());
      setIngredients(data);
      setIngredientEdits(
        data.reduce((acc: Record<string, string>, ing) => {
          acc[ing.id] = String(ing.stockQty);
          return acc;
        }, {})
      );
      void refreshDashboardKpis();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIngredientSaving(false);
    }
  }, [ingredientEdits, ingredients, unitFilter, t, refreshDashboardKpis]);

  const addIngredient = useCallback(async () => {
    const name = newIngName.trim();
    const stockQty = parseFloat(newIngStock);
    if (!name) {
      setErrorMessage(t("eingabe.ingredientName"));
      return;
    }
    if (isNaN(stockQty) || stockQty < 0) {
      setErrorMessage(t("eingabe.ingredientStock"));
      return;
    }
    setAddingIngredient(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          unit: newIngUnit,
          stockQty,
          costPerUnit: parseFloat(newIngCost) || 0,
          minStock: newIngMin.trim() ? parseFloat(newIngMin) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("common.saveFailed"));
      setNewIngName("");
      setNewIngStock("");
      setNewIngCost("");
      setNewIngMin("");
      const qs = unitFilter !== "all" ? `?unit=${unitFilter}` : "";
      const listRes = await fetch(`/api/ingredients${qs}`);
      const list = toArray<IngredientRow>(await listRes.json());
      setIngredients(list);
      setIngredientEdits(
        list.reduce((acc: Record<string, string>, ing) => {
          acc[ing.id] = String(ing.stockQty);
          return acc;
        }, {})
      );
      void refreshDashboardKpis();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setAddingIngredient(false);
    }
  }, [
    newIngName,
    newIngUnit,
    newIngStock,
    newIngCost,
    newIngMin,
    unitFilter,
    t,
    refreshDashboardKpis,
  ]);

  const addWasteDraft = useCallback(() => {
    if (!wasteProductId || wasteQuantity <= 0) {
      setErrorMessage("Produkt und Menge erforderlich.");
      return;
    }
    if (wasteQuantity > 1000) {
      setErrorMessage("Menge ist zu hoch. Bitte realistischen Wert eintragen.");
      return;
    }
    const prod = products.find((p) => p.id === wasteProductId);
    const reason = wasteNotes.trim() ? `${wasteReason}: ${wasteNotes.trim()}` : wasteReason;
    setWasteDrafts((prev) => [
      ...prev,
      {
        productId: wasteProductId,
        productName: prod?.name ?? "Unbekannt",
        quantity: wasteQuantity,
        reason,
      },
    ]);
    setWasteProductId("");
    setWasteQuantity(0);
    setWasteNotes("");
    setErrorMessage("");
  }, [wasteProductId, wasteQuantity, wasteReason, wasteNotes, products]);

  // Save waste
  const saveWasteDrafts = useCallback(async () => {
    if (wasteDrafts.length === 0) return;
    setWasteSaving(true);
    setErrorMessage("");
    const failed: typeof wasteDrafts = [];
    try {
      for (const item of wasteDrafts) {
        const res = await fetch("/api/waste", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: item.productId,
            quantity: item.quantity,
            reason: item.reason,
            date: formatDate(new Date()),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          failed.push(item);
          console.warn("Waste save failed:", data?.error);
        }
      }
      setWasteDrafts(failed);
      if (failed.length > 0) {
        setErrorMessage(`${failed.length} Waste-Eintraege konnten nicht gespeichert werden.`);
      } else {
        void refreshDashboardKpis();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setWasteSaving(false);
    }
  }, [wasteDrafts, t, refreshDashboardKpis]);

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

  const netCol = (n: number) =>
    n < 0 ? "var(--color-accent-stress)" : n === 0 ? "var(--color-text-secondary)" : "var(--color-accent-profit)";

  return (
    <div className="space-y-4 pb-8">
      <h1 className="font-heading text-2xl font-semibold text-text-primary dark:text-dark-text">
        {t("eingabe.title")}
      </h1>

      <p className="text-xs text-text-secondary dark:text-dark-text-secondary -mt-2">{t("eingabe.kpiHeaderHint")}</p>

      {kpiLoading && !dashKpis ? (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : dashKpis ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-text-secondary/10 bg-card p-3 text-center dark:border-dark-text-secondary/10 dark:bg-dark-card">
            <TrendingUp size={14} className="mx-auto mb-1" style={{ color: "var(--color-accent-profit)" }} />
            <p className="text-lg font-semibold text-number" style={{ color: "var(--color-accent-profit)" }}>
              {Math.round(dashKpis.todayRevenue)}
            </p>
            <p className="text-[10px] text-text-secondary dark:text-dark-text-secondary">{t("common.revenue")}</p>
          </div>
          <div className="rounded-xl border border-text-secondary/10 bg-card p-3 text-center dark:border-dark-text-secondary/10 dark:bg-dark-card">
            <Users size={14} className="mx-auto mb-1" style={{ color: "var(--color-accent-primary)" }} />
            <p className="text-lg font-semibold text-number" style={{ color: "var(--color-accent-primary)" }}>
              {dashKpis.todayCustomers}
            </p>
            <p className="text-[10px] text-text-secondary dark:text-dark-text-secondary">{t("home.customers")}</p>
          </div>
          <div className="rounded-xl border border-text-secondary/10 bg-card p-3 text-center dark:border-dark-text-secondary/10 dark:bg-dark-card">
            <Wallet size={14} className="mx-auto mb-1" style={{ color: netCol(dashKpis.netProfit) }} />
            <p className="text-lg font-semibold text-number" style={{ color: netCol(dashKpis.netProfit) }}>
              {dashKpis.netProfit.toFixed(0)}
            </p>
            <p className="text-[10px] text-text-secondary dark:text-dark-text-secondary">{t("home.netProfitToday")}</p>
          </div>
        </div>
      ) : null}

      {inventoryAlertsTop.length > 0 && (
        <div className="rounded-xl border-l-4 p-3" style={{ borderColor: "var(--color-accent-warning)", backgroundColor: "var(--color-card-bg)" }}>
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle size={14} style={{ color: "var(--color-accent-warning)" }} />
            <p className="text-sm font-medium">{t("eingabe.stockRisks")}</p>
          </div>
          <ul className="space-y-1 text-xs text-text-secondary dark:text-dark-text-secondary">
            {inventoryAlertsTop.map((a, i) => (
              <li key={i} className="flex gap-2">
                <Package size={12} className="mt-0.5 shrink-0" style={{ color: a.severity === "high" ? "var(--color-accent-warning)" : "var(--color-accent-waste)" }} />
                <span>{a.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dashKpis?.kpiExplain && (
        <div className="space-y-2 rounded-xl p-3 text-xs" style={{ backgroundColor: "var(--color-track-bg)" }}>
          <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">{t("eingabe.dataProvenance")}</p>
          <p className="text-text-secondary dark:text-dark-text-secondary">{t("eingabe.dataProvenanceBody")}</p>
          {dashKpis.kpiExplain.customers && (
            <div>
              <p className="font-medium">{t("home.howCustomersCalculated")}</p>
              <p className="text-text-secondary dark:text-dark-text-secondary">{dashKpis.kpiExplain.customers.formula}</p>
            </div>
          )}
          {dashKpis.kpiExplain.netProfit && (
            <div>
              <p className="font-medium">{t("home.howNetProfitCalculated")}</p>
              <p className="text-text-secondary dark:text-dark-text-secondary">{dashKpis.kpiExplain.netProfit.formula}</p>
            </div>
          )}
        </div>
      )}

      {/* Customer Counter */}
      <CustomerCounter
        customerCount={customerCount}
        customerSaving={customerSaving}
        title={t("eingabe.customerCount")}
        incrementAriaLabel={t("common.add")}
        onIncrement={() => {
          void incrementCustomer();
        }}
      />

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
          <div
            role="group"
            aria-label={t("eingabe.unitFilter")}
            className="flex flex-wrap gap-2"
          >
            {(["all", "g", "ml", "l", "stk"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnitFilter(u)}
                className={`min-h-[40px] rounded-lg px-3 text-sm font-medium transition-colors ${
                  unitFilter === u
                    ? "bg-accent text-white"
                    : "border border-text-secondary/20 text-text-secondary dark:text-dark-text-secondary"
                }`}
              >
                {u === "all" ? t("common.all") : u}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-text-secondary/15 p-4 space-y-3 dark:border-dark-text-secondary/15">
            <p className="text-sm font-medium">{t("eingabe.addIngredient")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={newIngName}
                onChange={(e) => setNewIngName(e.target.value)}
                placeholder={t("eingabe.ingredientName")}
                className="input-field min-h-[44px]"
              />
              <select
                value={newIngUnit}
                onChange={(e) => setNewIngUnit(e.target.value as "g" | "ml" | "l" | "stk")}
                className="input-field min-h-[44px]"
                aria-label={t("eingabe.ingredientUnit")}
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="l">l</option>
                <option value="stk">stk</option>
              </select>
              <input
                type="number"
                min={0}
                step="0.1"
                value={newIngStock}
                onChange={(e) => setNewIngStock(e.target.value)}
                placeholder={t("eingabe.ingredientStock")}
                className="input-field min-h-[44px]"
              />
              <input
                type="number"
                min={0}
                step="0.001"
                value={newIngCost}
                onChange={(e) => setNewIngCost(e.target.value)}
                placeholder={t("eingabe.ingredientCost")}
                className="input-field min-h-[44px]"
              />
            </div>
            <button
              type="button"
              onClick={addIngredient}
              disabled={addingIngredient}
              className="btn-primary w-full min-h-[48px]"
            >
              {addingIngredient ? t("common.loading") : t("eingabe.addIngredient")}
            </button>
          </div>

          {loadingInventory ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : ingredients.length === 0 ? (
            <p className="text-meta">{t("common.noData")}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary">
                {t("eingabe.ingredients")}
              </p>
              <div className="space-y-2">
                {ingredients.map((ing) => {
                  const low =
                    ing.minStock != null &&
                    parseFloat(ingredientEdits[ing.id] ?? String(ing.stockQty)) < ing.minStock;
                  return (
                    <div
                      key={ing.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 ${
                        low
                          ? "border-waste/50 bg-waste/5"
                          : "border-text-secondary/10 bg-card dark:border-dark-text-secondary/10 dark:bg-dark-card"
                      }`}
                    >
                      <div>
                        <span className="font-medium">{ing.name}</span>
                        <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                          {ing.unit}
                          {ing.minStock != null
                            ? ` · ${t("eingabe.minStock")}: ${ing.minStock}`
                            : ""}
                        </p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={ingredientEdits[ing.id] ?? ""}
                        onChange={(e) =>
                          setIngredientEdits((prev) => ({
                            ...prev,
                            [ing.id]: e.target.value,
                          }))
                        }
                        className="h-12 w-28 rounded-lg border border-text-secondary/20 bg-background px-2 text-center focus:outline-none focus:ring-2 focus:ring-accent dark:bg-dark-bg"
                        aria-label={`${ing.name} Bestand (${ing.unit})`}
                      />
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={saveIngredients}
                disabled={ingredientSaving}
                className="btn-primary w-full min-h-[52px]"
              >
                {ingredientSaving ? t("common.update") + "…" : t("common.save")}
              </button>

              {ledgerEntries.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary">
                    {t("eingabe.ledgerHistory")}
                  </p>
                  {ledgerEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-text-secondary/10 px-3 py-2 text-sm dark:border-dark-text-secondary/10"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{entry.ingredientName}</span>
                        <span className="text-number">
                          {entry.deltaQty > 0 ? "+" : ""}
                          {entry.deltaQty} {entry.unit}
                        </span>
                      </div>
                      <p className="text-meta text-xs mt-0.5">
                        {entry.reason === "sale" && entry.productName
                          ? `Verkauf: ${entry.productName}`
                          : entry.reason}
                        {" · "}
                        {new Date(entry.createdAt).toLocaleString("de-DE")}
                        {" · "}
                        {entry.balanceAfter} {entry.unit}
                      </p>
                    </div>
                  ))}
                </div>
              )}
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
              disabled={loadingProducts || products.length === 0}
            >
              <option value="">{t("common.selectPlaceholder")}</option>
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
            onClick={addWasteDraft}
            disabled={loadingProducts || products.length === 0 || !wasteProductId || wasteQuantity <= 0}
            className="btn-primary w-full min-h-[52px]"
          >
            Zur Liste hinzufuegen
          </button>
          {!loadingProducts && products.length === 0 && (
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              Keine aktiven Produkte verfügbar. Bitte zuerst Produkte in Einstellungen anlegen.
            </p>
          )}

          {wasteDrafts.length > 0 && (
            <div className="card space-y-2">
              <p className="text-meta font-semibold uppercase tracking-wide">
                Unspeicherte Waste-Eintraege ({wasteDrafts.length})
              </p>
              {wasteDrafts.map((entry, idx) => (
                <div key={`${entry.productId}-${idx}`} className="flex items-center justify-between rounded-[var(--radius-button)] p-3 bg-[var(--color-track-bg)]">
                  <div>
                    <p className="text-sm font-medium">{entry.productName}</p>
                    <p className="text-meta">{entry.quantity}x &middot; {entry.reason}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost text-[var(--color-accent-warning)]"
                    onClick={() => setWasteDrafts((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Entfernen
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => { void saveWasteDrafts(); }}
                disabled={wasteSaving}
                className="btn-secondary w-full min-h-[44px]"
              >
                {wasteSaving ? "Speichert..." : "Waste-Liste speichern"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Notes - always visible */}
      <QuickNoteSection
        quickNoteCategory={quickNoteCategory}
        quickNoteText={quickNoteText}
        quickNoteSaving={quickNoteSaving}
        title={t("common.notes")}
        categoryAriaLabel={t("common.category")}
        inputAriaLabel={t("common.notes")}
        inputPlaceholder={t("common.notes")}
        saveLabel={t("common.save")}
        savingLabel={t("common.loading")}
        onCategoryChange={setQuickNoteCategory}
        onTextChange={setQuickNoteText}
        onSave={() => {
          void saveQuickNote();
        }}
      />

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
