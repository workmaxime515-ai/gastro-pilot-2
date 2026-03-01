"use client";

import { useEffect, useState, useCallback } from "react";
import { Calendar, Plus, Trash2, ChevronLeft, ChevronRight, Users, TrendingUp } from "lucide-react";
import { useT } from "@/i18n";

const DAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const DAY_NAMES_FULL = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

interface StaffMember {
  id: string;
  name: string;
  role: string;
  hourlyWage: number;
}

interface Schedule {
  id: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  staff: StaffMember;
}

interface ScheduleData {
  schedules: Schedule[];
  staff: StaffMember[];
  demandByDow: Record<number, string>;
  laborCostByDay: Record<string, number>;
  weekStart: string;
}

const DEMAND_COLORS: Record<string, string> = {
  hoch: "var(--color-accent-warning)",
  normal: "var(--color-accent-primary)",
  ruhig: "var(--color-accent-profit)",
};

export default function SchichtplanPage() {
  const { t } = useT();
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ staffId: "", date: "", startTime: "08:00", endTime: "16:00", role: "allrounder" });
  const [saving, setSaving] = useState(false);

  const getWeekStart = useCallback(() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7);
    return d.toISOString().split("T")[0];
  }, [weekOffset]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const weekStart = getWeekStart();
      const res = await fetch(`/api/staff/schedules?week=${weekStart}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.warn("SchichtplanPage error:", e);
    } finally {
      setLoading(false);
    }
  }, [getWeekStart]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(getWeekStart());
    d.setDate(d.getDate() + i);
    return d;
  });

  const addSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedule.staffId || !newSchedule.date) return;
    setSaving(true);
    try {
      await fetch("/api/staff/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSchedule),
      });
      setShowAdd(false);
      setNewSchedule({ staffId: "", date: "", startTime: "08:00", endTime: "16:00", role: "allrounder" });
      fetchData();
    } catch (e) {
      console.warn("SchichtplanPage error:", e);
    } finally {
      setSaving(false);
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      await fetch(`/api/staff/schedules?id=${id}`, { method: "DELETE" });
      fetchData();
    } catch (e) {
      console.warn("SchichtplanPage error:", e);
    }
  };

  const getSchedulesForDay = (dateStr: string) =>
    (data?.schedules ?? []).filter((s) => s.date.split("T")[0] === dateStr);

  const totalWeekCost = Object.values(data?.laborCostByDay ?? {}).reduce((s, c) => s + c, 0);
  const totalWeekHours = (data?.schedules ?? []).reduce((s, sch) => {
    const [sh, sm] = sch.startTime.split(":").map(Number);
    const [eh, em] = sch.endTime.split(":").map(Number);
    return s + (eh + em / 60) - (sh + sm / 60);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-section">{t("schichtplan.title")}</h1>
          <p className="text-meta mt-1">Wochenplanung mit Demand-Prognose</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={16} />
          {t("schichtplan.addShift")}
        </button>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset(weekOffset - 1)} className="btn-ghost p-2" aria-label="Vorherige Woche">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-medium">
            {weekDates[0].getDate()}.{weekDates[0].getMonth() + 1}. — {weekDates[6].getDate()}.{weekDates[6].getMonth() + 1}.
          </p>
          {weekOffset === 0 && <span className="text-meta text-xs">Diese Woche</span>}
        </div>
        <button onClick={() => setWeekOffset(weekOffset + 1)} className="btn-ghost p-2" aria-label="Nächste Woche">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Week Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center py-3">
          <Users size={16} className="mx-auto mb-1" style={{ color: "var(--color-accent-stress)" }} />
          <p className="text-number text-lg font-semibold">{totalWeekHours.toFixed(1)}h</p>
          <p className="text-meta">Arbeitsstunden</p>
        </div>
        <div className="card text-center py-3">
          <TrendingUp size={16} className="mx-auto mb-1" style={{ color: "var(--color-accent-waste)" }} />
          <p className="text-number text-lg font-semibold">{totalWeekCost.toFixed(0)} EUR</p>
          <p className="text-meta">Personalkosten</p>
        </div>
      </div>

      {/* Add Schedule Form */}
      {showAdd && (
        <form onSubmit={addSchedule} className="card space-y-3">
          <p className="text-sm font-medium">Neue Schicht</p>
          <select
            value={newSchedule.staffId}
            onChange={(e) => setNewSchedule({ ...newSchedule, staffId: e.target.value })}
            className="input-field"
            required
          >
            <option value="">{t("schichtplan.selectStaff")}</option>
            {(data?.staff ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
            ))}
          </select>
          <input
            type="date"
            value={newSchedule.date}
            onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
            className="input-field"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-meta text-xs">Von</label>
              <input
                type="time"
                value={newSchedule.startTime}
                onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-meta text-xs">Bis</label>
              <input
                type="time"
                value={newSchedule.endTime}
                onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "…" : t("common.add")}</button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">{t("common.cancel")}</button>
          </div>
        </form>
      )}

      {/* Week Grid */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {weekDates.map((date) => {
            const dateStr = date.toISOString().split("T")[0];
            const dow = date.getDay();
            const demand = data?.demandByDow[dow] ?? "normal";
            const daySchedules = getSchedulesForDay(dateStr);
            const dayCost = data?.laborCostByDay[dateStr] ?? 0;
            const isToday = dateStr === new Date().toISOString().split("T")[0];

            return (
              <div
                key={dateStr}
                className={`card ${isToday ? "ring-2" : ""}`}
                style={isToday ? { borderColor: "var(--color-accent-primary)", boxShadow: `0 0 0 2px color-mix(in srgb, var(--color-accent-primary) 20%, transparent)` } : {}}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {DAY_NAMES_FULL[dow]}, {date.getDate()}.{date.getMonth() + 1}.
                    </span>
                    {isToday && <span className="badge text-xs" style={{ backgroundColor: "color-mix(in srgb, var(--color-accent-primary) 12%, transparent)", color: "var(--color-accent-primary)" }}>Heute</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: DEMAND_COLORS[demand] }}>
                      {demand === "hoch" ? "Hoch" : demand === "ruhig" ? "Ruhig" : "Normal"}
                    </span>
                    {dayCost > 0 && <span className="text-meta text-xs">{dayCost.toFixed(0)} EUR</span>}
                  </div>
                </div>

                {daySchedules.length === 0 ? (
                  <p className="text-meta text-xs">Keine Schichten geplant</p>
                ) : (
                  <div className="space-y-1.5">
                    {daySchedules.map((sch) => (
                      <div key={sch.id} className="flex items-center justify-between text-sm py-1 px-2 rounded-lg" style={{ backgroundColor: "var(--color-track-bg)" }}>
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-meta" />
                          <span className="font-medium">{sch.staff.name}</span>
                          <span className="text-meta text-xs">{sch.role}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-number text-xs">{sch.startTime} — {sch.endTime}</span>
                          <button onClick={() => deleteSchedule(sch.id)} className="text-meta hover:text-red-500 transition-colors" aria-label="Löschen">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
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
