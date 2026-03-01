import type { CandidateSuggestion } from "./types";

const MAX_PRODUCTION_INCREASE_PERCENT = 20;
const HIGH_SPOILAGE_MIN_CONFIDENCE = 75;
const MAX_NON_EASY_SUGGESTIONS = 3;
const LOW_CONFIDENCE_THRESHOLD = 40;
const LOW_CONFIDENCE_REPLACEMENT = "Keine starke Empfehlung — Datenlage unsicher";

function isProductionIncrease(title: string): boolean {
  return /mehr|erhöh|steigern|produzieren/i.test(title);
}

function extractPercent(title: string): number | null {
  const match = title.match(/(\d+)\s*%/);
  return match ? Number(match[1]) : null;
}

function isHighSpoilage(reasoning: string): boolean {
  const t = reasoning.toLowerCase();
  return /verderblich|haltbarkeit/i.test(t);
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function similarTitles(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wordsA = new Set(na.split(/\s+/));
  const wordsB = nb.split(/\s+/);
  const overlap = wordsB.filter((w) => wordsA.has(w)).length;
  return overlap >= Math.min(wordsA.size, wordsB.length) * 0.8;
}

function isDuplicate(
  s: CandidateSuggestion,
  seen: { type: string; title: string }[]
): boolean {
  return seen.some(
    (o) => o.type === s.type && similarTitles(o.title, s.title)
  );
}

export function applyGuardrails(
  candidates: CandidateSuggestion[]
): CandidateSuggestion[] {
  let result = [...candidates];

  // 1. No production increase > 20%
  result = result.filter((s) => {
    if (!isProductionIncrease(s.title)) return true;
    const pct = extractPercent(s.title);
    if (pct === null) return true;
    return pct <= MAX_PRODUCTION_INCREASE_PERCENT;
  });

  // 2. High spoilage items need confidence >= 75
  result = result.filter((s) => {
    if (!isHighSpoilage(s.reasoning)) return true;
    return s.confidence >= HIGH_SPOILAGE_MIN_CONFIDENCE;
  });

  // 3. Max 3 suggestions with difficulty !== "easy"
  const nonEasy = result.filter((s) => s.difficulty !== "easy");
  const easy = result.filter((s) => s.difficulty === "easy");
  if (nonEasy.length > MAX_NON_EASY_SUGGESTIONS) {
    const keepNonEasy = nonEasy.slice(0, MAX_NON_EASY_SUGGESTIONS);
    result = [...keepNonEasy, ...easy];
  }

  // 4. If confidence < 40, replace with fallback message
  result = result.map((s) => {
    if (s.confidence < LOW_CONFIDENCE_THRESHOLD) {
      return {
        ...s,
        title: LOW_CONFIDENCE_REPLACEMENT,
        description: LOW_CONFIDENCE_REPLACEMENT,
      };
    }
    return s;
  });

  // 5. Remove duplicates (same type + similar title)
  const seen: { type: string; title: string }[] = [];
  result = result.filter((s) => {
    if (isDuplicate(s, seen)) return false;
    seen.push({ type: s.type, title: s.title });
    return true;
  });

  return result;
}
