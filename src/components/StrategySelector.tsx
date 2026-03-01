"use client";

import { useState } from "react";
import type { StrategyMode } from "@/lib/engine/types";

const STRATEGIES: { mode: StrategyMode; label: string }[] = [
  { mode: "profit", label: "Max Profit" },
  { mode: "waste", label: "Low Waste" },
  { mode: "stress", label: "Low Stress" },
  { mode: "balanced", label: "Balanced" },
];

interface StrategySelectorProps {
  activeMode: StrategyMode;
  onChange?: (mode: StrategyMode) => void;
}

export function StrategySelector({ activeMode, onChange }: StrategySelectorProps) {
  const [selected, setSelected] = useState(activeMode);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (mode: StrategyMode) => {
    setSelected(mode);
    onChange?.(mode);
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyMode: mode }),
      });
    } catch (e) {
      console.warn("StrategySelector error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="card flex p-1 gap-1"
      role="radiogroup"
      aria-label="Strategie-Modus"
    >
      {STRATEGIES.map(({ mode, label }) => {
        const isActive = selected === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={saving}
            onClick={() => handleSelect(mode)}
            className={`flex-1 rounded-[var(--radius-button)] px-3 py-2 text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-[var(--color-accent-primary)] text-white shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[rgba(110,115,136,0.05)] dark:hover:bg-[rgba(255,255,255,0.06)]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
