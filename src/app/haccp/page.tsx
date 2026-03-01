"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, ShieldCheck, AlertTriangle, X } from "lucide-react";
import { useT } from "@/i18n";

interface Template { id: string; name: string; category: string; description: string | null; frequency: string; }
interface HACCPCheck { id: string; templateId: string; date: string; value: string; isCompliant: boolean; notes: string | null; performedBy: string | null; template: Template; }

export default function HACCPPage() {
  const { t } = useT();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [checks, setChecks] = useState<HACCPCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [value, setValue] = useState("");
  const [compliant, setCompliant] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const [tRes, cRes] = await Promise.all([fetch("/api/haccp?type=templates"), fetch(`/api/haccp?date=${today}`)]);
      if (tRes.ok) { const d = await tRes.json(); setTemplates(Array.isArray(d) ? d : d.items ?? []); }
      if (cRes.ok) { const d = await cRes.json(); setChecks(Array.isArray(d) ? d : d.items ?? []); }
    } catch { /* non-critical */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!templateId || !value) return; setSaving(true);
    try {
      await fetch("/api/haccp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId, value, isCompliant: compliant, notes: notes || undefined }) });
      setShowForm(false); setValue(""); setNotes("");
      await fetchData();
    } catch { /* non-critical */ } finally { setSaving(false); }
  };

  const addTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    try {
      await fetch("/api/haccp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "template", name: newTemplateName.trim(), category: "temperatur" }) });
      setNewTemplateName("");
      setShowAddTemplate(false);
      await fetchData();
    } catch { /* non-critical */ }
  };

  const completedTemplateIds = new Set(checks.map(c => c.templateId));
  const pendingTemplates = templates.filter(t => !completedTemplateIds.has(t.id));

  return (
    <div className="space-y-6 pb-8">
      <header className="flex items-center justify-between">
        <div><h1 className="text-greeting">HACCP</h1><p className="text-meta mt-1">Lebensmittelsicherheit und Kontrollen</p></div>
        <button type="button" onClick={() => setShowAddTemplate(true)} className="btn-secondary text-sm flex items-center gap-1"><Plus size={14} /> Template</button>
      </header>

      {showAddTemplate && (
        <form onSubmit={addTemplate} className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-section">Neues Template</h2>
            <button type="button" onClick={() => setShowAddTemplate(false)} className="p-1 rounded-lg hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)]" aria-label="Schliessen"><X size={16} /></button>
          </div>
          <input type="text" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} className="input-field" placeholder="Template-Name" autoFocus required />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">Erstellen</button>
            <button type="button" onClick={() => setShowAddTemplate(false)} className="btn-secondary">Abbrechen</button>
          </div>
        </form>
      )}

      {pendingTemplates.length > 0 && (
        <div className="card stripe-warning">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} style={{ color: "var(--color-accent-warning)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--color-accent-warning)" }}>{pendingTemplates.length} Kontrollen offen</span>
          </div>
          <div className="space-y-1">
            {pendingTemplates.map(t => (
              <button key={t.id} type="button" onClick={() => { setTemplateId(t.id); setShowForm(true); }} className="w-full text-left text-sm p-2 rounded-lg hover:bg-[rgba(110, 115, 136,0.04)] transition-colors">
                {t.name} ({t.category})
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-section">Kontrolle erfassen</h2>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)]" aria-label="Schliessen"><X size={16} /></button>
          </div>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="input-field" required>
            <option value="">Template waehlen</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="text" value={value} onChange={(e) => setValue(e.target.value)} className="input-field" placeholder="Wert (z.B. 4.5 oder OK)" required />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={compliant} onChange={(e) => setCompliant(e.target.checked)} /> {t("haccp.compliant")}
          </label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field" placeholder="Notizen (optional)" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? t("common.loading") : t("common.save")}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{t("common.cancel")}</button>
          </div>
        </form>
      )}

      <section>
        <h2 className="text-section mb-3">{t("haccp.monthlyReport")}</h2>
        {loading ? <div className="card animate-pulse h-20" /> : checks.length === 0 ? (
          <p className="text-meta text-center py-4">{t("common.noData")}</p>
        ) : (
          <div className="space-y-2">
            {checks.map(c => (
              <div key={c.id} className={`card flex items-center justify-between ${c.isCompliant ? "stripe-profit" : "stripe-warning"}`}>
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5"><ShieldCheck size={14} /> {c.template.name}</p>
                  <p className="text-meta">{new Date(c.date).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}{c.notes ? ` — ${c.notes}` : ""}</p>
                </div>
                <span className="text-number font-medium" style={{ color: c.isCompliant ? "var(--color-accent-profit)" : "var(--color-accent-warning)" }}>{c.value}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
