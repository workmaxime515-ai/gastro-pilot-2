"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import de from "./translations/de.json";
import en from "./translations/en.json";
import tr from "./translations/tr.json";
import ar from "./translations/ar.json";
import fr from "./translations/fr.json";
import it from "./translations/it.json";
import es from "./translations/es.json";
import pl from "./translations/pl.json";
import zh from "./translations/zh.json";
import ja from "./translations/ja.json";

export type Locale = "de" | "en" | "tr" | "ar" | "fr" | "it" | "es" | "pl" | "zh" | "ja";

export const LOCALE_LABELS: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
  tr: "Türkçe",
  ar: "العربية",
  fr: "Français",
  it: "Italiano",
  es: "Español",
  pl: "Polski",
  zh: "中文",
  ja: "日本語",
};

export const RTL_LOCALES: Locale[] = ["ar"];

const STORAGE_KEY = "gastro-language";
const DEFAULT_LOCALE: Locale = "de";

type TranslationDict = Record<string, unknown>;

const translations: Record<Locale, TranslationDict> = {
  de, en, tr, ar, fr, it, es, pl, zh, ja,
};

function getNestedValue(obj: unknown, path: string | undefined | null): string | undefined {
  if (!path || typeof path !== "string") return undefined;
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && translations[stored]) {
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (key: string | undefined | null, vars?: Record<string, string | number>): string => {
      if (!key) return "";
      const value =
        getNestedValue(translations[locale], key) ??
        getNestedValue(translations[DEFAULT_LOCALE], key) ??
        key;
      return interpolate(value, vars);
    },
    [locale]
  );

  const isRTL = RTL_LOCALES.includes(locale);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isRTL }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used within I18nProvider");
  return ctx;
}
