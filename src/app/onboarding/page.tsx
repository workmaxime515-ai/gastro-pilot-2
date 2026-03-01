"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Scale, TrendingUp, Recycle, Heart, Minus, Circle, Flame } from "lucide-react";
import { useT } from "@/i18n";

const ONBOARDING_KEY = "onboardingCompleted";
const TOTAL_STEPS = 7;

const DAY_NAMES = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

const DAY_LEVELS = [
  { id: "ruhig", label: "Ruhig", Icon: Minus },
  { id: "normal", label: "Normal", Icon: Circle },
  { id: "voll", label: "Voll", Icon: Flame },
] as const;

const STRATEGY_MODES = [
  { id: "balanced" as const, Icon: Scale, name: "Balanced", desc: "Ausgewogen" },
  { id: "profit" as const, Icon: TrendingUp, name: "Max Profit", desc: "Umsatz maximieren" },
  { id: "waste" as const, Icon: Recycle, name: "Low Waste", desc: "Verschwendung minimieren" },
  { id: "stress" as const, Icon: Heart, name: "Low Stress", desc: "Stress reduzieren" },
];

interface ProductTemplate {
  id: string;
  name: string;
  category: string;
  products: { name: string; category: string; costPrice: number; sellPrice: number }[];
}

interface EditableProduct {
  name: string;
  category: string;
  costPrice: number;
  sellPrice: number;
  templateId?: string; // for removing when template deselected
}

export default function OnboardingPage() {
  const { t } = useT();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Welcome
  const [shopName, setShopName] = useState("");
  const [location, setLocation] = useState("");

  // Step 2: Products (unified list: from templates + custom)
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<EditableProduct[]>([]);

  // Step 3: Typical week
  const [weekProfile, setWeekProfile] = useState<Record<number, string>>({
    1: "normal", 2: "normal", 3: "normal", 4: "normal",
    5: "voll", 6: "voll", 0: "ruhig",
  });

  // Step 4: Hours
  const [openTime, setOpenTime] = useState("06:00");
  const [closeTime, setCloseTime] = useState("18:00");

  // Step 5: Fixed costs
  const [fixedCosts, setFixedCosts] = useState("400");

  // Step 6: Strategy
  const [strategyMode, setStrategyMode] = useState<"balanced" | "profit" | "waste" | "stress">("balanced");

  useEffect(() => {
    fetch("/api/products/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]));
  }, []);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 1) setStep((s) => s - 1);
  }, [step]);

  const toggleTemplate = (id: string) => {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;

    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setProducts((p) => p.filter((x) => x.templateId !== id));
      } else {
        next.add(id);
        setProducts((p) => [
          ...p,
          ...tpl.products.map((x) => ({
            name: x.name,
            category: x.category,
            costPrice: x.costPrice,
            sellPrice: x.sellPrice,
            templateId: id,
          })),
        ]);
      }
      return next;
    });
  };

  const addCustomProduct = () => {
    setProducts((p) => [...p, { name: "", category: "coffee", costPrice: 0, sellPrice: 0 }]);
  };

  const updateProduct = (index: number, field: keyof EditableProduct, value: string | number) => {
    setProducts((p) => {
      const next = [...p];
      next[index] = { ...next[index]!, [field]: value };
      return next;
    });
  };

  const removeProduct = (index: number) => {
    setProducts((p) => p.filter((_, i) => i !== index));
  };

  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      const typicalWeek = Object.entries(weekProfile).map(([day, level]) => ({
        day: parseInt(day, 10),
        level,
      }));
      const typicalWeekJson = JSON.stringify(typicalWeek);

      const settingsRes = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: shopName || "Mein Café",
          location: location || undefined,
          openTime,
          closeTime,
          fixedCostsDaily: parseFloat(fixedCosts) || 400,
          strategyMode,
          typicalWeekProfile: typicalWeekJson,
        }),
      });
      if (!settingsRes.ok) throw new Error("Settings failed");

      for (const p of products) {
        if (!p.name.trim() || typeof p.costPrice !== "number" || typeof p.sellPrice !== "number") continue;
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: p.name.trim(),
            category: p.category,
            costPrice: p.costPrice,
            sellPrice: p.sellPrice,
          }),
        });
        if (!res.ok) console.warn("Product create failed:", p.name);
      }

      await fetch("/api/onboarding/complete", { method: "POST" });
      if (typeof window !== "undefined") {
        localStorage.setItem(ONBOARDING_KEY, "true");
      }
      router.push("/");
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  }, [
    shopName,
    location,
    openTime,
    closeTime,
    fixedCosts,
    strategyMode,
    weekProfile,
    products,
    router,
  ]);

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="mx-auto max-w-lg space-y-8 pb-12">
      {/* Progress bar */}
      <div
        className="fixed left-0 right-0 top-0 z-20 h-1 bg-accent/20 dark:bg-accent/30"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("onboarding.step", { current: step, total: TOTAL_STEPS })}
      >
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <header className="pt-2">
        <h1 className="font-heading text-2xl font-semibold text-text-primary dark:text-dark-text">
          {t("onboarding.title")}
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
          {t("onboarding.step", { current: step, total: TOTAL_STEPS })}
        </p>
      </header>

      {/* Step content */}
      <div className="space-y-6" aria-live="polite">
        {step === 1 && (
          <section aria-labelledby="step1-title" className="space-y-4">
            <h2 id="step1-title" className="font-heading text-lg font-semibold text-text-primary dark:text-dark-text">
              {t("onboarding.welcome")}
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="shop-name" className="mb-1 block text-sm font-medium">
                  Shop-Name
                </label>
                <input
                  id="shop-name"
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="input-field"
                  placeholder="z.B. Café Bohne"
                  aria-required="true"
                />
              </div>
              <div>
                <label htmlFor="location" className="mb-1 block text-sm font-medium">
                  Ort <span className="text-text-secondary">(optional)</span>
                </label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input-field"
                  placeholder="z.B. Berlin Mitte"
                  aria-label="Ort optional"
                />
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="step2-title" className="space-y-4">
            <h2 id="step2-title" className="font-heading text-lg font-semibold text-text-primary dark:text-dark-text">
              {t("onboarding.productSetup")}
            </h2>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              Wähle Vorlagen aus und passe sie bei Bedarf an.
            </p>

            <div className="space-y-3" role="group" aria-label="Produktvorlagen">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTemplate(t.id)}
                  className={`flex w-full items-center justify-between rounded-card border-2 p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                    selectedTemplateIds.has(t.id)
                      ? "border-accent bg-accent/10 dark:bg-accent/20"
                      : "border-text-secondary/20 bg-card dark:border-dark-text-secondary/20 dark:bg-dark-card"
                  }`}
                  aria-pressed={selectedTemplateIds.has(t.id)}
                  aria-label={`${t.name} ${selectedTemplateIds.has(t.id) ? "abwählen" : "auswählen"}`}
                >
                  <div>
                    <span className="font-medium text-text-primary dark:text-dark-text">{t.name}</span>
                    <span className="ml-2 text-sm text-text-secondary dark:text-dark-text-secondary">
                      ({t.products.length} Produkte)
                    </span>
                  </div>
                  {selectedTemplateIds.has(t.id) && (
                    <span className="text-accent" aria-hidden="true">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-text-primary dark:text-dark-text">Produkte anpassen</h3>
              {products.map((p, i) => (
                <div
                  key={i}
                  className="rounded-card border border-text-secondary/20 bg-card p-3 dark:border-dark-text-secondary/20 dark:bg-dark-card"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => updateProduct(i, "name", e.target.value)}
                      placeholder="Name"
                      className="input-field col-span-2"
                      aria-label={`Produkt ${i + 1} Name`}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={p.costPrice || ""}
                      onChange={(e) => updateProduct(i, "costPrice", parseFloat(e.target.value) || 0)}
                      placeholder="EK €"
                      className="input-field"
                      aria-label={`Produkt ${i + 1} Einkaufspreis`}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={p.sellPrice || ""}
                      onChange={(e) => updateProduct(i, "sellPrice", parseFloat(e.target.value) || 0)}
                      placeholder="VK €"
                      className="input-field"
                      aria-label={`Produkt ${i + 1} Verkaufspreis`}
                    />
                  </div>
                  {!p.templateId && (
                    <button
                      type="button"
                      onClick={() => removeProduct(i)}
                      className="mt-2 text-sm text-waste hover:underline focus:outline-none focus:ring-2 focus:ring-accent rounded"
                      aria-label={`Produkt ${i + 1} entfernen`}
                    >
                      Entfernen
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addCustomProduct}
                className="btn-secondary w-full"
                aria-label="Eigenes Produkt hinzufügen"
              >
                + Eigenes Produkt
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="step3-title" className="space-y-4">
            <h2 id="step3-title" className="font-heading text-lg font-semibold text-text-primary dark:text-dark-text">
              {t("onboarding.weekProfile")}
            </h2>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              Hilft dem Coach bei den ersten Empfehlungen (Cold-Start).
            </p>
            <div className="space-y-3">
              {DAY_NAMES.map((name, i) => {
                const dayNum = i === 6 ? 0 : i + 1;
                const value = weekProfile[dayNum] ?? "normal";
                return (
                  <div key={dayNum} className="flex items-center justify-between rounded-card bg-card p-3 dark:bg-dark-card">
                    <span className="font-medium text-text-primary dark:text-dark-text">{name}</span>
                    <div className="flex gap-2" role="radiogroup" aria-label={`${name} Auslastung`}>
                      {DAY_LEVELS.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setWeekProfile((p) => ({ ...p, [dayNum]: l.id }))}
                          className={`rounded-lg px-3 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
                            value === l.id
                              ? "bg-accent text-white"
                              : "bg-text-secondary/10 text-text-secondary dark:bg-dark-text-secondary/20 dark:text-dark-text-secondary"
                          }`}
                          role="radio"
                          aria-checked={value === l.id}
                          aria-label={l.label}
                        >
                          <l.Icon className="inline h-4 w-4" aria-hidden="true" /> {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {step === 4 && (
          <section aria-labelledby="step4-title" className="space-y-4">
            <h2 id="step4-title" className="font-heading text-lg font-semibold text-text-primary dark:text-dark-text">
              {t("onboarding.hoursSetup")}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="open-time" className="mb-1 block text-sm font-medium">
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
                <label htmlFor="close-time" className="mb-1 block text-sm font-medium">
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
          </section>
        )}

        {step === 5 && (
          <section aria-labelledby="step5-title" className="space-y-4">
            <h2 id="step5-title" className="font-heading text-lg font-semibold text-text-primary dark:text-dark-text">
              {t("onboarding.costsSetup")}
            </h2>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              Tägliche Fixkosten in € (Miete, Strom, Personal etc.)
            </p>
            <input
              type="number"
              min="0"
              step="10"
              value={fixedCosts}
              onChange={(e) => setFixedCosts(e.target.value)}
              className="input-field text-lg"
              placeholder="400"
              aria-label="Tägliche Fixkosten in Euro"
            />
          </section>
        )}

        {step === 6 && (
          <section aria-labelledby="step6-title" className="space-y-4">
            <h2 id="step6-title" className="font-heading text-lg font-semibold text-text-primary dark:text-dark-text">
              {t("onboarding.strategySetup")}
            </h2>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              Wähle deinen initialen Strategiemodus.
            </p>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Strategiemodus">
              {STRATEGY_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setStrategyMode(m.id)}
                  className={`flex flex-col items-start gap-1 rounded-card border-2 p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                    strategyMode === m.id
                      ? "border-accent bg-accent/10 dark:bg-accent/20"
                      : "border-text-secondary/20 bg-card dark:border-dark-text-secondary/20 dark:bg-dark-card"
                  }`}
                  role="radio"
                  aria-checked={strategyMode === m.id}
                  aria-label={`${m.name}: ${m.desc}`}
                >
                  <m.Icon className="h-6 w-6 text-accent-primary" aria-hidden="true" />
                  <span className="font-medium text-text-primary dark:text-dark-text">{m.name}</span>
                  <span className="text-sm text-text-secondary dark:text-dark-text-secondary">{m.desc}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 7 && (
          <section aria-labelledby="step7-title" className="space-y-4">
            <h2 id="step7-title" className="font-heading text-lg font-semibold text-text-primary dark:text-dark-text">
              {t("onboarding.complete")}
            </h2>
            <p className="text-text-secondary dark:text-dark-text-secondary">
              Die ersten Empfehlungen basieren auf Branchendurchschnitten. Je mehr Daten du eingibst, desto besser werden sie.
            </p>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              Viel Erfolg mit deinem Cafe!
            </p>
          </section>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 1}
          className="btn-secondary disabled:opacity-50 disabled:pointer-events-none"
          aria-label={t("common.back")}
        >
          {t("common.back")}
        </button>
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={goNext}
            className="btn-primary"
            aria-label={t("common.next")}
          >
            {t("common.next")}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={saving}
            className="btn-primary"
            aria-label={t("onboarding.complete")}
          >
            {saving ? t("common.loading") : t("onboarding.complete")}
          </button>
        )}
      </div>
    </div>
  );
}
