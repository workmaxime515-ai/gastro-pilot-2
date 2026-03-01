"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Package, Check, X } from "lucide-react";
import { useT } from "@/i18n";

interface OrderItem { id: string; productName: string; quantity: number; unit: string; pricePerUnit: number; totalPrice: number; }
interface Supplier { id: string; name: string; }
interface Order { id: string; supplierId: string; orderDate: string; deliveryDate: string | null; status: string; totalAmount: number; notes: string | null; supplier: Supplier; items: OrderItem[]; }

const STATUS_LABELS: Record<string, string> = { draft: "Entwurf", ordered: "Bestellt", delivered: "Geliefert", cancelled: "Storniert" };
const STATUS_COLORS: Record<string, string> = { draft: "var(--color-text-secondary)", ordered: "var(--color-accent-primary)", delivered: "var(--color-accent-profit)", cancelled: "var(--color-accent-warning)" };

export default function BestellungenPage() {
  const { t } = useT();
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState([{ productName: "", quantity: 0, unit: "stk", pricePerUnit: 0 }]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [oRes, sRes] = await Promise.all([fetch("/api/purchase-orders"), fetch("/api/suppliers")]);
      if (oRes.ok) { const d = await oRes.json(); setOrders(Array.isArray(d) ? d : d.items ?? []); }
      if (sRes.ok) { const d = await sRes.json(); setSuppliers(Array.isArray(d) ? d : d.items ?? []); }
    } catch (e) { console.warn("BestellungenPage error:", e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (id: string, status: string) => {
    try { await fetch("/api/purchase-orders", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }); await fetchData(); } catch (e) { console.warn("BestellungenPage error:", e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!supplierId) return; setSaving(true);
    try {
      await fetch("/api/purchase-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId, items: items.filter(i => i.productName) }) });
      setShowForm(false); setItems([{ productName: "", quantity: 0, unit: "stk", pricePerUnit: 0 }]);
      await fetchData();
    } catch (e) { console.warn("BestellungenPage error:", e); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 pb-8">
      <header className="flex items-center justify-between">
        <div><h1 className="text-greeting">Bestellungen</h1><p className="text-meta mt-1">Purchase Orders verwalten</p></div>
        <button type="button" onClick={() => setShowForm(!showForm)} className="btn-primary text-sm flex items-center gap-1"><Plus size={16} /> Neu</button>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <h2 className="text-section">Neue Bestellung</h2>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input-field" required>
            <option value="">Lieferant waehlen</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input type="text" value={item.productName} onChange={(e) => { const u = [...items]; u[i].productName = e.target.value; setItems(u); }} className="input-field flex-1" placeholder="Produkt" />
              <input type="number" value={item.quantity || ""} onChange={(e) => { const u = [...items]; u[i].quantity = parseFloat(e.target.value) || 0; setItems(u); }} className="input-field w-20" placeholder="Menge" />
              <input type="number" step="0.01" value={item.pricePerUnit || ""} onChange={(e) => { const u = [...items]; u[i].pricePerUnit = parseFloat(e.target.value) || 0; setItems(u); }} className="input-field w-24" placeholder="Preis" />
            </div>
          ))}
          <button type="button" onClick={() => setItems([...items, { productName: "", quantity: 0, unit: "stk", pricePerUnit: 0 }])} className="btn-secondary text-sm">+ Position</button>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "..." : t("common.confirm")}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{t("common.cancel")}</button>
          </div>
        </form>
      )}

      {loading ? <div className="card animate-pulse h-32" /> : orders.length === 0 ? (
        <p className="text-meta text-center py-8">{t("common.noData")}</p>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium flex items-center gap-2"><Package size={16} /> {o.supplier.name}</p>
                  <p className="text-meta">{new Date(o.orderDate).toLocaleDateString("de-DE")} | {o.items.length} Positionen</p>
                </div>
                <span className="text-sm font-medium" style={{ color: STATUS_COLORS[o.status] }}>{t(`bestellungen.orderStatus.${o.status}`)}</span>
              </div>
              <p className="text-number font-medium">{o.totalAmount.toFixed(2)} EUR</p>
              {o.status === "draft" && (
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => updateStatus(o.id, "ordered")} className="btn-primary text-sm flex items-center gap-1" aria-label={t("bestellungen.orderStatus.ordered")}><Check size={14} /> {t("bestellungen.orderStatus.ordered")}</button>
                  <button type="button" onClick={() => updateStatus(o.id, "cancelled")} className="btn-secondary text-sm flex items-center gap-1" aria-label={t("bestellungen.orderStatus.cancelled")}><X size={14} /> {t("bestellungen.orderStatus.cancelled")}</button>
                </div>
              )}
              {o.status === "ordered" && (
                <button type="button" onClick={() => updateStatus(o.id, "delivered")} className="btn-primary text-sm mt-2">Als geliefert markieren</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
