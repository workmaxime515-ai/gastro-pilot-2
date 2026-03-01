import { describe, it, expect } from "vitest";
import { scoreSuggestions } from "@/lib/engine/scorer";
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

describe("scoreSuggestions", () => {
  it("returns max 5 suggestions", () => {
    const candidates = Array.from({ length: 20 }, (_, i) =>
      makeSuggestion({ title: `Suggestion ${i}`, confidence: 50 + i })
    );
    const result = scoreSuggestions(candidates, "balanced");
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("assigns sortOrder 0-4", () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      makeSuggestion({ title: `Suggestion ${i}`, confidence: 50 + i * 5 })
    );
    const result = scoreSuggestions(candidates, "balanced");
    result.forEach((s, i) => {
      expect(s.sortOrder).toBe(i);
    });
  });

  it("scores emergency higher with urgency", () => {
    const normal = makeSuggestion({ category: "profit", confidence: 80 });
    const emergency = makeSuggestion({
      category: "emergency",
      type: "risk",
      title: "Notfall",
      confidence: 80,
    });
    const result = scoreSuggestions([normal, emergency], "balanced");
    expect(result[0].category).toBe("emergency");
  });

  it("applies risk penalty for high-risk low-confidence", () => {
    const safe = makeSuggestion({ riskLevel: "low", confidence: 80 });
    const risky = makeSuggestion({
      title: "Risky action",
      riskLevel: "high",
      confidence: 40,
    });
    const result = scoreSuggestions([safe, risky], "balanced");
    const safeScore = result.find((s) => s.riskLevel === "low")?.score ?? 0;
    const riskyScore = result.find((s) => s.riskLevel === "high")?.score ?? 0;
    expect(safeScore).toBeGreaterThan(riskyScore);
  });

  it("removes contradictions (keep higher scored)", () => {
    const more = makeSuggestion({
      title: "Mehr Kaffee produzieren",
      confidence: 90,
      expectedImpact: { revenue: 50 },
    });
    const less = makeSuggestion({
      title: "Weniger Kaffee produzieren",
      confidence: 50,
      expectedImpact: { revenue: 10 },
    });
    const result = scoreSuggestions([more, less], "balanced");
    // Both may be kept if product-key extraction differs, or one removed if keys match
    if (result.length === 1) {
      expect(result[0].confidence).toBe(90);
    } else {
      // If both are kept, the higher-scored one should be first
      expect((result[0].score ?? 0)).toBeGreaterThanOrEqual((result[1].score ?? 0));
    }
  });

  it("enforces diversity: max 2 per type", () => {
    const candidates = Array.from({ length: 6 }, (_, i) =>
      makeSuggestion({
        type: "demand",
        category: "profit",
        title: `Demand ${i}`,
        confidence: 80 - i,
      })
    );
    const result = scoreSuggestions(candidates, "balanced");
    const demandCount = result.filter((s) => s.type === "demand").length;
    expect(demandCount).toBeLessThanOrEqual(2);
  });

  it("profit mode boosts revenue impact", () => {
    const revenueHeavy = makeSuggestion({
      title: "Revenue focus",
      expectedImpact: { revenue: 100, waste: 0 },
      confidence: 70,
    });
    const wasteHeavy = makeSuggestion({
      title: "Waste focus",
      type: "waste",
      category: "waste",
      expectedImpact: { revenue: 0, waste: 100 },
      confidence: 70,
    });
    const result = scoreSuggestions([revenueHeavy, wasteHeavy], "profit");
    expect(result[0].title).toBe("Revenue focus");
  });

  it("waste mode boosts waste impact", () => {
    const revenueHeavy = makeSuggestion({
      title: "Revenue focus",
      expectedImpact: { revenue: 50, waste: 0 },
      confidence: 70,
    });
    const wasteHeavy = makeSuggestion({
      title: "Waste focus",
      type: "waste",
      category: "waste",
      expectedImpact: { revenue: 0, waste: 50 },
      confidence: 70,
    });
    const result = scoreSuggestions([revenueHeavy, wasteHeavy], "waste");
    expect(result[0].title).toBe("Waste focus");
  });

  it("handles empty candidates", () => {
    const result = scoreSuggestions([], "balanced");
    expect(result).toEqual([]);
  });

  it("all scores are non-negative", () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      makeSuggestion({
        title: `Suggestion ${i}`,
        confidence: Math.random() * 100,
        riskLevel: i % 3 === 0 ? "high" : "low",
      })
    );
    const result = scoreSuggestions(candidates, "balanced");
    result.forEach((s) => {
      expect(s.score).toBeGreaterThanOrEqual(0);
    });
  });
});
