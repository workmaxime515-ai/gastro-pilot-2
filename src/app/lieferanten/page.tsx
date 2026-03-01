"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Phone, Mail } from "lucide-react";
import { useT } from "@/i18n";

interface SupplierProduct { id: string; productName: string; unit: string; pricePerUnit: number; }
interface Supplier { id: string; name: string; contactPerson: string | null; email: string | null; phone: string | null; deliveryDays: string | null; minOrderAmount: number; isActive: boolean; products: SupplierProduct[]; }

export default function LieferantenPage() {
  const { t } = useT();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    try { const res = await fetch("/api/suppliers"); if (res.ok) { const d = await res.json(); setSuppliers(Array.isArray(d) ? d : d.items ?? []); } } catch (e) { console.warn("LieferantenPage error:", e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!name) return; setSaving(true);
    try {
      await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, contactPerson: contact, email, phone }) });
      setShowForm(false); setName(""); setContact(""); setEmail(""); setPhone("");
      await fetchSuppliers();
    } catch (e) { console.warn("LieferantenPage error:", e); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 pb-8">
      <header className="flex items-center justify-between">
        <div><h1 className="text-greeting">Lieferanten</h1><p className="text-meta mt-1">Verwaltung und Kontakte</p></div>
        <button type="button" onClick={() => setShowForm(!showForm)} className="btn-primary text-sm flex items-center gap-1"><Plus size={16} /> Neu</button>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <h2 className="text-section">{t("lieferanten.addSupplier")}</h2>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder={t("common.name")} required />
          <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} className="input-field" placeholder={t("lieferanten.contactPerson")} />
          <div className="grid grid-cols-2 gap-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder={t("lieferanten.email")} />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder={t("lieferanten.phone")} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? t("common.loading") : t("common.save")}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{t("common.cancel")}</button>
          </div>
        </form>
      )}

      {loading ? <div className="card animate-pulse h-32" /> : suppliers.length === 0 ? (
        <p className="text-meta text-center py-8">{t("common.noData")}</p>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{s.name}</p>
                  {s.contactPerson && <p className="text-meta">{s.contactPerson}</p>}
                  <p className="text-meta">{s.products.length} {t("lieferanten.products")}</p>
                </div>
                <div className="flex gap-2">
                  {s.phone && <a href={`tel:${s.phone}`} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[rgba(110, 115, 136,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)]" style={{ color: "var(--color-accent-profit)" }}><Phone size={16} /></a>}
                  {s.email && <a href={`mailto:${s.email}`} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[rgba(110, 115, 136,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)]" style={{ color: "var(--color-accent-primary)" }}><Mail size={16} /></a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
