"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Clock, Users, DollarSign, TrendingDown } from "lucide-react";
import { useT } from "@/i18n";

interface Schedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  startDate: string;
  isActive: boolean;
  hourlyWage: number;
  monthlyFixed: number;
  schedules: Schedule[];
}

interface LaborSummary {
  totalHours: number;
  totalCost: number;
  entries: { staffId: string; hoursWorked: number; totalCost: number }[];
}

const ROLE_LABELS: Record<string, string> = {
  barista: "Barista",
  kitchen: "Kueche",
  allrounder: "Allrounder",
  manager: "Manager",
};

export default function PersonalPage() {
  const { t } = useT();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("barista");
  const [hourlyWage, setHourlyWage] = useState("");
  const [monthlyFixed, setMonthlyFixed] = useState("");
  const [saving, setSaving] = useState(false);
  const [laborData, setLaborData] = useState<LaborSummary>({ totalHours: 0, totalCost: 0, entries: [] });
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const month = new Date().toISOString().slice(0, 7);

  const fetchData = useCallback(async () => {
    try {
      const [staffRes, laborRes, revRes] = await Promise.all([
        fetch("/api/staff"),
        fetch(`/api/labor?month=${month}`),
        fetch(`/api/analytics?type=monthly-revenue&month=${month}`),
      ]);
      if (staffRes.ok) { const d = await staffRes.json(); setStaff(Array.isArray(d) ? d : d.items ?? []); }
      if (laborRes.ok) {
        const ld = await laborRes.json();
        setLaborData({
          totalHours: ld.totalHours ?? 0,
          totalCost: ld.totalCost ?? 0,
          entries: ld.entries ?? [],
        });
      }
      if (revRes.ok) {
        const rd = await revRes.json();
        setMonthlyRevenue(rd.totalRevenue ?? 0);
      }
    } catch (e) {
      console.warn("PersonalPage error:", e);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    try {
      const body = {
        name,
        role,
        hourlyWage: parseFloat(hourlyWage) || 0,
        monthlyFixed: parseFloat(monthlyFixed) || 0,
      };
      if (editingId) {
        await fetch("/api/staff", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...body }),
        });
      } else {
        await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      resetForm();
      await fetchData();
    } catch (e) {
      console.warn("PersonalPage error:", e);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setRole("barista");
    setHourlyWage("");
    setMonthlyFixed("");
  };

  const startEdit = (s: StaffMember) => {
    setEditingId(s.id);
    setName(s.name);
    setRole(s.role);
    setHourlyWage(s.hourlyWage > 0 ? s.hourlyWage.toString() : "");
    setMonthlyFixed(s.monthlyFixed > 0 ? s.monthlyFixed.toString() : "");
    setShowForm(true);
  };

  const laborPercent = monthlyRevenue > 0 ? (laborData.totalCost / monthlyRevenue) * 100 : 0;

  const getLaborEntryForStaff = (staffId: string) => {
    return laborData.entries.find((e) => e.staffId === staffId);
  };

  const getDemandSuggestions = (): string[] => {
    const suggestions: string[] = [];
    if (laborPercent > 35) {
      suggestions.push(
        `Personalkosten liegen bei ${laborPercent.toFixed(1)}% vom Umsatz. Ziel: unter 30%. Pruefe ob Schichten reduziert werden koennen.`
      );
    }
    if (laborPercent > 25 && laborPercent <= 35) {
      suggestions.push(
        `Personalkosten bei ${laborPercent.toFixed(1)}% — im akzeptablen Bereich. Optimierungspotenzial vorhanden.`
      );
    }
    const activeStaff = staff.filter((s) => s.isActive);
    if (activeStaff.length > 3 && laborPercent > 30) {
      suggestions.push(
        `Bei ${activeStaff.length} aktiven Mitarbeitern: Pruefe ob an ruhigen Tagen (Montag/Dienstag) eine Person weniger reicht.`
      );
    }
    const noWage = activeStaff.filter((s) => s.hourlyWage === 0);
    if (noWage.length > 0) {
      suggestions.push(
        `${noWage.length} Mitarbeiter ohne Stundenlohn hinterlegt. Pflege Loehne fuer bessere Kostenanalyse.`
      );
    }
    return suggestions;
  };

  const demandSuggestions = getDemandSuggestions();

  return (
    <div className="space-y-6 pb-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-greeting">{t("personal.title")}</h1>
          <p className="text-meta mt-1">{t("personal.optimization")}</p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="btn-primary text-sm flex items-center gap-1"
          aria-label={t("personal.addStaff")}
        >
          <Plus size={16} /> {t("personal.addStaff")}
        </button>
      </header>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card flex items-center gap-3">
          <Users size={18} style={{ color: "var(--color-accent-primary)" }} />
          <div>
            <p className="text-card-title text-number">{staff.filter((s) => s.isActive).length}</p>
            <p className="text-meta">Aktive Mitarbeiter</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <DollarSign size={18} style={{ color: "var(--color-accent-profit)" }} />
          <div>
            <p className="text-card-title text-number">{laborData.totalCost.toFixed(0)} EUR</p>
            <p className="text-meta">{t("personal.totalCost")} {month}</p>
          </div>
        </div>
      </div>

      {/* Labor cost as % of revenue */}
      {monthlyRevenue > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Personal vs. Umsatz</p>
            <p
              className="text-number font-semibold"
              style={{ color: laborPercent > 35 ? "var(--color-accent-waste)" : laborPercent > 30 ? "var(--color-accent-primary)" : "var(--color-accent-profit)" }}
            >
              {laborPercent.toFixed(1)}%
            </p>
          </div>
          <div className="h-1.5 rounded-full" style={{ backgroundColor: "var(--color-track-bg)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, laborPercent)}%`,
                backgroundColor: laborPercent > 35 ? "var(--color-accent-waste)" : laborPercent > 30 ? "var(--color-accent-primary)" : "var(--color-accent-profit)",
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-meta">Personalkosten: {laborData.totalCost.toFixed(0)} EUR</p>
            <p className="text-meta">Umsatz: {monthlyRevenue.toFixed(0)} EUR</p>
          </div>
        </div>
      )}

      {/* Labor hours summary */}
      {laborData.totalHours > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} style={{ color: "var(--color-accent-stress)" }} />
            <p className="text-sm font-medium">Stunden-Uebersicht ({month})</p>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span>Gesamt Stunden</span>
            <span className="text-number">{laborData.totalHours.toFixed(1)}h</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span>Durchschnitt/Tag</span>
            <span className="text-number">{(laborData.totalHours / new Date().getDate()).toFixed(1)}h</span>
          </div>
          <div className="flex justify-between text-sm py-1 border-t mt-1 pt-1" style={{ borderColor: "var(--color-border-subtle)" }}>
            <span className="font-medium">Kosten gesamt</span>
            <span className="text-number font-medium">{laborData.totalCost.toFixed(2)} EUR</span>
          </div>
        </div>
      )}

      {/* Demand-based suggestions */}
      {demandSuggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingDown size={16} style={{ color: "var(--color-accent-primary)" }} />
            <p className="text-sm font-semibold">{t("personal.optimization")}</p>
          </div>
          {demandSuggestions.map((s, i) => (
            <div key={i} className="card border-l-4" style={{ borderLeftColor: "var(--color-accent-primary)" }}>
              <p className="text-sm">{s}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add/edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <p className="text-sm font-semibold">{editingId ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Name"
            required
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field" aria-label={t("personal.role")}>
            {Object.entries(ROLE_LABELS).map(([v]) => (
              <option key={v} value={v}>{t(`personal.roles.${v}`)}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-meta block mb-1">{t("personal.hourlyWage")} (EUR)</label>
              <input
                type="number"
                step="0.01"
                value={hourlyWage}
                onChange={(e) => setHourlyWage(e.target.value)}
                className="input-field"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-meta block mb-1">Fixgehalt/Monat (EUR)</label>
              <input
                type="number"
                step="0.01"
                value={monthlyFixed}
                onChange={(e) => setMonthlyFixed(e.target.value)}
                className="input-field"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "..." : editingId ? "Aktualisieren" : "Speichern"}
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary">
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Staff list */}
      {loading ? (
        <div className="card animate-pulse h-32" />
      ) : staff.length === 0 ? (
        <p className="text-meta text-center py-8">{t("common.noData")}</p>
      ) : (
        <div className="space-y-2">
          {staff.map((s) => {
            const entry = getLaborEntryForStaff(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => startEdit(s)}
                className="card w-full text-left transition-colors duration-200 hover:bg-[rgba(110, 115, 136,0.03)] dark:hover:bg-[rgba(255,255,255,0.06)]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-meta">{t(`personal.roles.${s.role}`) || s.role}</p>
                  </div>
                  <div className="text-right">
                    {s.hourlyWage > 0 && (
                      <p className="text-meta text-number">{s.hourlyWage.toFixed(2)} EUR/h</p>
                    )}
                    <div
                      className={`h-2.5 w-2.5 rounded-full ml-auto mt-1 ${
                        s.isActive
                          ? "bg-[var(--color-accent-profit)]"
                          : "bg-[var(--color-track-bg)]"
                      }`}
                    />
                  </div>
                </div>
                {s.schedules.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-meta">
                    <Clock size={13} />
                    {s.schedules.map((sch, i) => (
                      <span key={i}>
                        {sch.startTime} — {sch.endTime}
                      </span>
                    ))}
                  </div>
                )}
                {entry && entry.hoursWorked > 0 && (
                  <div className="mt-1 flex items-center justify-between text-meta">
                    <span>Stunden ({month}): {entry.hoursWorked.toFixed(1)}h</span>
                    <span className="text-number">{entry.totalCost.toFixed(0)} EUR</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
