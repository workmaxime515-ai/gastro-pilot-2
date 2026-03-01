"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/i18n";

interface ChecklistItem {
  id: string;
  templateId: string;
  text: string;
  group: string;
  notes?: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  entryNotes?: string | null;
}

interface ChecklistGroup {
  group: string;
  items: ChecklistItem[];
}

interface ChecklistResponse {
  items: ChecklistItem[];
  grouped: ChecklistGroup[];
}

function formatTimeSince(openingTime: string): string {
  const now = new Date();
  const [h, m] = openingTime.split(":").map(Number);
  const open = new Date(now);
  open.setHours(h, m, 0, 0);
  if (now < open) return "Noch nicht geöffnet";
  const diffMs = now.getTime() - open.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `Geöffnet seit ${diffMins} Min.`;
  const hh = Math.floor(diffMins / 60);
  const mm = diffMins % 60;
  return `Geöffnet seit ${hh}h ${mm}min`;
}

export default function ChecklistePage() {
  const { t } = useT();
  const [data, setData] = useState<ChecklistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openTime, setOpenTime] = useState("06:00");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchChecklist = useCallback(async () => {
    try {
      setError(null);
      const [checkRes, settingsRes] = await Promise.all([
        fetch("/api/checklist"),
        fetch("/api/settings"),
      ]);
      const checklistJson = await checkRes.json();
      const settingsJson = await settingsRes.json();
      if (checkRes.ok) setData(checklistJson);
      else setError(checklistJson.error ?? "Fehler beim Laden");
      if (settingsRes.ok && settingsJson.openTime)
        setOpenTime(settingsJson.openTime);
    } catch (e) {
      console.error(e);
      setError("Checklist konnte nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const toggleItem = async (item: ChecklistItem) => {
    if (togglingId) return;
    setTogglingId(item.id);
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: item.templateId,
          isCompleted: !item.isCompleted,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? t("common.error"));
      }
      await fetchChecklist();
    } catch (e) {
      console.error(e);
      setError(t("common.saveFailed"));
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold text-text-primary dark:text-dark-text">
          {t("checkliste.title")}
        </h1>
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card">
              <div className="mb-3 h-5 w-32 rounded bg-text-secondary/20 dark:bg-dark-text-secondary/20" />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className="h-12 rounded bg-text-secondary/10 dark:bg-dark-text-secondary/20"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold text-text-primary dark:text-dark-text">
          {t("checkliste.title")}
        </h1>
        <div className="card border-waste/30 bg-waste/5 text-waste">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchChecklist}
            className="btn-secondary mt-3"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  const total = data?.items.length ?? 0;
  const completed = data?.items.filter((i) => i.isCompleted).length ?? 0;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-text-primary dark:text-dark-text">
            Morgen-Checkliste
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
            Tägliche Öffnungsprozedur
          </p>
        </div>
        <p
          className="text-sm text-text-secondary dark:text-dark-text-secondary"
          aria-live="polite"
        >
          {formatTimeSince(openTime)}
        </p>
      </header>

      {/* Progress */}
      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary dark:text-dark-text">
            Fortschritt
          </span>
          <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
            {completed}/{total} ({percent}%)
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-text-secondary/10 dark:bg-dark-text-secondary/20">
          <div
            className="h-full rounded-full bg-profit transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {percent === 100 && (
        <div
          className="card flex items-center gap-3 bg-profit/15 text-profit"
          role="status"
          aria-live="polite"
        >
          <span className="text-2xl" aria-hidden="true">
            ✓
          </span>
          <span className="font-medium">Alles erledigt ✓</span>
        </div>
      )}

      {/* Grouped items */}
      <div className="space-y-4">
        {data?.grouped.map((g) => (
          <section
            key={g.group}
            className="card"
            aria-labelledby={`group-${g.group.replace(/\s/g, "-")}`}
          >
            <h2
              id={`group-${g.group.replace(/\s/g, "-")}`}
              className="mb-3 font-heading text-lg font-semibold text-text-primary dark:text-dark-text"
            >
              {g.group}
            </h2>
            <ul className="space-y-2">
              {g.items.map((item) => (
                <li key={item.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-text-secondary/5 dark:hover:bg-dark-text-secondary/10 ${
                      item.isCompleted
                        ? "text-text-secondary dark:text-dark-text-secondary line-through"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      onChange={() => toggleItem(item)}
                      disabled={togglingId === item.id}
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-text-secondary/30 text-accent focus:ring-accent"
                      aria-label={`${item.text} ${item.isCompleted ? "erledigt" : "nicht erledigt"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{item.text}</span>
                      {item.notes && (
                        <span className="ml-1 text-sm text-text-secondary dark:text-dark-text-secondary">
                          — {item.notes}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="text-center text-sm text-text-secondary dark:text-dark-text-secondary">
        <Link href="/" className="text-accent hover:underline">
          ← Zurück zur Startseite
        </Link>
      </p>
    </div>
  );
}
