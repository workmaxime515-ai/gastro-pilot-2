"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/i18n";

const LOCATIONS = [
  "Kühlschrank 1",
  "Kühlschrank 2",
  "Vitrine",
  "Lager",
] as const;

interface TempLog {
  id: string;
  equipment: string;
  temperature: number;
  inRange: boolean;
  recordedAt: string;
}

function getTempColor(temp: number): "green" | "yellow" | "red" {
  if (temp >= 2 && temp <= 8) return "green";
  if ((temp >= 0 && temp < 2) || (temp > 8 && temp <= 10)) return "yellow";
  return "red";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TemperaturPage() {
  const { t } = useT();
  const [logs, setLogs] = useState<TempLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<string>(LOCATIONS[0]);
  const [temp, setTemp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/temp-log");
      const data = await res.json();
      if (res.ok) setLogs(data);
      else setError(data.error ?? t("common.loadFailed"));
    } catch (e) {
      console.error(e);
      setError(t("common.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tempValue = parseFloat(temp.replace(",", "."));
    if (isNaN(tempValue)) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/temp-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipment: location, temperature: tempValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("common.error"));
      setTemp("");
      await fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const today = new Date().toLocaleDateString("de-DE");
    const header = "Standort;Temperatur (°C);Zeit;Status\n";
    const rows = logs
      .map((l) => {
        const color = getTempColor(l.temperature);
        const status = color === "green" ? "OK" : color === "yellow" ? "Warnung" : "Außerhalb";
        return `${l.equipment};${l.temperature.toFixed(1)};${formatTime(l.recordedAt)};${status}`;
      })
      .join("\n");
    const csv = header + rows;
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Temperaturprotokoll_${today.replace(/\./g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold text-text-primary dark:text-dark-text">
          {t("temperatur.title")}
        </h1>
        <div className="space-y-4 animate-pulse">
          <div className="card h-32 rounded-card bg-text-secondary/10 dark:bg-dark-text-secondary/20" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 rounded-card bg-text-secondary/10 dark:bg-dark-text-secondary/20"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold text-text-primary dark:text-dark-text">
          {t("temperatur.title")}
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
          Lebensmittelhygiene – Protokoll für das Gesundheitsamt
        </p>
      </header>

      {error && (
        <div className="card border-waste/30 bg-waste/5 text-waste">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchLogs}
            className="btn-secondary mt-3"
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      {/* Quick entry form */}
      <form onSubmit={handleSubmit} className="card space-y-4">
        <h2 className="font-heading text-lg font-semibold text-text-primary dark:text-dark-text">
          Schnelleintrag
        </h2>
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[140px] flex-1">
            <label
              htmlFor="temp-location"
              className="mb-1 block text-sm font-medium text-text-primary dark:text-dark-text"
            >
              {t("temperatur.location")}
            </label>
            <select
              id="temp-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input-field"
              aria-label={t("temperatur.location")}
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[100px] flex-1">
            <label
              htmlFor="temp-value"
              className="mb-1 block text-sm font-medium text-text-primary dark:text-dark-text"
            >
              {t("temperatur.temp")}
            </label>
            <input
              id="temp-value"
              type="number"
              step="0.1"
              value={temp}
              onChange={(e) => setTemp(e.target.value)}
              placeholder="z.B. 4.5"
              className="input-field"
              required
              aria-label="Temperatur in Grad Celsius"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full sm:w-auto"
        >
          {submitting ? "…" : t("temperatur.addReading")}
        </button>
      </form>

      {/* Today's logs */}
      <section aria-labelledby="logs-title">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="logs-title"
            className="font-heading text-lg font-semibold text-text-primary dark:text-dark-text"
          >
            Heutige Einträge
          </h2>
          <button
            type="button"
            onClick={handleExport}
            className="btn-secondary text-sm"
          >
            {t("temperatur.exportCSV")}
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="card text-center text-text-secondary dark:text-dark-text-secondary">
            <p>Noch keine Einträge heute.</p>
            <p className="mt-1 text-sm">
              Nutze den Schnelleintrag oben.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => {
              const color = getTempColor(log.temperature);
              const bgClass =
                color === "green"
                  ? "border-profit/30 bg-profit/10"
                  : color === "yellow"
                    ? "border-stress/30 bg-stress/10"
                    : "border-waste/30 bg-waste/10";
              return (
                <li key={log.id}>
                  <div
                    className={`card flex items-center justify-between gap-3 border-l-4 ${bgClass}`}
                  >
                    <div>
                      <p className="font-medium text-text-primary dark:text-dark-text">
                        {log.equipment}
                      </p>
                      <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                        {formatTime(log.recordedAt)}
                      </p>
                    </div>
                    <span
                      className={`text-xl font-semibold ${
                        color === "green"
                          ? "text-profit"
                          : color === "yellow"
                            ? "text-stress"
                            : "text-waste"
                      }`}
                    >
                      {log.temperature.toFixed(1)} °C
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-center text-sm text-text-secondary dark:text-dark-text-secondary">
        <Link href="/" className="text-accent hover:underline">
          ← {t("common.back")} zur {t("nav.startpage")}
        </Link>
      </p>
    </div>
  );
}
