"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Truck, PackageX, Wrench, UserMinus, Users, Zap, ArrowLeft } from "lucide-react";
import { useT } from "@/i18n";
import type { EmergencyType } from "@/lib/engine/types";
import type { CandidateSuggestion } from "@/lib/engine/types";
import type { FoodSafetyTimer } from "@/lib/engine/emergency";

const EMERGENCY_TYPE_ICONS: Record<EmergencyType, typeof Truck> = {
  vendor: Truck,
  damaged: PackageX,
  equipment: Wrench,
  staff: UserMinus,
  rush: Users,
  power: Zap,
};

const EMERGENCY_TYPES: {
  type: EmergencyType;
  title: string;
  subtitle: string;
}[] = [
  {
    type: "vendor",
    title: "Lieferanten-Problem",
    subtitle: "Lieferung ausgefallen oder verspätet",
  },
  {
    type: "damaged",
    title: "Ware beschädigt",
    subtitle: "Beschädigung oder Verderb festgestellt",
  },
  {
    type: "equipment",
    title: "Geräte-Ausfall",
    subtitle: "Maschine oder Gerät defekt",
  },
  {
    type: "staff",
    title: "Personal-Ausfall",
    subtitle: "Mitarbeiter fehlt kurzfristig",
  },
  {
    type: "rush",
    title: "Unerwarteter Ansturm",
    subtitle: "Starker Kundenandrang",
  },
  {
    type: "power",
    title: "Strom/Kühlung",
    subtitle: "Stromausfall oder Kühlungsproblem",
  },
];

const SEVERITY_OPTIONS: { value: "low" | "medium" | "high" | "critical"; label: string }[] = [
  { value: "low", label: "Gering" },
  { value: "medium", label: "Mittel" },
  { value: "high", label: "Hoch" },
  { value: "critical", label: "Kritisch" },
];

const POWER_SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: "Stromausfall", label: "Stromausfall" },
  { value: "Kühlungsausfall", label: "Kühlungsausfall" },
  { value: "Beides", label: "Beides" },
];

const EMERGENCY_TITLES: Record<EmergencyType, string> = {
  vendor: "Lieferanten-Problem",
  damaged: "Ware beschädigt",
  equipment: "Geräte-Ausfall",
  staff: "Personal-Ausfall",
  rush: "Unerwarteter Ansturm",
  power: "Strom/Kühlung",
};

interface Product {
  id: string;
  name: string;
  category: string;
  isActive?: boolean;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
}

interface EmergencyLog {
  id: string;
  type: string;
  description: string;
  severity: string;
  createdAt: string;
}

interface EmergencyResult {
  emergencyId: string;
  type: EmergencyType;
  title: string;
  immediateSuggestions: CandidateSuggestion[];
  adaptedDailySuggestions: CandidateSuggestion[];
  foodSafetyTimer?: FoodSafetyTimer;
  loggedAt: string;
}

// ─── Food Safety Timer Component ─────────────────────────────────────────

function FoodSafetyTimerDisplay({
  timer,
  onStop,
}: {
  timer: FoodSafetyTimer;
  onStop: () => void;
}) {
  const [remainingSec, setRemainingSec] = useState(() => {
    const started = new Date(timer.startedAt).getTime();
    const elapsed = (Date.now() - started) / 1000;
    const totalSec = timer.maxDurationMinutes * 60;
    return Math.max(0, Math.floor(totalSec - elapsed));
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (remainingSec <= 0) return;
    intervalRef.current = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [remainingSec <= 0]);

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const totalMinutes = timer.maxDurationMinutes;
  const remainingMinutes = Math.ceil(remainingSec / 60);
  const isUrgent = remainingMinutes < 30;
  const isCritical = remainingMinutes < 10;

  const getWarningText = (): string | null => {
    if (remainingMinutes <= 10) return "Sofort handeln! Kuehlkette muss wiederhergestellt werden.";
    if (remainingMinutes <= 30) return "Kühlung baldmöglichst wiederherstellen.";
    if (remainingMinutes <= 60) return "Noch etwa 1 Stunde bis zur maximalen Unterbrechungszeit.";
    if (remainingMinutes <= 90) return "Noch etwa 1,5 Stunden — Kühlkette überwachen.";
    return null;
  };

  return (
    <section
      className={`rounded-card border-2 p-4 ${
        isUrgent
          ? "border-emergency bg-emergency/15 dark:bg-emergency/25"
          : "border-emergency/50 bg-emergency/10 dark:bg-emergency/20"
      }`}
      aria-live="polite"
      aria-label="Lebensmittelsicherheit-Timer"
    >
      <h3 className="font-heading text-lg font-semibold text-emergency dark:text-emergency">
        Kühlkette unterbrochen
      </h3>
      <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
        Max. 2 Stunden ohne Kühlung — danach müssen verderbliche Waren entsorgt werden.
      </p>
      <div
        className={`mt-3 font-mono text-4xl font-bold tabular-nums ${
          isCritical ? "text-emergency font-bold" : "text-text-primary dark:text-dark-text"
        }`}
        aria-label={`Verbleibende Zeit: ${mins} Minuten und ${secs} Sekunden`}
      >
        {mm}:{ss}
      </div>
      {getWarningText() && (
        <p
          className={`mt-2 text-sm font-medium ${
            isCritical ? "text-emergency" : "text-waste dark:text-waste"
          }`}
          role="alert"
        >
          {getWarningText()}
        </p>
      )}
      <button
        type="button"
        onClick={onStop}
        className="mt-4 w-full rounded-card bg-emergency px-4 py-3 font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-emergency focus:ring-offset-2 dark:focus:ring-offset-dark-bg"
        aria-label="Timer stoppen — Kühlung wiederhergestellt"
      >
        Timer stoppen — Kühlung wiederhergestellt
      </button>
    </section>
  );
}

// ─── Emergency Action Card (urgent styling) ─────────────────────────────────

function EmergencyActionCard({ suggestion }: { suggestion: CandidateSuggestion }) {
  const [expanded, setExpanded] = useState(false);

  const formatImpact = () => {
    const impact = suggestion.expectedImpact ?? {};
    const parts: string[] = [];
    if (impact.revenue != null) parts.push(`Umsatz: ${impact.revenue >= 0 ? "+" : ""}€${impact.revenue}`);
    if (impact.waste != null)
      parts.push(`Verschwendung: ${impact.waste > 0 ? "+" : ""}${impact.waste}%`);
    if (impact.stress)
      parts.push(
        impact.stress === "reduces"
          ? "Stress: reduziert"
          : impact.stress === "increases"
            ? "Stress: erhöht"
            : "Stress: neutral"
      );
    return parts.join(" • ") || "—";
  };

  return (
    <article
      className="relative overflow-hidden rounded-card border-2 border-emergency/40 border-l-4 border-l-emergency bg-emergency/5 dark:bg-emergency/15"
      role="article"
      aria-expanded={expanded}
      aria-label={suggestion.title}
    >
      <button
        type="button"
        className="w-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-emergency focus:ring-inset"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <div className="flex flex-col gap-2">
          <h3 className="font-heading text-base font-semibold text-text-primary dark:text-dark-text">
            {suggestion.title}
          </h3>
          {suggestion.timing && (
            <span className="inline-flex w-fit rounded-md bg-emergency/25 px-2 py-0.5 text-xs font-medium text-emergency">
              {suggestion.timing}
            </span>
          )}
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
            {suggestion.description}
          </p>
          <span className="text-xs text-text-secondary dark:text-dark-text-secondary" aria-hidden>
            {expanded ? "▲ Weniger" : "▼ Mehr"}
          </span>
        </div>
      </button>
      <div
        className={`grid transition-all duration-300 ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        aria-hidden={!expanded}
      >
        <div className="overflow-hidden">
          <div className="border-t border-emergency/20 px-4 pb-4 pt-3">
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Begründung: </span>
                {suggestion.reasoning}
              </p>
              <p>
                <span className="font-medium">Erwartete Wirkung: </span>
                {formatImpact()}
              </p>
              {suggestion.inactionRisk && (
                <p>
                  <span className="font-medium text-waste">Risiko bei Nichtstun: </span>
                  {suggestion.inactionRisk}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function EmergencyPage() {
  const { t } = useT();
  const [activeEmergencies, setActiveEmergencies] = useState<EmergencyLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null);
  const [result, setResult] = useState<EmergencyResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resolveLoading, setResolveLoading] = useState<string | null>(null);
  const [stoppingTimer, setStoppingTimer] = useState<string | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<{ id: string; name: string; role: string; phone: string }[]>([]);

  // Form state
  const [details, setDetails] = useState("");
  const [affectedProductIds, setAffectedProductIds] = useState<string[]>([]);
  const [affectedEquipment, setAffectedEquipment] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [powerSeverity, setPowerSeverity] = useState("Kühlungsausfall");
  const [autoStartTimer, setAutoStartTimer] = useState(true);

  const fetchActiveEmergencies = useCallback(async () => {
    try {
      const res = await fetch("/api/emergency");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setActiveEmergencies(data);
    } catch (e) {
      console.warn("EmergencyPage error:", e);
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [emergenciesRes, productsRes, staffRes, contactsRes] = await Promise.all([
          fetch("/api/emergency"),
          fetch("/api/products"),
          fetch("/api/staff"),
          fetch("/api/emergency-contacts"),
        ]);

        if (emergenciesRes.ok) {
          const emergencies = await emergenciesRes.json();
          setActiveEmergencies(Array.isArray(emergencies) ? emergencies : []);
        }

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(Array.isArray(productsData) ? productsData : []);
        } else {
          throw new Error("Produkte konnten nicht geladen werden.");
        }

        if (staffRes.ok) {
          const staffData = await staffRes.json();
          setStaff(Array.isArray(staffData) ? staffData : []);
        }

        if (contactsRes.ok) {
          const contactsData = await contactsRes.json();
          setEmergencyContacts(Array.isArray(contactsData) ? contactsData : []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Laden fehlgeschlagen");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSelectType = (type: EmergencyType) => {
    setSelectedType(type);
    setResult(null);
    setDetails("");
    setAffectedProductIds([]);
    setAffectedEquipment("");
    setSeverity(type === "rush" ? "high" : "medium");
    setSelectedStaffId("");
    setPowerSeverity("Kühlungsausfall");
    setAutoStartTimer(true);
  };

  const handleBack = () => {
    setSelectedType(null);
    setResult(null);
  };

  const buildPayload = () => {
    const type = selectedType!;
    let payload: Record<string, unknown> = {
      type,
      severity: type === "rush" ? "high" : severity,
    };

    if (details) payload.details = details;

    switch (type) {
      case "vendor":
        if (affectedProductIds.length) payload.affectedProductIds = affectedProductIds;
        break;
      case "damaged":
        if (affectedProductIds.length) payload.affectedProductIds = affectedProductIds;
        break;
      case "equipment":
        if (affectedEquipment) payload.affectedEquipment = affectedEquipment;
        break;
      case "staff": {
        const person = staff.find((s) => s.id === selectedStaffId);
        const staffInfo = person ? `${person.name} (${person.role}) fehlt. ${details}`.trim() : details;
        payload.details = staffInfo || undefined;
        break;
      }
      case "power":
        payload.details = `${powerSeverity}. ${details}`.trim() || powerSeverity;
        payload.severity = severity;
        break;
      default:
        if (affectedProductIds.length) payload.affectedProductIds = affectedProductIds;
    }

    return payload;
  };

  const handleSubmit = async () => {
    if (!selectedType) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = buildPayload();
      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Notfall konnte nicht gemeldet werden.");
      setResult(data);
      setActiveEmergencies((prev) => [
        {
          id: data.emergencyId,
          type: data.type,
          description: data.title,
          severity: data.immediateSuggestions?.[0] ? "high" : "medium",
          createdAt: data.loggedAt,
        },
        ...prev,
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Melden");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (id: string) => {
    setResolveLoading(id);
    try {
      const res = await fetch(`/api/emergency/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionsTaken: ["Manuell aufgelöst"] }),
      });
      if (!res.ok) throw new Error("Auflösen fehlgeschlagen");
      setActiveEmergencies((prev) => prev.filter((e) => e.id !== id));
      if (result?.emergencyId === id) setResult(null);
    } catch {
      setError("Notfall konnte nicht aufgelöst werden.");
    } finally {
      setResolveLoading(null);
    }
  };

  const handleStopTimer = async (emergencyId: string) => {
    setStoppingTimer(emergencyId);
    try {
      const res = await fetch(`/api/emergency/${emergencyId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionsTaken: ["Kühlung wiederhergestellt — Timer manuell gestoppt"],
        }),
      });
      if (!res.ok) throw new Error("Fehler");
      setActiveEmergencies((prev) => prev.filter((e) => e.id !== emergencyId));
      setResult((prev) =>
        prev && prev.emergencyId === emergencyId
          ? { ...prev, foodSafetyTimer: undefined }
          : prev
      );
    } catch {
      setError("Timer konnte nicht gestoppt werden.");
    } finally {
      setStoppingTimer(null);
    }
  };

  const formatTimeSince = (dateStr: string) => {
    const d = new Date(dateStr);
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return "Gerade eben";
    if (mins < 60) return `Vor ${mins} Min.`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (m) return `Vor ${h}h ${m}m`;
    return `Vor ${h} Std.`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text"
          aria-label={t("common.back")}
        >
          ← {t("common.back")}
        </Link>
        <h1 className="font-heading text-2xl font-semibold text-emergency">
          {t("emergency.title")}
        </h1>
        <div className="h-48 animate-pulse rounded-card bg-text-secondary/10 dark:bg-dark-text-secondary/20" />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 pb-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 dark:text-dark-text-secondary dark:hover:text-dark-text dark:focus:ring-offset-dark-bg"
        aria-label={t("common.back")}
      >
        ← {t("common.back")}
      </Link>

      <header>
        <h1
          className="font-heading text-2xl font-semibold text-emergency"
          style={{ fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif" }}
        >
          SOS — Notfall
        </h1>
        <p
          className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          Schnelle Unterstützung bei betrieblichen Notfällen
        </p>
      </header>

      {error && (
        <div
          className="rounded-card border border-emergency/50 bg-emergency/10 p-4 text-emergency"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Active Emergencies */}
      {activeEmergencies.length > 0 && (
        <section aria-labelledby="active-emergencies">
          <h2
            id="active-emergencies"
            className="mb-3 font-heading text-lg font-semibold text-text-primary dark:text-dark-text"
          >
            Aktive Notfälle
          </h2>
          <div className="space-y-3">
            {activeEmergencies.map((emp) => (
              <div
                key={emp.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-emergency/30 bg-emergency/5 p-3 dark:bg-emergency/10"
              >
                <div>
                  <p className="font-medium text-text-primary dark:text-dark-text">
                    {EMERGENCY_TITLES[emp.type as EmergencyType] ?? emp.type}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                    {formatTimeSince(emp.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleResolve(emp.id)}
                  disabled={resolveLoading === emp.id}
                  className="rounded-card bg-emergency px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emergency focus:ring-offset-2 dark:focus:ring-offset-dark-bg"
                  aria-label={`Notfall auflösen: ${emp.description}`}
                >
                  {resolveLoading === emp.id ? "..." : "Notfall auflösen"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Result view */}
      {result && (
        <section className="space-y-4" aria-labelledby="result-title">
          <div className="flex items-center gap-3">
            <div>
              <h2
                id="result-title"
                className="font-heading text-xl font-semibold text-text-primary dark:text-dark-text"
              >
                {result.title} — Sofortmaßnahmen
              </h2>
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                Gemeldet {new Date(result.loggedAt).toLocaleString("de-DE")}
              </p>
            </div>
          </div>

          {result.foodSafetyTimer && (
            <FoodSafetyTimerDisplay
              timer={result.foodSafetyTimer}
              onStop={() => handleStopTimer(result.emergencyId)}
            />
          )}

          <div className="space-y-3">
            <h3 className="font-heading font-semibold text-text-primary dark:text-dark-text">
              Sofortmaßnahmen
            </h3>
            {result.immediateSuggestions.map((s, i) => (
              <EmergencyActionCard key={i} suggestion={s} />
            ))}
          </div>

          {result.adaptedDailySuggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-heading font-semibold text-text-primary dark:text-dark-text">
                Angepasste Tagesempfehlungen
              </h3>
              {result.adaptedDailySuggestions.slice(0, 5).map((s, i) => (
                <EmergencyActionCard key={i} suggestion={s} />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleBack}
            className="w-full rounded-card border border-text-secondary/30 bg-transparent py-3 font-medium text-text-primary transition-colors hover:bg-text-secondary/10 dark:border-dark-text-secondary/30 dark:text-dark-text dark:hover:bg-dark-text-secondary/10"
          >
            Neuen Notfall melden
          </button>
        </section>
      )}

      {/* Form view */}
      {selectedType && !result && (
        <section className="space-y-4" aria-labelledby="form-title">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-lg p-1 text-text-secondary hover:bg-text-secondary/10 focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Zurück zur Auswahl"
            >
              ←
            </button>
            <h2
              id="form-title"
              className="font-heading text-xl font-semibold text-text-primary dark:text-dark-text"
            >
              {EMERGENCY_TITLES[selectedType]}
            </h2>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-4"
          >
            {selectedType === "vendor" && (
              <>
                <label htmlFor="vendor-details" className="block font-medium">
                  Was ist passiert?
                </label>
                <textarea
                  id="vendor-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  className="input-field"
                  placeholder="z.B. Lieferung nicht angekommen, falsche Ware geliefert..."
                  aria-describedby="vendor-details-desc"
                />
                <p id="vendor-details-desc" className="text-xs text-text-secondary">
                  Welche Produkte betroffen?
                </p>
                <div className="flex flex-wrap gap-2">
                  {products.filter((p) => p.isActive !== false).map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-text-secondary/20 px-3 py-2 has-[:checked]:border-emergency has-[:checked]:bg-emergency/10"
                    >
                      <input
                        type="checkbox"
                        checked={affectedProductIds.includes(p.id)}
                        onChange={(e) =>
                          setAffectedProductIds((prev) =>
                            e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                          )
                        }
                        className="rounded border-text-secondary/30"
                        aria-label={p.name}
                      />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            {selectedType === "damaged" && (
              <>
                <label htmlFor="damaged-details">Was ist beschädigt?</label>
                <textarea
                  id="damaged-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  className="input-field"
                  placeholder="Beschreibung der Beschädigung..."
                />
                <label className="block font-medium">Welche Produkte?</label>
                <div className="flex flex-wrap gap-2">
                  {products.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-text-secondary/20 px-3 py-2 has-[:checked]:border-emergency"
                    >
                      <input
                        type="checkbox"
                        checked={affectedProductIds.includes(p.id)}
                        onChange={(e) =>
                          setAffectedProductIds((prev) =>
                            e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                          )
                        }
                        aria-label={p.name}
                      />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
                <label htmlFor="damaged-severity">Schweregrad</label>
                <select
                  id="damaged-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as typeof severity)}
                  className="input-field"
                >
                  {SEVERITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </>
            )}

            {selectedType === "equipment" && (
              <>
                <label htmlFor="equipment-name">Welches Gerät?</label>
                <input
                  id="equipment-name"
                  type="text"
                  value={affectedEquipment}
                  onChange={(e) => setAffectedEquipment(e.target.value)}
                  className="input-field"
                  placeholder="z.B. Espressomaschine, Kühlschrank..."
                />
                <label htmlFor="equipment-details">Was ist passiert?</label>
                <textarea
                  id="equipment-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  className="input-field"
                  placeholder="Fehlermeldung, Verhalten..."
                />
              </>
            )}

            {selectedType === "staff" && (
              <>
                <label htmlFor="staff-select">Wer fehlt?</label>
                <select
                  id="staff-select"
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">— Bitte wählen —</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
                <label htmlFor="staff-details">Details</label>
                <textarea
                  id="staff-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={2}
                  className="input-field"
                  placeholder="z.B. Krankmeldung, Unfall..."
                />
              </>
            )}

            {selectedType === "rush" && (
              <>
                <label htmlFor="rush-details">Details</label>
                <textarea
                  id="rush-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  className="input-field"
                  placeholder="Was ist los? Unerwarteter Ansturm..."
                />
                <p className="text-sm text-text-secondary">
                  Schweregrad wird automatisch auf „Hoch“ gesetzt.
                </p>
              </>
            )}

            {selectedType === "power" && (
              <>
                <label htmlFor="power-severity">Art des Ausfalls</label>
                <select
                  id="power-severity"
                  value={powerSeverity}
                  onChange={(e) => setPowerSeverity(e.target.value)}
                  className="input-field"
                >
                  {POWER_SEVERITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoStartTimer}
                    onChange={(e) => setAutoStartTimer(e.target.checked)}
                    aria-label="Kühlketten-Timer automatisch starten"
                  />
                  <span>Kühlketten-Timer automatisch starten (empfohlen)</span>
                </label>
                <label htmlFor="power-severity-level">Schweregrad</label>
                <select
                  id="power-severity-level"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as typeof severity)}
                  className="input-field"
                >
                  {SEVERITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-card bg-emergency py-4 font-heading text-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emergency focus:ring-offset-2 dark:focus:ring-offset-dark-bg"
              aria-label="Notfall melden"
            >
              {submitting ? "Wird gemeldet..." : "Notfall melden"}
            </button>
          </form>
        </section>
      )}

      {/* Type selection grid */}
      {!selectedType && !result && (
        <section aria-labelledby="emergency-types">
          <h2
            id="emergency-types"
            className="mb-4 font-heading text-lg font-semibold text-text-primary dark:text-dark-text"
          >
            Notfalltyp wählen
          </h2>
          <div
            className="grid grid-cols-2 gap-3"
            role="group"
            aria-label={t("emergency.title")}
          >
            {EMERGENCY_TYPES.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => handleSelectType(item.type)}
                className="flex flex-col items-start gap-1 rounded-card border border-text-secondary/20 bg-card p-4 text-left transition-colors hover:border-emergency/50 hover:bg-emergency/5 focus:outline-none focus:ring-2 focus:ring-emergency focus:ring-offset-2 dark:bg-dark-card dark:hover:bg-emergency/10"
                aria-label={`${item.title}: ${item.subtitle}`}
              >
                
                <span className="font-heading font-semibold text-text-primary dark:text-dark-text">
                  {item.title}
                </span>
                <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
                  {item.subtitle}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Emergency contacts quick access */}
      {emergencyContacts.length > 0 && (
        <section aria-labelledby="emergency-contacts" className="mt-8 border-t border-text-secondary/10 pt-6 dark:border-dark-text-secondary/10">
          <h2
            id="emergency-contacts"
            className="mb-3 font-heading text-lg font-semibold text-text-primary dark:text-dark-text"
          >
            Gespeicherte Notfallkontakte
          </h2>
          <div className="space-y-2">
            {emergencyContacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-card border border-text-secondary/10 bg-card p-3 dark:border-dark-text-secondary/10 dark:bg-dark-card"
              >
                <div>
                  <p className="font-medium text-text-primary dark:text-dark-text">{c.name}</p>
                  <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{c.role}</p>
                </div>
                <a
                  href={`tel:${c.phone.replace(/\s/g, "")}`}
                  className="rounded-lg bg-profit px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-profit focus:ring-offset-2 dark:focus:ring-offset-dark-bg"
                  aria-label={`${c.name} anrufen`}
                >
                  Anrufen
                </a>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
