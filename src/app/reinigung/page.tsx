"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { useT } from "@/i18n";

interface CleaningTask { id: string; name: string; area: string; frequency: string; assignedTo: string | null; }
interface CleaningLog { id: string; taskId: string; date: string; completedBy: string | null; task: CleaningTask; }

const AREA_LABELS: Record<string, string> = { kueche: "Kueche", theke: "Theke", gastraum: "Gastraum", lager: "Lager", wc: "WC" };
const AREA_OPTIONS = ["kueche", "theke", "gastraum", "lager", "wc"];

export default function ReinigungPage() {
  const { t } = useT();
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskArea, setNewTaskArea] = useState("kueche");

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const [tRes, lRes] = await Promise.all([fetch("/api/cleaning?type=tasks"), fetch(`/api/cleaning?date=${today}`)]);
      if (tRes.ok) { const d = await tRes.json(); setTasks(Array.isArray(d) ? d : d.items ?? []); }
      if (lRes.ok) { const d = await lRes.json(); setLogs(Array.isArray(d) ? d : d.items ?? []); }
    } catch { /* non-critical */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const completedTaskIds = new Set(logs.map(l => l.taskId));

  const markDone = async (taskId: string) => {
    setSaving(taskId);
    try {
      await fetch("/api/cleaning", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId }) });
      await fetchData();
    } catch { /* non-critical */ } finally { setSaving(null); }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    try {
      await fetch("/api/cleaning", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "task", name: newTaskName.trim(), area: newTaskArea }) });
      setNewTaskName("");
      setNewTaskArea("kueche");
      setShowAddTask(false);
      await fetchData();
    } catch { /* non-critical */ }
  };

  const tasksByArea = tasks.reduce<Record<string, CleaningTask[]>>((acc, t) => {
    if (!acc[t.area]) acc[t.area] = [];
    acc[t.area].push(t);
    return acc;
  }, {});

  const total = tasks.length;
  const done = tasks.filter(t => completedTaskIds.has(t.id)).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex items-center justify-between">
        <div><h1 className="text-greeting">{t("reinigung.title")}</h1><p className="text-meta mt-1">{t("reinigung.schedule")}</p></div>
        <button type="button" onClick={() => setShowAddTask(true)} className="btn-secondary text-sm flex items-center gap-1"><Plus size={14} /> {t("reinigung.addTask")}</button>
      </header>

      {showAddTask && (
        <form onSubmit={addTask} className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-section">Neue Aufgabe</h2>
            <button type="button" onClick={() => setShowAddTask(false)} className="p-1 rounded-lg hover:bg-[rgba(0,0,0,0.04)]" aria-label="Schliessen"><X size={16} /></button>
          </div>
          <input type="text" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} className="input-field" placeholder="Aufgabenname" autoFocus required />
          <select value={newTaskArea} onChange={(e) => setNewTaskArea(e.target.value)} className="input-field">
            {AREA_OPTIONS.map(a => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">Erstellen</button>
            <button type="button" onClick={() => setShowAddTask(false)} className="btn-secondary">{t("common.cancel")}</button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="flex justify-between mb-2 text-sm"><span>Fortschritt</span><span className="text-number">{done}/{total} ({percent}%)</span></div>
        <div className="h-1.5 rounded-full" style={{ backgroundColor: "var(--color-track-bg)" }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${percent}%`, backgroundColor: percent === 100 ? "var(--color-accent-profit)" : "var(--color-accent-primary)" }} />
        </div>
      </div>

      {loading ? <div className="card animate-pulse h-32" /> : (
        <div className="space-y-4">
          {Object.entries(tasksByArea).map(([area, areaTasks]) => (
            <section key={area}>
              <h2 className="text-card-title mb-2">{AREA_LABELS[area] || area}</h2>
              <div className="space-y-1">
                {areaTasks.map(task => {
                  const isDone = completedTaskIds.has(task.id);
                  return (
                    <button key={task.id} type="button" disabled={isDone || saving === task.id} onClick={() => markDone(task.id)}
                      className={`card w-full flex items-center gap-3 text-left transition-all duration-200 ${isDone ? "opacity-50" : "hover:shadow-md"}`}>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${isDone ? "border-[var(--color-accent-profit)] bg-[var(--color-accent-profit)]" : "border-[var(--color-border-subtle)]"}`}>
                        {isDone && <Check size={14} className="text-white" />}
                      </div>
                      <span className={`text-sm ${isDone ? "line-through" : "font-medium"}`}>{task.name}</span>
                      {task.assignedTo && <span className="text-meta ml-auto">{task.assignedTo}</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
