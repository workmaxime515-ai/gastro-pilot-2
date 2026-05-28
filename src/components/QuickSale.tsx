"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/i18n";
import { toArray } from "@/lib/api-helpers";
import { ShoppingBag } from "lucide-react";

type Product = {
  id: string;
  name: string;
  sellPrice: number;
  isActive: boolean;
};

type QuickSaleProps = {
  onSold?: () => void;
};

export function QuickSale({ onSold }: QuickSaleProps) {
  const { t } = useT();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/products?all=true")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = toArray<Product>(data).filter((p) => p.isActive !== false);
        setProducts(list);
        if (list.length > 0) setProductId(list[0].id);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  const sell = useCallback(async () => {
    if (!productId) {
      setMessage({ type: "err", text: t("common.noData") });
      return;
    }
    setLoading(true);
    setMessage(null);
    const key = `manual-${productId}-${Date.now()}-${qty}`;
    try {
      const res = await fetch("/api/sales/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          qty,
          source: "quick_sale",
          idempotencyKey: key,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("common.saveFailed"));

      const product = products.find((p) => p.id === productId);
      setMessage({
        type: "ok",
        text: data.idempotent
          ? `${product?.name ?? ""} — ${t("manager.saleAlreadyRecorded")}`
          : `${qty}× ${product?.name ?? ""} — ${data.revenue?.toFixed(2) ?? ""} €`,
      });
      onSold?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("manager-data-changed"));
      }
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : t("common.saveFailed"),
      });
    } finally {
      setLoading(false);
    }
  }, [productId, qty, products, t, onSold]);

  const selected = products.find((p) => p.id === productId);

  return (
    <section className="card space-y-3" aria-label={t("manager.quickSale")}>
      <div className="flex items-center gap-2">
        <ShoppingBag size={18} style={{ color: "var(--color-accent-primary)" }} />
        <h2 className="text-sm font-semibold">{t("manager.quickSale")}</h2>
      </div>

      {loadingProducts ? (
        <p className="text-meta">{t("common.loading")}</p>
      ) : products.length === 0 ? (
        <p className="text-meta">{t("manager.noProducts")}</p>
      ) : (
        <>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="input-field min-h-[48px] w-full"
            aria-label={t("eingabe.product")}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.sellPrice.toFixed(2)} €
              </option>
            ))}
          </select>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-text-secondary/20 text-xl font-bold"
              aria-label="-1"
            >
              −
            </button>
            <span
              className="min-w-[3ch] text-center text-2xl font-semibold"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-text-secondary/20 text-xl font-bold"
              aria-label="+1"
            >
              +
            </button>
            {selected && (
              <span className="ml-auto text-meta">
                = {(qty * selected.sellPrice).toFixed(2)} €
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => void sell()}
            disabled={loading}
            className="btn-primary w-full min-h-[52px] text-lg"
          >
            {loading ? t("common.loading") : t("manager.sell")}
          </button>
        </>
      )}

      {message && (
        <p
          className="text-sm rounded-lg px-3 py-2"
          role="status"
          style={{
            color: message.type === "ok" ? "var(--color-accent-profit)" : "var(--color-accent-stress)",
            backgroundColor:
              message.type === "ok"
                ? "rgba(72, 160, 120, 0.12)"
                : "rgba(200, 80, 80, 0.12)",
          }}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
