"use client";

import { useState } from "react";
import Link from "next/link";

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function runSeed() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const text = await res.text();
      setResult(res.ok ? `OK: ${text}` : `Fehler (${res.status}): ${text}`);
    } catch (e) {
      setResult(`Fehler: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-page-title">Demo-Daten</h1>
        <p className="text-meta mt-1">
          Ein Klick legt Produkte und Beispieldaten an, damit Verkauf/Eingabe sofort funktioniert.
        </p>
      </header>

      <button
        type="button"
        onClick={runSeed}
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? "Lade…" : "Demo-Daten laden"}
      </button>

      {result && (
        <pre className="card whitespace-pre-wrap text-sm">{result}</pre>
      )}

      <Link href="/eingabe" className="btn-secondary w-full text-center">
        Zur Eingabe (Verkauf)
      </Link>
    </div>
  );
}

