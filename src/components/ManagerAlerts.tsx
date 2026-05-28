"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useT } from "@/i18n";

type AlertRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  action: string | null;
  productId: string | null;
  ingredientId: string | null;
};

function alertHref(a: AlertRow): string | null {
  if (a.type === "recipe_pending") return "/rezepte";
  if (a.type === "low_stock") return "/eingabe";
  return null;
}

export function ManagerAlerts() {
  const { t } = useT();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);

  const load = useCallback(() => {
    fetch("/api/manager/alerts?limit=3")
      .then((r) => (r.ok ? r.json() : { alerts: [] }))
      .then((d) => setAlerts(Array.isArray(d.alerts) ? d.alerts : []))
      .catch(() => setAlerts([]));
  }, []);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener("manager-data-changed", onChange);
    return () => window.removeEventListener("manager-data-changed", onChange);
  }, [load]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2" aria-label={t("manager.alertsTitle")}>
      {alerts.map((a) => {
        const href = alertHref(a);
        const inner = (
          <div className="card flex gap-3 items-start py-3 px-4 border-l-4 border-[var(--color-accent-warning)]">
            <AlertTriangle
              size={20}
              className="shrink-0 mt-0.5"
              style={{ color: "var(--color-accent-warning)" }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{a.title}</p>
              <p className="text-meta text-sm">{a.message}</p>
              {a.action && (
                <p className="text-sm mt-1 text-accent font-medium">{a.action}</p>
              )}
            </div>
          </div>
        );
        return href ? (
          <Link key={a.id} href={href} className="block hover:opacity-90">
            {inner}
          </Link>
        ) : (
          <div key={a.id}>{inner}</div>
        );
      })}
    </div>
  );
}
