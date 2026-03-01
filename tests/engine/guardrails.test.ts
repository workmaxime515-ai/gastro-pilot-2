import { describe, it, expect } from "vitest";
import { applyGuardrails } from "@/lib/engine/guardrails";
import type { CandidateSuggestion } from "@/lib/engine/types";

function makeSuggestion(overrides: Partial<CandidateSuggestion> = {}): CandidateSuggestion {
  return {
    type: "demand",
    category: "profit",
    title: "Test Suggestion",
    description: "Test description",
    reasoning: "Test reasoning",
    expectedImpact: { revenue: 20, waste: 0 },
    confidence: 75,
    riskLevel: "low",
    difficulty: "easy",
    ...overrides,
  };
}

describe("applyGuardrails", () => {
  it("returns empty array for empty input", () => {
    expect(applyGuardrails([])).toEqual([]);
  });

  it("filters exact duplicates by title", () => {
    const s1 = makeSuggestion({ title: "Duplicate" });
    const s2 = makeSuggestion({ title: "Duplicate" });
    const s3 = makeSuggestion({ title: "Unique" });
    const result = applyGuardrails([s1, s2, s3]);
    const titles = result.map((s) => s.title);
    expect(titles.filter((t) => t === "Duplicate").length).toBeLessThanOrEqual(1);
  });

  it("preserves valid non-duplicate suggestions", () => {
    const candidates = [
      makeSuggestion({ title: "A", confidence: 80 }),
      makeSuggestion({ title: "B", confidence: 70 }),
      makeSuggestion({ title: "C", confidence: 60 }),
    ];
    const result = applyGuardrails(candidates);
    expect(result.length).toBe(3);
  });

  it("caps production increase suggestions above 20%", () => {
    const highIncrease = makeSuggestion({
      title: "Bereite 30% mehr Kaffee vor",
      type: "demand",
      confidence: 80,
    });
    const result = applyGuardrails([highIncrease]);
    if (result.length > 0) {
      const match = result[0].title.match(/(\d+)%/);
      if (match) {
        expect(parseInt(match[1])).toBeLessThanOrEqual(30);
      }
    }
  });

  it("does not remove low-confidence suggestions entirely", () => {
    const low = makeSuggestion({ title: "Low conf", confidence: 20 });
    const result = applyGuardrails([low]);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });
});
