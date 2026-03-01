import { describe, it, expect } from "vitest";
import { safeDivide, clamp, safePercent, roundTo, safeAvg, safeParseFloat } from "@/lib/math";

describe("safeDivide", () => {
  it("divides normally", () => {
    expect(safeDivide(10, 2)).toBe(5);
  });

  it("returns fallback on division by zero", () => {
    expect(safeDivide(10, 0)).toBe(0);
    expect(safeDivide(10, 0, -1)).toBe(-1);
  });

  it("returns fallback for NaN inputs", () => {
    expect(safeDivide(NaN, 2)).toBe(0);
    expect(safeDivide(10, NaN)).toBe(0);
  });

  it("returns fallback for Infinity inputs", () => {
    expect(safeDivide(10, Infinity)).toBe(0);
    expect(safeDivide(Infinity, 10)).toBe(0);
  });
});

describe("clamp", () => {
  it("clamps value within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("safePercent", () => {
  it("calculates percentage", () => {
    expect(safePercent(50, 200)).toBe(25);
  });

  it("returns fallback on zero total", () => {
    expect(safePercent(50, 0)).toBe(0);
  });
});

describe("roundTo", () => {
  it("rounds to 2 decimal places by default", () => {
    expect(roundTo(3.14159)).toBe(3.14);
  });

  it("rounds to specified decimals", () => {
    expect(roundTo(3.14159, 3)).toBe(3.142);
  });
});

describe("safeAvg", () => {
  it("calculates average", () => {
    expect(safeAvg([10, 20, 30])).toBe(20);
  });

  it("returns fallback for empty array", () => {
    expect(safeAvg([])).toBe(0);
    expect(safeAvg([], 42)).toBe(42);
  });
});

describe("safeParseFloat", () => {
  it("parses valid numbers", () => {
    expect(safeParseFloat("3.14")).toBe(3.14);
    expect(safeParseFloat(42)).toBe(42);
  });

  it("returns fallback for invalid input", () => {
    expect(safeParseFloat("abc")).toBe(0);
    expect(safeParseFloat(null)).toBe(0);
    expect(safeParseFloat(undefined, 99)).toBe(99);
  });
});
