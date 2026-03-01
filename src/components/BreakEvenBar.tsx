"use client";

import { ConfidenceBar, AnimatedNumber } from "@/components/animations";
import { useT } from "@/i18n";

interface BreakEvenBarProps {
  dailyCost: number;
  currentRevenue: number;
  remainingTarget: number;
  coffeeEquivalent: number;
  isAchieved: boolean;
}

export function BreakEvenBar({
  dailyCost,
  currentRevenue,
  coffeeEquivalent,
  isAchieved,
}: BreakEvenBarProps) {
  const { t } = useT();
  const hasData = dailyCost > 0;
  const progress = hasData ? Math.min(100, (currentRevenue / dailyCost) * 100) : 0;
  const color = isAchieved ? "var(--color-accent-profit)" : "var(--color-accent-primary)";

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-meta font-semibold uppercase tracking-wide">
          {t("breakeven.title")}
        </p>
        {hasData && (
          <span className="text-number text-meta font-medium">
            <AnimatedNumber value={Math.round(progress)} suffix="%" />
          </span>
        )}
      </div>

      {hasData ? (
        <>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: "var(--color-track-bg)" }}
          >
            <ConfidenceBar value={progress} color={color} className="max-w-none" />
          </div>

          <p className="mt-2 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {isAchieved ? (
              t("breakeven.achieved")
            ) : (
              t("breakeven.remaining", { count: coffeeEquivalent })
            )}
          </p>
        </>
      ) : (
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          {t("breakeven.noData")}
        </p>
      )}
    </div>
  );
}
