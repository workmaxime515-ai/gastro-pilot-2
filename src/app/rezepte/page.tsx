"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, ChevronDown, Calculator, Lightbulb } from "lucide-react";
import { useT } from "@/i18n";

interface Ingredient {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
}

interface Recipe {
  id: string;
  name: string;
  category: string;
  sellPrice: number;
  servings: number;
  prepTimeMin: number;
  isActive: boolean;
  ingredients: Ingredient[];
  totalCost: number;
  margin: number;
}

const TARGET_MARGINS: Record<string, number> = {
  coffee: 75,
  bakery: 65,
  lunch: 60,
  drinks: 70,
  other: 65,
};

export default function RezeptePage() {
  const { t } = useT();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("coffee");
  const [sellPrice, setSellPrice] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: "", quantity: 0, unit: "g", costPerUnit: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  // What-if simulator state
  const [simRecipeId, setSimRecipeId] = useState<string | null>(null);
  const [simSellPrice, setSimSellPrice] = useState("");
  const [simIngredients, setSimIngredients] = useState<Ingredient[]>([]);

  const fetchRecipes = useCallback(async () => {
    try {
      const res = await fetch("/api/recipes");
      if (res.ok) { const d = await res.json(); setRecipes(Array.isArray(d) ? d : d.items ?? []); }
    } catch (e) {
      console.warn("RezeptePage error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const addIngredient = () =>
    setIngredients([...ingredients, { name: "", quantity: 0, unit: "g", costPerUnit: 0 }]);
  const removeIngredient = (i: number) => setIngredients(ingredients.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: keyof Ingredient, value: string | number) => {
    const updated = [...ingredients];
    updated[i] = { ...updated[i], [field]: value };
    setIngredients(updated);
  };

  const totalCost = ingredients.reduce((s, i) => s + i.quantity * i.costPerUnit, 0);
  const sp = parseFloat(sellPrice) || 0;
  const absoluteMargin = sp - totalCost;
  const marginPercent = sp > 0 ? (absoluteMargin / sp) * 100 : 0;
  const targetMargin = TARGET_MARGINS[category] || 65;
  const recommendedPrice = totalCost > 0 ? totalCost / (1 - targetMargin / 100) : 0;

  // Simulator calculations
  const simTotalCost = simIngredients.reduce((s, i) => s + i.quantity * i.costPerUnit, 0);
  const simSp = parseFloat(simSellPrice) || 0;
  const simAbsoluteMargin = simSp - simTotalCost;
  const simMarginPercent = simSp > 0 ? (simAbsoluteMargin / simSp) * 100 : 0;

  const openSimulator = (r: Recipe) => {
    setSimRecipeId(r.id);
    setSimSellPrice(r.sellPrice.toString());
    setSimIngredients(r.ingredients.map((i) => ({ ...i })));
    setShowSimulator(true);
  };

  const updateSimIngredient = (i: number, field: keyof Ingredient, value: string | number) => {
    const updated = [...simIngredients];
    updated[i] = { ...updated[i], [field]: value };
    setSimIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    try {
      await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          sellPrice,
          ingredients: ingredients.filter((i) => i.name),
        }),
      });
      setShowForm(false);
      setName("");
      setSellPrice("");
      setIngredients([{ name: "", quantity: 0, unit: "g", costPerUnit: 0 }]);
      await fetchRecipes();
    } catch (e) {
      console.warn("RezeptePage error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-greeting">{t("rezepte.title")}</h1>
          <p className="text-meta mt-1">{t("rezepte.margin")} &amp; {t("rezepte.priceRecommendation")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="btn-primary text-sm flex items-center gap-1"
          aria-label={t("rezepte.addRecipe")}
        >
          <Plus size={16} /> {t("rezepte.addRecipe")}
        </button>
      </header>

      {/* New recipe form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-section">{t("rezepte.addRecipe")}</h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Rezeptname"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
              <option value="coffee">Kaffee</option>
              <option value="bakery">Gebäck</option>
              <option value="lunch">Lunch</option>
              <option value="drinks">Getränke</option>
              <option value="other">Sonstiges</option>
            </select>
            <input
              type="number"
              step="0.01"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              className="input-field"
              placeholder="VK (EUR)"
            />
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Zutaten</p>
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input
                  type="text"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, "name", e.target.value)}
                  className="input-field flex-1"
                  placeholder="Zutat"
                />
                <input
                  type="number"
                  step="0.01"
                  value={ing.quantity || ""}
                  onChange={(e) => updateIngredient(i, "quantity", parseFloat(e.target.value) || 0)}
                  className="input-field w-20"
                  placeholder="Menge"
                />
                <select
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                  className="input-field w-16"
                >
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="stk">Stk</option>
                  <option value="kg">kg</option>
                  <option value="l">l</option>
                </select>
                <input
                  type="number"
                  step="0.001"
                  value={ing.costPerUnit || ""}
                  onChange={(e) => updateIngredient(i, "costPerUnit", parseFloat(e.target.value) || 0)}
                  className="input-field w-24"
                  placeholder="EUR/Einh."
                />
                <button type="button" onClick={() => removeIngredient(i)} className="text-[var(--color-accent-warning)]">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addIngredient} className="btn-secondary text-sm mt-1">
              + Zutat
            </button>
          </div>

          {/* Cost/Margin summary */}
          <div className="card p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-meta">Materialkosten</p>
                <p className="text-number font-medium">{totalCost.toFixed(2)} EUR</p>
              </div>
              <div>
                <p className="text-meta">Marge (abs.)</p>
                <p
                  className="text-number font-medium"
                  style={{
                    color: absoluteMargin > 0 ? "var(--color-accent-profit)" : "var(--color-accent-warning)",
                  }}
                >
                  {absoluteMargin.toFixed(2)} EUR
                </p>
              </div>
              <div>
                <p className="text-meta">Marge (%)</p>
                <p
                  className="text-number font-medium"
                  style={{
                    color:
                      marginPercent >= 60
                        ? "var(--color-accent-profit)"
                        : marginPercent >= 40
                          ? "var(--color-accent-primary)"
                          : "var(--color-accent-warning)",
                  }}
                >
                  {marginPercent.toFixed(1)}%
                </p>
              </div>
            </div>
            {/* Price recommendation */}
            {totalCost > 0 && (
              <div
                className="flex items-center gap-2 p-2 rounded-lg mt-2"
                style={{ backgroundColor: "rgba(224, 138, 74,0.08)" }}
              >
                <Lightbulb size={14} style={{ color: "var(--color-accent-primary)" }} />
                <p className="text-sm">
                  <span className="font-medium">{t("rezepte.priceRecommendation")}:</span>{" "}
                  <span className="text-number font-semibold">{recommendedPrice.toFixed(2)} EUR</span>{" "}
                  <span className="text-meta">({t("rezepte.targetMargin")}: {targetMargin}%)</span>
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? t("common.loading") : t("common.save")}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              {t("common.cancel")}
            </button>
          </div>
        </form>
      )}

      {/* What-if Simulator */}
      {showSimulator && simRecipeId && (
        <div className="card space-y-4 border-l-4" style={{ borderLeftColor: "var(--color-accent-stress)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator size={18} style={{ color: "var(--color-accent-stress)" }} />
              <h2 className="text-section">{t("rezepte.whatIf")}</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowSimulator(false)}
              className="btn-secondary text-sm"
              aria-label={t("common.close")}
            >
              {t("common.close")}
            </button>
          </div>
          <p className="text-meta">Aendere Preise oder Zutaten-Kosten und sieh die Auswirkungen sofort.</p>

          <div>
            <label className="text-meta block mb-1">Simulierter Verkaufspreis (EUR)</label>
            <input
              type="number"
              step="0.01"
              value={simSellPrice}
              onChange={(e) => setSimSellPrice(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="space-y-1">
            {simIngredients.map((ing, i) => (
              <div key={i} className="flex gap-2 items-center text-sm">
                <span className="flex-1">{ing.name}</span>
                <input
                  type="number"
                  step="0.01"
                  value={ing.quantity || ""}
                  onChange={(e) => updateSimIngredient(i, "quantity", parseFloat(e.target.value) || 0)}
                  className="input-field w-20 text-sm"
                  placeholder="Menge"
                />
                <span className="text-meta w-8">{ing.unit}</span>
                <input
                  type="number"
                  step="0.001"
                  value={ing.costPerUnit || ""}
                  onChange={(e) => updateSimIngredient(i, "costPerUnit", parseFloat(e.target.value) || 0)}
                  className="input-field w-24 text-sm"
                  placeholder="EUR/Einh."
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 p-3 rounded-lg" style={{ backgroundColor: "var(--color-track-bg)" }}>
            <div>
              <p className="text-meta">Materialkosten</p>
              <p className="text-number font-medium">{simTotalCost.toFixed(2)} EUR</p>
            </div>
            <div>
              <p className="text-meta">Marge (abs.)</p>
              <p
                className="text-number font-medium"
                style={{
                  color: simAbsoluteMargin > 0 ? "var(--color-accent-profit)" : "var(--color-accent-warning)",
                }}
              >
                {simAbsoluteMargin.toFixed(2)} EUR
              </p>
            </div>
            <div>
              <p className="text-meta">Marge (%)</p>
              <p
                className="text-number font-medium"
                style={{
                  color:
                    simMarginPercent >= 60
                      ? "var(--color-accent-profit)"
                      : simMarginPercent >= 40
                        ? "var(--color-accent-primary)"
                        : "var(--color-accent-warning)",
                }}
              >
                {simMarginPercent.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Compare with original */}
          {(() => {
            const orig = recipes.find((r) => r.id === simRecipeId);
            if (!orig) return null;
            const origMargin = orig.margin;
            const diff = simMarginPercent - origMargin;
            return (
              <div className="text-sm flex items-center gap-2">
                <span className="text-meta">vs. Original ({origMargin.toFixed(1)}%):</span>
                <span
                  className="text-number font-medium"
                  style={{
                    color: diff > 0 ? "var(--color-accent-profit)" : diff < 0 ? "var(--color-accent-warning)" : "var(--color-text-secondary)",
                  }}
                >
                  {diff > 0 ? "+" : ""}
                  {diff.toFixed(1)} Prozentpunkte
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Recipe list */}
      {loading ? (
        <div className="card animate-pulse h-32" />
      ) : recipes.length === 0 ? (
        <p className="text-meta text-center py-8">{t("common.noData")}</p>
      ) : (
        <div className="space-y-2">
          {recipes.map((r) => {
            const absMargin = r.sellPrice - r.totalCost;
            const recPrice = r.totalCost > 0 ? r.totalCost / (1 - (TARGET_MARGINS[r.category] || 65) / 100) : 0;
            return (
              <div key={r.id} className="card">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-meta">
                      {r.sellPrice.toFixed(2)} EUR | Marge: {r.margin.toFixed(1)}% ({absMargin.toFixed(2)} EUR) | Kosten: {r.totalCost.toFixed(2)} EUR
                    </p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`transition-transform duration-200 ${expanded === r.id ? "rotate-180" : ""}`}
                    style={{ color: "var(--color-text-secondary)" }}
                  />
                </button>
                {expanded === r.id && (
                  <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "var(--color-border-subtle)" }}>
                    {r.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>
                          {ing.name} ({ing.quantity} {ing.unit})
                        </span>
                        <span className="text-number">{(ing.quantity * ing.costPerUnit).toFixed(3)} EUR</span>
                      </div>
                    ))}
                    {/* Price recommendation */}
                    {recPrice > 0 && Math.abs(recPrice - r.sellPrice) > 0.1 && (
                      <div
                        className="flex items-center gap-2 p-2 rounded-lg mt-1"
                        style={{ backgroundColor: "rgba(224, 138, 74,0.06)" }}
                      >
                        <Lightbulb size={13} style={{ color: "var(--color-accent-primary)" }} />
                        <p className="text-sm text-meta">
                          Empfohlener Preis: <span className="text-number font-medium">{recPrice.toFixed(2)} EUR</span> (Ziel {TARGET_MARGINS[r.category] || 65}%)
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => openSimulator(r)}
                      className="btn-secondary text-sm flex items-center gap-1 mt-2"
                      aria-label={t("rezepte.whatIf")}
                    >
                      <Calculator size={14} /> {t("rezepte.whatIf")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
