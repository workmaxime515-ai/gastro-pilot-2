"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckmarkAnimation, ConfidenceBar } from "@/components/animations";
import { ChevronDown, Clock, Check, SkipForward, Timer } from "lucide-react";
import { useT } from "@/i18n";
import type { SuggestionCategory, Difficulty } from "@/lib/engine/types";

const CATEGORY_STRIPE: Record<SuggestionCategory, string> = {
  profit: "stripe-profit",
  waste: "stripe-waste",
  stress: "stripe-stress",
  emergency: "stripe-warning",
  marketing: "stripe-marketing",
  revenue: "stripe-profit",
};

const CATEGORY_COLOR: Record<SuggestionCategory, string> = {
  profit: "var(--color-accent-profit)",
  waste: "var(--color-accent-waste)",
  stress: "var(--color-accent-stress)",
  emergency: "var(--color-accent-warning)",
  marketing: "var(--color-accent-primary)",
  revenue: "var(--color-accent-profit)",
};

export interface SuggestionProps {
  id?: string | number;
  type: string;
  category: SuggestionCategory;
  title: string;
  description: string;
  timing?: string | null;
  reasoning: string;
  expectedImpact: { revenue?: number; waste?: number; stress?: string } | string;
  confidence: number;
  riskLevel: string;
  difficulty: Difficulty;
  inactionRisk?: string | null;
}

interface SuggestionCardProps {
  suggestion: SuggestionProps;
  onDone?: () => void;
  onSkip?: () => void;
  onLater?: () => void;
}

export function SuggestionCard({ suggestion, onDone, onSkip, onLater }: SuggestionCardProps) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const stripe = CATEGORY_STRIPE[suggestion.category] ?? "stripe-stress";
  const catColor = CATEGORY_COLOR[suggestion.category] ?? "var(--color-accent-stress)";

  const formatImpact = () => {
    const impact =
      typeof suggestion.expectedImpact === "string"
        ? (() => { try { return JSON.parse(suggestion.expectedImpact) as { revenue?: number; waste?: number; stress?: string }; } catch { return {}; } })()
        : suggestion.expectedImpact ?? {};
    const parts: string[] = [];
    if (impact.revenue != null) parts.push(`${impact.revenue > 0 ? "+" : ""}EUR ${impact.revenue}`);
    if (impact.waste != null) parts.push(`Waste ${impact.waste > 0 ? "+" : ""}${impact.waste}%`);
    if (impact.stress) {
      parts.push(impact.stress === "reduces" ? t("suggestions.stressDown") : impact.stress === "increases" ? t("suggestions.stressUp") : t("suggestions.neutral"));
    }
    return parts;
  };

  const handleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
    setJustCompleted(true);
    setTimeout(() => onDone?.(), 600);
  };

  const confidenceColor =
    suggestion.confidence >= 75 ? "var(--color-accent-profit)"
    : suggestion.confidence >= 50 ? "var(--color-accent-primary)"
    : "var(--color-accent-waste)";

  return (
    <article
      role="article"
      aria-expanded={expanded}
      aria-label={suggestion.title}
      className={`card overflow-hidden ${stripe} p-0`}
    >
      {/* Main clickable area */}
      <button
        type="button"
        className="w-full p-4 pb-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)] focus-visible:ring-inset"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        {/* Top row: category + timing */}
        <div className="mb-2 flex items-center gap-2">
          <span
            className="text-meta font-semibold uppercase tracking-wide"
            style={{ color: catColor }}
          >
            {t(`suggestions.${suggestion.category}`)}
          </span>
          <span className="text-meta">
            {t(`suggestions.${suggestion.difficulty}`)}
          </span>
          {suggestion.timing && (
            <span className="ml-auto flex items-center gap-1 text-meta font-medium" style={{ color: "var(--color-accent-primary)" }}>
              <Clock size={12} />
              {suggestion.timing}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-card-title" style={{ color: "var(--color-text-primary)" }}>
          {suggestion.title}
        </h3>

        {/* Impact pills */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {formatImpact().map((imp, i) => (
            <span key={i} className="text-meta font-medium text-number">
              {imp}
            </span>
          ))}
          <span className="text-meta">
            {suggestion.riskLevel === "low" ? t("suggestions.lowRisk") : suggestion.riskLevel === "high" ? t("suggestions.highRisk") : t("suggestions.medRisk")}
          </span>
        </div>

        {/* Confidence bar */}
        <div className="mt-3 flex items-center gap-2.5">
          <div className="flex-1">
            <ConfidenceBar value={suggestion.confidence} color={confidenceColor} />
          </div>
          <span className="text-meta text-number font-medium min-w-[2.5rem] text-right">
            {suggestion.confidence}%
          </span>
        </div>

        {/* Expand indicator */}
        <div className="mt-2 flex items-center gap-1 text-meta">
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
          {expanded ? t("suggestions.less") : t("suggestions.details")}
        </div>
      </button>

      {/* Expandable details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: "var(--color-border-subtle)" }}>
              {/* Reasoning */}
              <div className="space-y-3">
                <div>
                  <p className="text-meta font-semibold uppercase tracking-wide mb-1">
                    {t("suggestions.reasoning")}
                  </p>
                  <p className="text-body" style={{ color: "var(--color-text-primary)" }}>
                    {suggestion.reasoning}
                  </p>
                </div>
                {suggestion.inactionRisk && (
                  <div>
                    <p className="text-meta font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--color-accent-warning)" }}>
                      {t("suggestions.riskOfInaction")}
                    </p>
                    <p className="text-body" style={{ color: "var(--color-text-primary)" }}>
                      {suggestion.inactionRisk}
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <AnimatePresence mode="wait">
                  {justCompleted ? (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="flex items-center gap-2"
                    >
                      <CheckmarkAnimation />
                      <span className="font-medium" style={{ color: "var(--color-accent-profit)" }}>
                        {t("suggestions.done")}
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="btns"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, ease: "easeInOut" }}
                      className="flex flex-wrap gap-2"
                    >
                      <button
                        type="button"
                        onClick={handleDone}
                        className="flex items-center gap-1.5 rounded-[var(--radius-button)] px-4 py-2 text-sm font-medium text-white transition-colors duration-200"
                        style={{ backgroundColor: "var(--color-accent-profit)" }}
                      >
                        <Check size={16} />
                        {t("suggestions.done")}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onSkip?.(); }}
                        className="btn-secondary flex items-center gap-1.5 py-2 text-sm"
                      >
                        <SkipForward size={16} />
                        {t("suggestions.skipped")}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onLater?.(); }}
                        className="btn-secondary flex items-center gap-1.5 py-2 text-sm"
                      >
                        <Timer size={16} />
                        {t("suggestions.later")}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
