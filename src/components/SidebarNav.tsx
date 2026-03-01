"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  PenLine,
  Wallet,
  UtensilsCrossed,
  Users,
  ShieldCheck,
  BarChart3,
  Settings,
  MessageCircle,
  LineChart,
} from "lucide-react";
import { useT } from "@/i18n";

const NAV_ITEMS = [
  { href: "/", labelKey: "nav.home", icon: Home },
  { href: "/eingabe", labelKey: "nav.eingabe", icon: PenLine },
  { href: "/finanzen", labelKey: "nav.finanzen", icon: Wallet },
  { href: "/rezepte", labelKey: "nav.rezepte", icon: UtensilsCrossed },
  { href: "/haccp", labelKey: "nav.haccp", icon: ShieldCheck },
  { href: "/berichte", labelKey: "nav.berichte", icon: BarChart3 },
  { href: "/personal", labelKey: "nav.personal", icon: Users },
  { href: "/coach", labelKey: "nav.coach", icon: MessageCircle },
  { href: "/analytics", labelKey: "nav.analytics", icon: LineChart },
  { href: "/abend", labelKey: "nav.abend", icon: Home },
  { href: "/einstellungen", labelKey: "nav.einstellungen", icon: Settings },
] as const;

export function SidebarNav() {
  const { t } = useT();
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-r lg:border-[var(--color-border-subtle)] lg:bg-[var(--color-card-bg)] dark:lg:bg-[var(--color-dark-card)]">
      {/* Logo */}
      <div className="px-6 py-6">
        <h1 className="text-section" style={{ color: "var(--color-accent-primary)" }}>
          CoffeeFlow
        </h1>
        <p className="text-meta mt-0.5">Dein Entscheidungshelfer</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label={t("nav.mainNav")}>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-[var(--radius-button)] px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? "bg-[rgba(224,138,74,0.1)] text-[var(--color-accent-primary)] border-l-4 border-[var(--color-accent-primary)] -ml-px"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[rgba(110,115,136,0.05)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                  <span>{t(item.labelKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
