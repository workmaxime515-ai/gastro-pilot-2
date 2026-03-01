"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  PenLine,
  Moon,
  Settings,
  MoreHorizontal,
  MessageCircle,
  X,
  ChefHat,
  ShieldCheck,
  BarChart3,
  Users,
  DollarSign,
  LineChart,
} from "lucide-react";
import { useT } from "@/i18n";

const NAV_ITEMS = [
  { href: "/", labelKey: "nav.home", icon: Home, ariaLabelKey: "nav.startpage" },
  { href: "/eingabe", labelKey: "nav.eingabe", icon: PenLine, ariaLabelKey: "nav.dataEntry" },
  { href: "/finanzen", labelKey: "nav.finanzen", icon: DollarSign, ariaLabelKey: "nav.finanzen" },
  { href: "/abend", labelKey: "nav.abend", icon: Moon, ariaLabelKey: "nav.eveningOverview" },
] as const;

const MEHR_ITEMS = [
  { href: "/rezepte", labelKey: "nav.rezepte", icon: ChefHat, descKey: "nav.recipes" },
  { href: "/haccp", labelKey: "nav.haccp", icon: ShieldCheck, descKey: "nav.haccpDesc" },
  { href: "/berichte", labelKey: "nav.berichte", icon: BarChart3, descKey: "nav.reportsDesc" },
  { href: "/personal", labelKey: "nav.personal", icon: Users, descKey: "nav.staffDesc" },
  { href: "/coach", labelKey: "nav.coach", icon: MessageCircle, descKey: "nav.coachDesc" },
  { href: "/analytics", labelKey: "nav.analytics", icon: LineChart, descKey: "nav.analyticsDesc" },
  { href: "/einstellungen", labelKey: "nav.einstellungen", icon: Settings, descKey: "nav.settingsDesc" },
] as const;

export function Navigation() {
  const { t } = useT();
  const pathname = usePathname();
  const [mehrOpen, setMehrOpen] = useState(false);
  const closeMehr = useCallback(() => setMehrOpen(false), []);

  useEffect(() => {
    if (mehrOpen) closeMehr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isMehrActive = MEHR_ITEMS.some(item => pathname === item.href);

  return (
    <>
      {/* Mobile bottom nav — hidden on desktop */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--color-card-bg)] dark:bg-[var(--color-dark-card)] lg:hidden"
        style={{ boxShadow: "var(--shadow-nav)" }}
        role="navigation"
        aria-label={t("nav.mainNav")}
      >
        <div className="mx-auto flex max-w-[720px] items-center justify-around px-1 pb-5 pt-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
                aria-label={t(item.ariaLabelKey)}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <div className="absolute -top-0.5 h-0.5 w-6 rounded-full bg-[var(--color-accent-primary)]" />
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={`transition-colors duration-200 ${
                    isActive
                      ? "text-[var(--color-accent-primary)]"
                      : "text-[var(--color-text-secondary)] opacity-60 group-hover:opacity-100"
                  }`}
                />
                <span
                  className={`text-[0.65rem] font-medium transition-colors duration-200 ${
                    isActive
                      ? "text-[var(--color-accent-primary)]"
                      : "text-[var(--color-text-secondary)] opacity-60 group-hover:opacity-100"
                  }`}
                >
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}
          {/* More button */}
          <button
            type="button"
            onClick={() => setMehrOpen(true)}
            className="group relative flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
            aria-label={t("nav.moreOptions")}
            aria-haspopup="dialog"
            aria-expanded={mehrOpen}
          >
            {isMehrActive && (
              <div className="absolute -top-0.5 h-0.5 w-6 rounded-full bg-[var(--color-accent-primary)]" />
            )}
            <MoreHorizontal
              size={20}
              strokeWidth={isMehrActive ? 2 : 1.5}
              className={`transition-colors duration-200 ${
                isMehrActive
                  ? "text-[var(--color-accent-primary)]"
                  : "text-[var(--color-text-secondary)] opacity-60 group-hover:opacity-100"
              }`}
            />
            <span
              className={`text-[0.65rem] font-medium transition-colors duration-200 ${
                isMehrActive
                  ? "text-[var(--color-accent-primary)]"
                  : "text-[var(--color-text-secondary)] opacity-60 group-hover:opacity-100"
              }`}
            >
              {t("nav.mehr")}
            </span>
          </button>
        </div>
      </nav>

      {/* More Drawer */}
      <AnimatePresence>
        {mehrOpen && (
          <div className="fixed inset-0 z-40" role="dialog" aria-label={t("nav.moreOptions")} aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute inset-0 bg-black/20 dark:bg-black/40"
              onClick={closeMehr}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="absolute bottom-0 left-0 right-0 overflow-hidden rounded-t-[20px] bg-[var(--color-card-bg)] dark:bg-[var(--color-dark-card)] max-h-[80vh]"
              style={{ boxShadow: "var(--shadow-nav)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full" style={{ backgroundColor: "var(--color-border-subtle)" }} />
              </div>

              <div className="px-5 pb-8 pt-2 overflow-y-auto max-h-[calc(80vh-24px)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-section">
                    {t("nav.mehr")}
                  </h2>
                  <button
                    type="button"
                    onClick={closeMehr}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 hover:bg-[rgba(110,115,136,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)]"
                    style={{ color: "var(--color-text-secondary)" }}
                    aria-label={t("common.close")}
                  >
                    <X size={18} />
                  </button>
                </div>
                <ul className="space-y-1">
                  {MEHR_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={closeMehr}
                          className={`flex items-center gap-3.5 rounded-[var(--radius-button)] px-4 py-3 transition-colors duration-200 ${
                            isActive
                              ? "bg-[rgba(224,138,74,0.1)]"
                              : "hover:bg-[rgba(110,115,136,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)] active:bg-[rgba(110,115,136,0.08)] dark:active:bg-[rgba(255,255,255,0.1)]"
                          }`}
                        >
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-[10px]"
                            style={{
                              backgroundColor: isActive
                                ? "rgba(224, 138, 74, 0.1)"
                                : "var(--color-track-bg)",
                            }}
                          >
                            <Icon
                              size={20}
                              className={isActive ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-secondary)]"}
                            />
                          </div>
                          <div className="flex-1">
                            <p
                              className={`text-sm font-medium ${
                                isActive ? "text-[var(--color-accent-primary)]" : ""
                              }`}
                              style={{ color: isActive ? undefined : "var(--color-text-primary)" }}
                            >
                              {t(item.labelKey)}
                            </p>
                            <p className="text-meta">{t(item.descKey)}</p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
