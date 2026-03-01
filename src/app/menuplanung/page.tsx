"use client";

import { useCallback, useEffect, useState } from "react";
import { UtensilsCrossed, Plus, X, Trash2, Sparkles } from "lucide-react";
import { useT } from "@/i18n";

interface MenuPlanItem {
  id: string;
  productName: string;
  category: string;
  sellPrice: number;
  isNew: boolean;
}

interface MenuPlan {
  id: string;
  name: string;
  season: string;
  startDate: string;
  endDate: string;
  notes: string | null;
  isActive: boolean;
  items: MenuPlanItem[];
}

const SEASONS = [
  { id: "fruehling", label: "Frühling", months: "März — Mai", color: "var(--color-accent-profit)" },
  { id: "sommer", label: "Sommer", months: "Juni — August", color: "var(--color-accent-warning)" },
  { id: "herbst", label: "Herbst", months: "September — November", color: "var(--color-accent-waste)" },
  { id: "winter", label: "Winter", months: "Dezember — Februar", color: "var(--color-accent-stress)" },
];

const SEASON_SUGGESTIONS: Record<string, { name: string; category: string; price: number }[]> = {
  fruehling: [
    { name: "Matcha Latte", category: "drinks", price: 4.5 },
    { name: "Erdbeer-Smoothie", category: "drinks", price: 5.0 },
    { name: "Frühlingsquiche", category: "lunch", price: 6.5 },
    { name: "Blossom Tea", category: "drinks", price: 3.5 },
  ],
  sommer: [
    { name: "Cold Brew", category: "coffee", price: 4.0 },
    { name: "Eiskaffee", category: "coffee", price: 4.5 },
    { name: "Acai Bowl", category: "lunch", price: 8.0 },
    { name: "Wassermelonen-Limonade", category: "drinks", price: 4.0 },
  ],
  herbst: [
    { name: "Pumpkin Spice Latte", category: "coffee", price: 5.0 },
    { name: "Chai Latte", category: "coffee", price: 4.5 },
    { name: "Kürbissuppe", category: "lunch", price: 6.0 },
    { name: "Apfelkuchen", category: "bakery", price: 3.5 },
  ],
  winter: [
    { name: "Heisse Schokolade", category: "drinks", price: 4.0 },
    { name: "Glühwein", category: "drinks", price: 4.5 },
    { name: "Zimtschnecken", category: "bakery", price: 3.0 },
    { name: "Ingwer-Shot", category: "drinks", price: 3.0 },
  ],
};

const CATEGORIES: Record<string, string> = {
  coffee: "Kaffee",
  drinks: "Getränke",
  bakery: "Backwaren",
  lunch: "Lunch",
  other: "Sonstiges",
};

function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month <= 1 || month === 11) return "winter";
  if (month <= 4) return "fruehling";
  if (month <= 7) return "sommer";
  return "herbst";
}

export default function MenuplanungPage() {
  const { t } = useT();
  const [plans, setPlans] = useState<MenuPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSeason, setNewSeason] = useState(getCurrentSeason());
  const [newItems, setNewItems] = useState<{ productName: string; category: string; sellPrice: string; isNew: boolean }[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/menu-plans");
      if (res.ok) { const d = await res.json(); setPlans(Array.isArray(d) ? d : d.items ?? []); }
    } catch { /* non-critical */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const currentSeason = getCurrentSeason();
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/menu-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          season: newSeason,
          items: newItems.filter(i => i.productName.trim()).map(i => ({
            productName: i.productName,
            category: i.category,
            sellPrice: parseFloat(i.sellPrice) || 0,
            isNew: i.isNew,
          })),
        }),
      });
      setShowCreate(false);
      setNewName("");
      setNewItems([]);
      await fetchPlans();
    } catch { /* non-critical */ } finally { setSaving(false); }
  };

  const deletePlan = async (id: string) => {
    try {
      await fetch(`/api/menu-plans?id=${id}`, { method: "DELETE" });
      if (selectedPlanId === id) setSelectedPlanId(null);
      await fetchPlans();
    } catch { /* non-critical */ }
  };

  const toggleActive = async (plan: MenuPlan) => {
    try {
      await fetch("/api/menu-plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: plan.id, isActive: !plan.isActive }),
      });
      await fetchPlans();
    } catch { /* non-critical */ }
  };

  const addSuggestion = (item: { name: string; category: string; price: number }) => {
    setNewItems((prev) => [...prev, { productName: item.name, category: item.category, sellPrice: item.price.toString(), isNew: true }]);
  };

  const addEmptyItem = () => {
    setNewItems((prev) => [...prev, { productName: "", category: "coffee", sellPrice: "", isNew: false }]);
  };

  const removeItem = (index: number) => {
    setNewItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | boolean) => {
    setNewItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  return (
    <div className="space-y-6 pb-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-greeting">{t("menuplanung.title")}</h1>
          <p className="text-meta mt-1">{t("menuplanung.seasonal")}</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-1">
          <Plus size={14} /> Neuer Plan
        </button>
      </header>

      {/* Season Overview */}
      <div className="grid grid-cols-2 gap-3">
        {SEASONS.map((s) => {
          const planCount = plans.filter((p) => p.season === s.id).length;
          return (
            <div
              key={s.id}
              className={`card ${s.id === currentSeason ? "card-interactive" : ""}`}
              style={s.id === currentSeason ? { borderLeft: `4px solid ${s.color}` } : undefined}
            >
              <p className="font-medium flex items-center gap-1.5">
                <UtensilsCrossed size={14} style={{ color: s.color }} />
                {s.label}
              </p>
              <p className="text-meta">{s.months}</p>
              {s.id === currentSeason && (
                <p className="text-xs font-medium mt-1" style={{ color: s.color }}>Aktuelle Saison</p>
              )}
              {planCount > 0 && (
                <p className="text-meta mt-1">{planCount} Plan{planCount > 1 ? "e" : ""}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Plan Form */}
      {showCreate && (
        <form onSubmit={createPlan} className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-section">Neuer Menuplan</h2>
            <button type="button" onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-[rgba(0,0,0,0.04)]" aria-label="Schliessen"><X size={16} /></button>
          </div>

          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="input-field" placeholder="Planname (z.B. Sommerkarte 2026)" required />

          <select value={newSeason} onChange={(e) => setNewSeason(e.target.value)} className="input-field">
            {SEASONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>

          {/* Seasonal Suggestions */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={14} style={{ color: "var(--color-accent-primary)" }} />
              <span className="text-sm font-medium">Saisonale Vorschläge</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SEASON_SUGGESTIONS[newSeason]?.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => addSuggestion(item)}
                  className="btn-ghost btn-sm text-xs"
                  style={{ border: "1px solid rgba(110, 115, 136,0.12)" }}
                >
                  + {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Produkte</span>
              <button type="button" onClick={addEmptyItem} className="btn-ghost btn-sm text-xs">+ Hinzufügen</button>
            </div>
            <div className="space-y-2">
              {newItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={item.productName} onChange={(e) => updateItem(i, "productName", e.target.value)} className="input-field flex-1" placeholder="Produktname" />
                  <select value={item.category} onChange={(e) => updateItem(i, "category", e.target.value)} className="input-field" style={{ width: 120 }}>
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input type="number" value={item.sellPrice} onChange={(e) => updateItem(i, "sellPrice", e.target.value)} className="input-field" style={{ width: 80 }} placeholder="EUR" step="0.5" />
                  <label className="flex items-center gap-1 text-xs text-meta whitespace-nowrap">
                    <input type="checkbox" checked={item.isNew} onChange={(e) => updateItem(i, "isNew", e.target.checked)} /> Neu
                  </label>
                  <button type="button" onClick={() => removeItem(i)} className="p-1 text-meta hover:text-[var(--color-accent-warning)]"><X size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Speichere..." : "Plan erstellen"}</button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">{t("common.cancel")}</button>
          </div>
        </form>
      )}

      {/* Existing Plans */}
      {loading ? (
        <div className="skeleton h-32 rounded-2xl" />
      ) : plans.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <UtensilsCrossed size={24} style={{ color: "var(--color-accent-primary)" }} />
          </div>
          <p className="font-medium">Noch keine Menüpläne</p>
          <p className="text-meta mt-1">Erstelle deinen ersten saisonalen Menuplan.</p>
        </div>
      ) : (
        <section>
          <h2 className="text-section mb-3">Deine Pläne</h2>
          <div className="space-y-2">
            {plans.map((plan) => {
              const seasonInfo = SEASONS.find((s) => s.id === plan.season);
              const isExpanded = selectedPlanId === plan.id;
              return (
                <div key={plan.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPlanId(isExpanded ? null : plan.id)}
                    className={`card card-interactive w-full text-left ${plan.isActive ? "" : "opacity-60"}`}
                    style={plan.isActive ? { borderLeft: `4px solid ${seasonInfo?.color ?? "var(--color-accent-primary)"}` } : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-meta">{seasonInfo?.label} — {plan.items.length} Produkte</p>
                      </div>
                      <span className={`badge ${plan.isActive ? "" : "opacity-50"}`} style={{
                        backgroundColor: plan.isActive ? "color-mix(in srgb, var(--color-accent-profit) 12%, transparent)" : "rgba(110, 115, 136,0.06)",
                        color: plan.isActive ? "var(--color-accent-profit)" : "var(--color-text-secondary)",
                      }}>
                        {plan.isActive ? "Aktiv" : "Inaktiv"}
                      </span>
                    </div>
                  </button>

                  {isExpanded && selectedPlan && (
                    <div className="card mt-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-card-title">{selectedPlan.name}</h3>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => toggleActive(selectedPlan)} className="btn-ghost btn-sm text-xs">
                            {selectedPlan.isActive ? "Deaktivieren" : "Aktivieren"}
                          </button>
                          <button type="button" onClick={() => deletePlan(selectedPlan.id)} className="p-1 text-meta hover:text-[var(--color-accent-warning)]" aria-label="Löschen">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {selectedPlan.notes && <p className="text-meta">{selectedPlan.notes}</p>}

                      {selectedPlan.items.length > 0 ? (
                        <div className="space-y-1">
                          {selectedPlan.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between py-1.5 text-sm">
                              <div className="flex items-center gap-2">
                                <span>{item.productName}</span>
                                {item.isNew && (
                                  <span className="badge" style={{ backgroundColor: "color-mix(in srgb, var(--color-accent-primary) 12%, transparent)", color: "var(--color-accent-primary)" }}>
                                    Neu
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-meta text-xs">{CATEGORIES[item.category] ?? item.category}</span>
                                <span className="text-number">{item.sellPrice.toFixed(2)} EUR</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-meta text-center py-2">Keine Produkte in diesem Plan.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
