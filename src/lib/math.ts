/**
 * Safe division that returns fallback if divisor is 0, NaN, or Infinity.
 */
export function safeDivide(a: number, b: number, fallback = 0): number {
  if (!Number.isFinite(b) || b === 0) return fallback;
  if (!Number.isFinite(a)) return fallback;
  return a / b;
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Safe percentage: (part / total) * 100, guarded against division by zero.
 */
export function safePercent(part: number, total: number, fallback = 0): number {
  return safeDivide(part, total, fallback) * 100;
}

/**
 * Round to n decimal places.
 */
export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Safe array average, returns fallback if array is empty.
 */
export function safeAvg(arr: number[], fallback = 0): number {
  if (arr.length === 0) return fallback;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * Parse a number or return fallback if NaN/undefined.
 */
export function safeParseFloat(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}
