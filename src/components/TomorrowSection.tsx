"use client";

import { useState } from "react";
import { ChevronDown, Sunrise } from "lucide-react";
import type { SuggestionProps } from "@/components/SuggestionCard";

interface TomorrowSectionProps {
  suggestions: SuggestionProps[];
}

export function TomorrowSection({ suggestions }: TomorrowSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (suggestions.length === 0) return null;

  return (
    <section className="card">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between text-left focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <Sunrise size={18} style={{ color: "var(--color-accent-primary)" }} />
          <h2 className="text-card-title" style={{ color: "var(--color-text-primary)" }}>
            Morgen vorbereiten
          </h2>
          <span className="text-meta">({suggestions.length})</span>
        </div>
        <ChevronDown
          size={18}
          className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          style={{ color: "var(--color-text-secondary)" }}
        />
      </button>

      {expanded && (
        <ul className="mt-3 space-y-2">
          {suggestions.map((s, i) => (
            <li
              key={s.id ?? `tomorrow-${i}`}
              className="rounded-[var(--radius-button)] p-3 bg-[rgba(110,115,136,0.06)] dark:bg-[rgba(255,255,255,0.06)]"
            >
              <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                {s.title}
              </p>
              <p className="text-meta mt-0.5">{s.description}</p>
              {s.timing && (
                <p className="text-meta mt-1 font-medium" style={{ color: "var(--color-accent-primary)" }}>
                  {s.timing}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
