import { describe, it, expect } from "vitest";
import {
  productCreateSchema,
  salesEntrySchema,
  settingsUpdateSchema,
  feedbackSchema,
  wasteLogSchema,
  dayCloseSchema,
  cashCountSchema,
} from "@/lib/validation";

describe("productCreateSchema", () => {
  it("accepts valid product", () => {
    const result = productCreateSchema.safeParse({
      name: "Kaffee",
      category: "Getränke",
      costPrice: 0.5,
      sellPrice: 3.5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = productCreateSchema.safeParse({
      name: "",
      category: "test",
      costPrice: 1,
      sellPrice: 2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative cost price", () => {
    const result = productCreateSchema.safeParse({
      name: "Test",
      category: "test",
      costPrice: -1,
      sellPrice: 2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero sell price", () => {
    const result = productCreateSchema.safeParse({
      name: "Test",
      category: "test",
      costPrice: 1,
      sellPrice: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("salesEntrySchema", () => {
  it("accepts valid sale", () => {
    const result = salesEntrySchema.safeParse({
      productId: "abc123",
      quantity: 5,
      revenue: 17.5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero quantity", () => {
    const result = salesEntrySchema.safeParse({
      productId: "abc",
      quantity: 0,
      revenue: 0,
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid time slot", () => {
    const result = salesEntrySchema.safeParse({
      productId: "abc",
      quantity: 1,
      revenue: 3,
      timeSlot: "morning",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid time slot", () => {
    const result = salesEntrySchema.safeParse({
      productId: "abc",
      quantity: 1,
      revenue: 3,
      timeSlot: "midnight",
    });
    expect(result.success).toBe(false);
  });
});

describe("settingsUpdateSchema", () => {
  it("accepts valid settings", () => {
    const result = settingsUpdateSchema.safeParse({
      shopName: "Mein Cafe",
      strategyMode: "profit",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty object", () => {
    const result = settingsUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("validates time format", () => {
    const valid = settingsUpdateSchema.safeParse({ openTime: "08:00" });
    const invalid = settingsUpdateSchema.safeParse({ openTime: "8am" });
    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });
});

describe("feedbackSchema", () => {
  it("accepts valid feedback", () => {
    const result = feedbackSchema.safeParse({
      suggestionId: "abc123",
      action: "done",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = feedbackSchema.safeParse({
      suggestionId: "abc",
      action: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("wasteLogSchema", () => {
  it("accepts valid waste log", () => {
    const result = wasteLogSchema.safeParse({
      productId: "abc",
      quantity: 3,
      reason: "expired",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid reason", () => {
    const result = wasteLogSchema.safeParse({
      productId: "abc",
      quantity: 3,
      reason: "unknown_reason",
    });
    expect(result.success).toBe(false);
  });
});

describe("dayCloseSchema", () => {
  it("accepts valid day close", () => {
    const result = dayCloseSchema.safeParse({
      date: "2025-01-15",
      totalRevenue: 500,
      totalWaste: 20,
      dayRating: "good",
    });
    expect(result.success).toBe(true);
  });
});

describe("cashCountSchema", () => {
  it("accepts valid cash count", () => {
    const result = cashCountSchema.safeParse({
      date: "2025-01-15",
      openAmount: 100,
      closeAmount: 580,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative amounts", () => {
    const result = cashCountSchema.safeParse({
      date: "2025-01-15",
      openAmount: -10,
      closeAmount: 100,
    });
    expect(result.success).toBe(false);
  });
});
