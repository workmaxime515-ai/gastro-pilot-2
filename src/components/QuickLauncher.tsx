"use client";

import { useMemo, useState, useCallback, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useT } from "@/i18n";

type Destination = {
  href: string;
  labelKey: string;
  keywords: string[];
};

const DESTINATIONS: Destination[] = [
  { href: "/eingabe", labelKey: "nav.eingabe", keywords: ["verkauf", "sale", "eingabe", "umsatz", "eintrag"] },
  { href: "/abend", labelKey: "nav.abend", keywords: ["kasse", "abend", "register", "cash", "close"] },
  { href: "/finanzen", labelKey: "nav.finanzen", keywords: ["finanzen", "geld", "money", "kosten", "profit"] },
  { href: "/haccp", labelKey: "nav.haccp", keywords: ["haccp", "hygiene", "temperatur", "kühl"] },
  { href: "/rezepte", labelKey: "nav.rezepte", keywords: ["rezept", "rezepte", "recipe", "menü"] },
  { href: "/berichte", labelKey: "nav.berichte", keywords: ["bericht", "berichte", "report", "export"] },
  { href: "/personal", labelKey: "nav.personal", keywords: ["personal", "team", "staff", "schicht"] },
  { href: "/analytics", labelKey: "nav.analytics", keywords: ["analytics", "trend", "analyse"] },
  { href: "/einstellungen", labelKey: "nav.einstellungen", keywords: ["einstellung", "settings", "setup", "shop"] },
  { href: "/install", labelKey: "install.title", keywords: ["install", "download", "chromebook", "zip", "herunterladen"] },
  { href: "/", labelKey: "nav.home", keywords: ["start", "home", "dashboard"] },
];

function matchDestinations(query: string): Destination[] {
  const q = query.trim().toLowerCase();
  if (!q) return DESTINATIONS;
  return DESTINATIONS.filter((d) =>
    d.keywords.some((k) => k.includes(q) || q.includes(k)) ||
    d.href.toLowerCase().includes(q)
  );
}

export function QuickLauncher() {
  const { t } = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => matchDestinations(query), [query]);

  const go = useCallback(
    (href: string) => {
      setQuery("");
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && matches[0]) {
      e.preventDefault();
      go(matches[0].href);
    }
    if (e.key === "Escape") {
      setOpen(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="relative">
      <label className="sr-only" htmlFor="quick-launcher">
        {t("home.quickJumpLabel")}
      </label>
      <div className="card flex items-center gap-2 px-3 py-2.5">
        <Search size={18} className="shrink-0 opacity-50" aria-hidden />
        <input
          id="quick-launcher"
          type="search"
          enterKeyHint="go"
          autoComplete="off"
          spellCheck={false}
          placeholder={t("home.quickJumpPlaceholder")}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-text-secondary)]"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && query.trim() && (
        <ul
          className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-card-bg)] shadow-lg dark:bg-[var(--color-dark-card)]"
          role="listbox"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--color-text-secondary)]">
              {t("home.quickJumpNoMatch")}
            </li>
          ) : (
            matches.slice(0, 6).map((d) => (
              <li key={d.href} role="option">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-[rgba(110,115,136,0.06)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(d.href)}
                >
                  <span className="font-medium">{t(d.labelKey)}</span>
                  <span className="text-meta text-xs">{d.href}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      <p className="mt-1.5 px-1 text-meta">{t("home.quickJumpHint")}</p>
    </div>
  );
}
