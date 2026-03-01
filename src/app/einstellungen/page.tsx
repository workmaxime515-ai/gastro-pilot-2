"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/i18n";

// ─── Types ─────────────────────────────────────────────────────

interface ShopSettings {
  id: string;
  shopName: string;
  openTime: string;
  closeTime: string;
  fixedCostsDaily: number;
  strategyMode: "balanced" | "profit" | "waste" | "stress";
  language: string;
  darkMode: string;
  highContrast: boolean;
  fontSize: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  sellPrice: number;
  spoilageHours: number;
  isActive: boolean;
}

interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
}

const STRATEGY_MODES = [
  { id: "balanced" as const, name: "Balanced", desc: "Ausgewogene Empfehlungen" },
  { id: "profit" as const, name: "Max Profit", desc: "Umsatz maximieren" },
  { id: "waste" as const, name: "Low Waste", desc: "Verschwendung minimieren" },
  { id: "stress" as const, name: "Low Stress", desc: "Stresslevel reduzieren" },
];

const CATEGORY_LABELS: Record<string, string> = {
  coffee: "Kaffee",
  bakery: "Gebäck",
  lunch: "Lunch",
  drinks: "Getränke",
  other: "Sonstiges",
};

const ROLE_OPTIONS = [
  { value: "technician", label: "Techniker" },
  { value: "electrician", label: "Elektriker" },
  { value: "supplier", label: "Lieferant" },
  { value: "landlord", label: "Vermieter" },
  { value: "backup_staff", label: "Springer" },
  { value: "other", label: "Sonstiges" },
];

const APP_VERSION = "0.1.0";

// ─── Skeleton ─────────────────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="mb-4 h-6 w-48 rounded bg-text-secondary/20 dark:bg-dark-text-secondary/20" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-card bg-text-secondary/10 dark:bg-dark-text-secondary/20" />
          ))}
        </div>
      </div>
      <div>
        <div className="mb-4 h-6 w-40 rounded bg-text-secondary/20 dark:bg-dark-text-secondary/20" />
        <div className="h-48 rounded-card bg-text-secondary/10 dark:bg-dark-text-secondary/20" />
      </div>
      <div>
        <div className="mb-4 h-6 w-36 rounded bg-text-secondary/20 dark:bg-dark-text-secondary/20" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-card bg-text-secondary/10 dark:bg-dark-text-secondary/20" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────

export default function EinstellungenPage() {
  const { t, setLocale } = useT();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // Local UI preferences (localStorage)
  const [darkMode, setDarkMode] = useState<"light" | "dark" | "auto">("auto");
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [language, setLanguage] = useState<string>("de");

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, productsRes, contactsRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/products"),
        fetch("/api/emergency-contacts"),
      ]);

      const [settingsJson, productsJson, contactsJson] = await Promise.all([
        settingsRes.json(),
        productsRes.json(),
        contactsRes.json(),
      ]);

      if (settingsRes.ok) setSettings(settingsJson);
      if (productsRes.ok) setProducts(Array.isArray(productsJson) ? productsJson : productsJson.items ?? []);
      if (contactsRes.ok) setContacts(Array.isArray(contactsJson) ? contactsJson : contactsJson.items ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load localStorage preferences
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedDark = localStorage.getItem("gastro-dark-mode") as "light" | "dark" | "auto" | null;
    const storedContrast = localStorage.getItem("gastro-high-contrast") === "true";
    const storedLargeText = localStorage.getItem("gastro-large-text") === "true";
    const storedLang = localStorage.getItem("gastro-language") || "de";
    if (storedDark) setDarkMode(storedDark);
    if (storedContrast) setHighContrast(storedContrast);
    if (storedLargeText) setLargeText(storedLargeText);
    if (storedLang) setLanguage(storedLang);
  }, []);

  // Apply dark mode to html element
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const wantDark = darkMode === "dark" || (darkMode === "auto" && prefersDark);
    if (wantDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // Apply accessibility classes
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (highContrast) root.classList.add("high-contrast");
    else root.classList.remove("high-contrast");
    if (largeText) root.classList.add("text-large");
    else root.classList.remove("text-large");
  }, [highContrast, largeText]);

  const showSaved = (section: string) => {
    setSavedFeedback(section);
    setTimeout(() => setSavedFeedback(null), 2000);
  };

  const saveSettings = async (data: Partial<ShopSettings>) => {
    setSaving("settings");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setSettings(updated);
      showSaved("Shop-Informationen");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  };

  const saveStrategyMode = async (mode: ShopSettings["strategyMode"]) => {
    setSaving("strategy");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyMode: mode }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setSettings(updated);
      showSaved("Strategie");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  };

  const saveProduct = async (product: Partial<Product> & { name: string; category: string; costPrice: number; sellPrice: number }) => {
    setSaving("product");
    try {
      const url = product.id ? "/api/products" : "/api/products";
      const method = product.id ? "PUT" : "POST";
      const body = product.id
        ? { id: product.id, name: product.name, category: product.category, costPrice: product.costPrice, sellPrice: product.sellPrice, isActive: product.isActive }
        : { name: product.name, category: product.category, costPrice: product.costPrice, sellPrice: product.sellPrice, isActive: product.isActive ?? true };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await fetchData();
      setShowProductForm(false);
      setEditingProduct(null);
      showSaved("Produkte");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  };

  const toggleProductActive = async (p: Product) => {
    setSaving(`product-${p.id}`);
    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await fetchData();
      showSaved("Produkte");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  };

  const saveContact = async (contact: { name: string; role: string; phone: string }, id?: string) => {
    setSaving("contact");
    try {
      const url = id ? `/api/emergency-contacts/${id}` : "/api/emergency-contacts";
      const method = id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contact),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await fetchData();
      setShowContactForm(false);
      setEditingContact(null);
      showSaved("Kontakte");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  };

  const deleteContact = async (id: string) => {
    if (!confirm("Kontakt wirklich löschen?")) return;
    setSaving(`contact-${id}`);
    try {
      const res = await fetch(`/api/emergency-contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      await fetchData();
      showSaved("Kontakte");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  };

  const resetTutorial = async () => {
    setSaving("tutorial");
    try {
      localStorage.removeItem("tutorialCompleted");
      const res = await fetch("/api/tutorial/reset", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      showSaved("Tutorial");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  };

  const resetDemoData = async () => {
    if (!confirm("Alle Demo-Daten werden zurückgesetzt. Fortfahren?")) return;
    setSaving("demo");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      await fetchData();
      showSaved("Demo");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  };

  const setLocalPref = (key: string, value: string | boolean) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, String(value));
    if (key === "gastro-dark-mode") setDarkMode(value as "light" | "dark" | "auto");
    if (key === "gastro-high-contrast") setHighContrast(value === true);
    if (key === "gastro-large-text") setLargeText(value === true);
    if (key === "gastro-language") {
      setLanguage(value as string);
      setLocale(value as "de" | "en" | "tr" | "ar" | "fr" | "it" | "es" | "pl" | "zh" | "ja");
    }
    showSaved("Barrierefreiheit");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold text-text-primary dark:text-dark-text">
          {t("einstellungen.title")}
        </h1>
        <SettingsSkeleton />
      </div>
    );
  }

  const currentStrategy = settings?.strategyMode ?? "balanced";

  return (
    <div className="space-y-8 pb-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold text-text-primary dark:text-dark-text">
          {t("einstellungen.title")}
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
          {t("einstellungen.shopInfo")}
        </p>
        {savedFeedback && (
          <div
            className="mt-3 flex items-center gap-2 rounded-card bg-profit/15 px-3 py-2 text-profit"
            role="status"
            aria-live="polite"
          >
            <span>Gespeichert — {savedFeedback}</span>
          </div>
        )}
      </header>

      {/* 1. Strategy Mode Selector */}
      <section
        className="space-y-3"
        aria-labelledby="strategy-title"
      >
        <h2 id="strategy-title" className="font-heading text-lg font-semibold text-text-primary dark:text-dark-text">
          {t("einstellungen.strategy")}
        </h2>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Strategiemodus wählen">
          {STRATEGY_MODES.map((mode) => {
            const isActive = currentStrategy === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => saveStrategyMode(mode.id)}
                disabled={saving === "strategy"}
                className={`relative flex flex-col items-start gap-1 rounded-card border-2 p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 dark:focus:ring-offset-dark-bg ${
                  isActive
                    ? "border-accent bg-accent/10 dark:bg-accent/20"
                    : "border-text-secondary/20 bg-card hover:border-accent/40 dark:border-dark-text-secondary/20 dark:bg-dark-card dark:hover:border-accent/40"
                }`}
                role="radio"
                aria-checked={isActive}
                aria-label={`${mode.name}: ${mode.desc}`}
              >
                <span className="font-medium text-text-primary dark:text-dark-text">{mode.name}</span>
                <span className="text-sm text-text-secondary dark:text-dark-text-secondary">{mode.desc}</span>
                {isActive && (
                  <span className="absolute right-3 top-3 text-accent text-lg" aria-hidden="true">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Shop-Informationen */}
      <ShopInfoSection
        settings={settings}
        saving={saving === "settings"}
        onSave={saveSettings}
      />

      {/* 3. Produkte verwalten */}
      <ProductsSection
        products={products}
        saving={saving}
        showProductForm={showProductForm}
        editingProduct={editingProduct}
        onToggleForm={() => { setShowProductForm(!showProductForm); setEditingProduct(null); }}
        onEdit={(p) => { setEditingProduct(p); setShowProductForm(true); }}
        onSave={saveProduct}
        onToggleActive={toggleProductActive}
        onCloseForm={() => { setShowProductForm(false); setEditingProduct(null); }}
      />

      {/* 4. Notfall-Kontakte */}
      <ContactsSection
        contacts={contacts}
        saving={saving}
        showContactForm={showContactForm}
        editingContact={editingContact}
        onToggleForm={() => { setShowContactForm(!showContactForm); setEditingContact(null); }}
        onEdit={(c) => { setEditingContact(c); setShowContactForm(true); }}
        onSave={saveContact}
        onDelete={deleteContact}
        onCloseForm={() => { setShowContactForm(false); setEditingContact(null); }}
      />

      {/* 5. Accessibility */}
      <AccessibilitySection
        darkMode={darkMode}
        highContrast={highContrast}
        largeText={largeText}
        language={language}
        onDarkMode={setLocalPref.bind(null, "gastro-dark-mode")}
        onHighContrast={setLocalPref.bind(null, "gastro-high-contrast")}
        onLargeText={setLocalPref.bind(null, "gastro-large-text")}
        onLanguage={setLocalPref.bind(null, "gastro-language")}
      />

      {/* 6. Backup & Restore */}
      <BackupSection />

      {/* 7. Über diese App */}
      <AboutSection
        version={APP_VERSION}
        saving={saving}
        onResetTutorial={resetTutorial}
        onResetDemo={resetDemoData}
      />
    </div>
  );
}

// ─── Shop Info Section ───────────────────────────────────────

function ShopInfoSection({
  settings,
  saving,
  onSave,
}: {
  settings: ShopSettings | null;
  saving: boolean;
  onSave: (data: Partial<ShopSettings>) => void;
}) {
  const { t } = useT();
  const [shopName, setShopName] = useState(settings?.shopName ?? "");
  const [fixedCosts, setFixedCosts] = useState(String(settings?.fixedCostsDaily ?? 400));
  const [openTime, setOpenTime] = useState(settings?.openTime ?? "06:00");
  const [closeTime, setCloseTime] = useState(settings?.closeTime ?? "18:00");

  useEffect(() => {
    if (settings) {
      setShopName(settings.shopName);
      setFixedCosts(String(settings.fixedCostsDaily));
      setOpenTime(settings.openTime);
      setCloseTime(settings.closeTime);
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      shopName,
      fixedCostsDaily: parseFloat(fixedCosts) || 0,
      openTime,
      closeTime,
    });
  };

  return (
    <section className="space-y-3" aria-labelledby="shop-info-title">
      <h2 id="shop-info-title" className="font-heading text-lg font-semibold text-text-primary dark:text-dark-text">
        {t("einstellungen.shopInfo")}
      </h2>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label htmlFor="shop-name" className="mb-1 block text-sm font-medium text-text-primary dark:text-dark-text">
            Shop-Name
          </label>
          <input
            id="shop-name"
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="input-field"
            placeholder="z.B. Café Bohne"
            aria-label="Shop-Name"
          />
        </div>
        <div>
          <label htmlFor="fixed-costs" className="mb-1 block text-sm font-medium text-text-primary dark:text-dark-text">
            Tägliche Fixkosten (€)
          </label>
          <input
            id="fixed-costs"
            type="number"
            min="0"
            step="10"
            value={fixedCosts}
            onChange={(e) => setFixedCosts(e.target.value)}
            className="input-field"
            aria-label="Tägliche Fixkosten in Euro"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="open-time" className="mb-1 block text-sm font-medium text-text-primary dark:text-dark-text">
              Öffnung
            </label>
            <input
              id="open-time"
              type="time"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              className="input-field"
              aria-label="Öffnungszeit"
            />
          </div>
          <div>
            <label htmlFor="close-time" className="mb-1 block text-sm font-medium text-text-primary dark:text-dark-text">
              Schließung
            </label>
            <input
              id="close-time"
              type="time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="input-field"
              aria-label="Schließzeit"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full"
          aria-label={t("common.save")}
        >
          {saving ? t("common.loading") : t("common.save")}
        </button>
      </form>
    </section>
  );
}

// ─── Products Section ─────────────────────────────────────────

function ProductsSection({
  products,
  saving,
  showProductForm,
  editingProduct,
  onToggleForm,
  onEdit,
  onSave,
  onToggleActive,
  onCloseForm,
}: {
  products: Product[];
  saving: string | null;
  showProductForm: boolean;
  editingProduct: Product | null;
  onToggleForm: () => void;
  onEdit: (p: Product) => void;
  onSave: (p: Partial<Product> & { name: string; category: string; costPrice: number; sellPrice: number }) => void;
  onToggleActive: (p: Product) => void;
  onCloseForm: () => void;
}) {
  const { t } = useT();
  return (
    <section className="space-y-3" aria-labelledby="products-title">
      <div className="flex items-center justify-between">
        <h2 id="products-title" className="font-heading text-lg font-semibold text-text-primary dark:text-dark-text">
          {t("einstellungen.products")}
        </h2>
        <button
          type="button"
          onClick={onToggleForm}
          className="btn-secondary text-sm"
          aria-label="Neues Produkt hinzufügen"
        >
          + Neues Produkt
        </button>
      </div>

      {(showProductForm || editingProduct) && (
        <ProductForm
          product={editingProduct}
          onSave={onSave}
          onClose={onCloseForm}
          saving={saving === "product"}
        />
      )}

      <div className="space-y-2">
        {products.length === 0 ? (
          <p className="rounded-card bg-card p-4 text-text-secondary dark:bg-dark-card dark:text-dark-text-secondary">
            Keine Produkte. Klicke auf „Neues Produkt“ zum Hinzufügen.
          </p>
        ) : (
          products.map((p) => (
            <div
              key={p.id}
              className={`card flex flex-wrap items-center justify-between gap-2 ${
                !p.isActive ? "opacity-60" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text-primary dark:text-dark-text">{p.name}</p>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                  {CATEGORY_LABELS[p.category] ?? p.category} • EK {p.costPrice.toFixed(2)} € • VK {p.sellPrice.toFixed(2)} €
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(p)}
                  className="text-sm text-accent hover:underline focus:outline-none focus:ring-2 focus:ring-accent rounded"
                  aria-label={`${p.name} bearbeiten`}
                >
                  Bearbeiten
                </button>
                <button
                  type="button"
                  onClick={() => onToggleActive(p)}
                  disabled={saving === `product-${p.id}`}
                  role="switch"
                  aria-checked={p.isActive}
                  aria-label={`${p.name} ${p.isActive ? "deaktivieren" : "aktivieren"}`}
                  className={`relative h-8 w-12 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
                    p.isActive ? "bg-profit" : "bg-text-secondary/30"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                      p.isActive ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ProductForm({
  product,
  onSave,
  onClose,
  saving,
}: {
  product: Product | null;
  onSave: (p: Partial<Product> & { name: string; category: string; costPrice: number; sellPrice: number }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "coffee");
  const [costPrice, setCostPrice] = useState(String(product?.costPrice ?? 0));
  const [sellPrice, setSellPrice] = useState(String(product?.sellPrice ?? 0));

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategory(product.category);
      setCostPrice(String(product.costPrice));
      setSellPrice(String(product.sellPrice));
    } else {
      setName("");
      setCategory("coffee");
      setCostPrice("");
      setSellPrice("");
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(costPrice);
    const sell = parseFloat(sellPrice);
    if (!name.trim() || isNaN(cost) || isNaN(sell)) return;
    onSave({
      id: product?.id,
      name: name.trim(),
      category,
      costPrice: cost,
      sellPrice: sell,
      isActive: product?.isActive ?? true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h3 className="font-medium text-text-primary dark:text-dark-text">
        {product ? "Produkt bearbeiten" : "Neues Produkt"}
      </h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Produktname"
        className="input-field"
        required
        aria-label="Produktname"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="input-field"
        aria-label="Kategorie"
      >
        {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-text-secondary dark:text-dark-text-secondary">EK (€)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            className="input-field"
            required
            aria-label="Einkaufspreis"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-secondary dark:text-dark-text-secondary">VK (€)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            className="input-field"
            required
            aria-label="Verkaufspreis"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? "Speichert…" : "Speichern"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Abbrechen
        </button>
      </div>
    </form>
  );
}

// ─── Contacts Section ────────────────────────────────────────

function ContactsSection({
  contacts,
  saving,
  showContactForm,
  editingContact,
  onToggleForm,
  onEdit,
  onSave,
  onDelete,
  onCloseForm,
}: {
  contacts: EmergencyContact[];
  saving: string | null;
  showContactForm: boolean;
  editingContact: EmergencyContact | null;
  onToggleForm: () => void;
  onEdit: (c: EmergencyContact) => void;
  onSave: (c: { name: string; role: string; phone: string }, id?: string) => void;
  onDelete: (id: string) => void;
  onCloseForm: () => void;
}) {
  const { t } = useT();
  return (
    <section className="space-y-3" aria-labelledby="contacts-title">
      <div className="flex items-center justify-between">
        <h2 id="contacts-title" className="font-heading text-lg font-semibold text-text-primary dark:text-dark-text">
          {t("einstellungen.emergencyContacts")}
        </h2>
        <button
          type="button"
          onClick={onToggleForm}
          className="btn-secondary text-sm"
          aria-label="Neuen Notfall-Kontakt hinzufügen"
        >
          + Kontakt
        </button>
      </div>

      {(showContactForm || editingContact) && (
        <ContactForm
          contact={editingContact}
          onSave={onSave}
          onClose={onCloseForm}
          saving={saving === "contact"}
        />
      )}

      <div className="space-y-2">
        {contacts.length === 0 ? (
          <p className="rounded-card bg-card p-4 text-text-secondary dark:bg-dark-card dark:text-dark-text-secondary">
            Keine Notfall-Kontakte. Klicke auf „+ Kontakt“ zum Hinzufügen.
          </p>
        ) : (
          contacts.map((c) => (
            <div key={c.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-text-primary dark:text-dark-text">{c.name}</p>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                  {ROLE_OPTIONS.find((r) => r.value === c.role)?.label ?? c.role} • {c.phone}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(c)}
                  className="text-sm text-accent hover:underline focus:outline-none focus:ring-2 focus:ring-accent rounded"
                  aria-label={`${c.name} bearbeiten`}
                >
                  Bearbeiten
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(c.id)}
                  disabled={saving === `contact-${c.id}`}
                  className="text-sm text-waste hover:underline focus:outline-none focus:ring-2 focus:ring-waste rounded"
                  aria-label={`${c.name} löschen`}
                >
                  Löschen
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ContactForm({
  contact,
  onSave,
  onClose,
  saving,
}: {
  contact: EmergencyContact | null;
  onSave: (c: { name: string; role: string; phone: string }, id?: string) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(contact?.name ?? "");
  const [role, setRole] = useState(contact?.role ?? "other");
  const [phone, setPhone] = useState(contact?.phone ?? "");

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setRole(contact.role);
      setPhone(contact.phone);
    } else {
      setName("");
      setRole("other");
      setPhone("");
    }
  }, [contact]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    onSave({ name: name.trim(), role, phone: phone.trim() }, contact?.id);
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h3 className="font-medium text-text-primary dark:text-dark-text">
        {contact ? "Kontakt bearbeiten" : "Neuer Kontakt"}
      </h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="input-field"
        required
        aria-label="Name"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="input-field"
        aria-label="Rolle"
      >
        {ROLE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Telefonnummer"
        className="input-field"
        required
        aria-label="Telefonnummer"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? "Speichert…" : "Speichern"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Abbrechen
        </button>
      </div>
    </form>
  );
}

// ─── Accessibility Section ─────────────────────────────────────

function AccessibilitySection({
  darkMode,
  highContrast,
  largeText,
  language,
  onDarkMode,
  onHighContrast,
  onLargeText,
  onLanguage,
}: {
  darkMode: string;
  highContrast: boolean;
  largeText: boolean;
  language: string;
  onDarkMode: (v: "light" | "dark" | "auto") => void;
  onHighContrast: (v: boolean) => void;
  onLargeText: (v: boolean) => void;
  onLanguage: (v: string) => void;
}) {
  const { t } = useT();
  return (
    <section className="space-y-3" aria-labelledby="a11y-title">
      <h2 id="a11y-title" className="font-heading text-lg font-semibold text-text-primary dark:text-dark-text">
        {t("einstellungen.accessibility")}
      </h2>
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-text-primary dark:text-dark-text">Dark Mode</span>
          <select
            value={darkMode}
            onChange={(e) => onDarkMode(e.target.value as "light" | "dark" | "auto")}
            className="input-field w-auto"
            aria-label="Dark Mode"
          >
            <option value="auto">System</option>
            <option value="light">Hell</option>
            <option value="dark">Dunkel</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-primary dark:text-dark-text">Hoher Kontrast</span>
          <button
            type="button"
            onClick={() => onHighContrast(!highContrast)}
            role="switch"
            aria-checked={highContrast}
            aria-label="Hoher Kontrast"
            className={`relative h-8 w-12 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
              highContrast ? "bg-accent" : "bg-text-secondary/30"
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                highContrast ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-primary dark:text-dark-text">Große Schrift</span>
          <button
            type="button"
            onClick={() => onLargeText(!largeText)}
            role="switch"
            aria-checked={largeText}
            aria-label="Große Schrift"
            className={`relative h-8 w-12 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
              largeText ? "bg-accent" : "bg-text-secondary/30"
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                largeText ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-primary dark:text-dark-text">{t("einstellungen.language")}</span>
          <select
            value={language}
            onChange={(e) => onLanguage(e.target.value)}
            className="input-field w-auto"
            aria-label={t("einstellungen.language")}
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
            <option value="tr">Türkçe</option>
            <option value="ar">العربية</option>
            <option value="fr">Français</option>
            <option value="it">Italiano</option>
            <option value="es">Español</option>
            <option value="pl">Polski</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
          </select>
        </div>
      </div>
    </section>
  );
}

// ─── Backup Section ─────────────────────────────────────────

function BackupSection() {
  const [status, setStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    try {
      setStatus("Exportiere...");
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Export fehlgeschlagen");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `coffeeflow-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Export erfolgreich");
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Export Fehler");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setStatus("Importiere...");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setStatus(`Import erfolgreich: ${result.total} Eintraege importiert`);
      } else {
        setStatus(result.error ?? "Import fehlgeschlagen");
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Import Fehler");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <section className="space-y-3" aria-labelledby="backup-title">
      <h2 id="backup-title" className="font-heading text-lg font-semibold text-text-primary dark:text-dark-text">
        Backup &amp; Restore
      </h2>
      <div className="card space-y-3">
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          Sichere deine Daten als JSON-Datei oder stelle sie wieder her.
        </p>
        <button type="button" onClick={handleExport} className="btn-primary w-full">
          Backup herunterladen
        </button>
        <label className="btn-secondary w-full block text-center cursor-pointer">
          {importing ? "Importiere..." : "Backup hochladen"}
          <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={importing} />
        </label>
        {status && (
          <p className="text-sm text-center" style={{ color: status.includes("erfolgreich") ? "var(--color-accent-profit)" : "var(--color-accent-warning)" }}>
            {status}
          </p>
        )}
      </div>
    </section>
  );
}

// ─── About Section ───────────────────────────────────────────

function AboutSection({
  version,
  saving,
  onResetTutorial,
  onResetDemo,
}: {
  version: string;
  saving: string | null;
  onResetTutorial: () => void;
  onResetDemo: () => void;
}) {
  const { t } = useT();
  return (
    <section className="space-y-3" aria-labelledby="about-title">
      <h2 id="about-title" className="font-heading text-lg font-semibold text-text-primary dark:text-dark-text">
        {t("einstellungen.about")}
      </h2>
      <div className="card space-y-4">
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          CoffeeFlow v{version} — Dein täglicher Entscheidungshelfer
        </p>
        <button
          type="button"
          onClick={onResetTutorial}
          disabled={saving === "tutorial"}
          className="btn-secondary w-full"
          aria-label="Tutorial neu starten"
        >
          {saving === "tutorial" ? "Wird zurückgesetzt…" : "Tutorial neu starten"}
        </button>
        <button
          type="button"
          onClick={onResetDemo}
          disabled={saving === "demo"}
          className="btn-secondary w-full border-waste/30 text-waste hover:bg-waste/10"
          aria-label="Demo-Daten zurücksetzen"
        >
          {saving === "demo" ? "Wird zurückgesetzt…" : "Demo-Daten zurücksetzen"}
        </button>
      </div>
    </section>
  );
}
