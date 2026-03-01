"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  AlertTriangle,
  X,
  Truck,
  PackageX,
  Wrench,
  UserMinus,
  Users,
  Zap,
} from "lucide-react";
import { useT } from "@/i18n";

const EMERGENCY_TYPE_KEYS: Record<string, { label: string; desc: string }> = {
  vendor: { label: "emergency.types.delivery", desc: "emergency.descriptions.delivery" },
  damaged: { label: "emergency.types.damaged", desc: "emergency.descriptions.damaged" },
  equipment: { label: "emergency.types.equipment", desc: "emergency.descriptions.equipment" },
  staff: { label: "emergency.types.staff", desc: "emergency.descriptions.staff" },
  rush: { label: "emergency.types.busy", desc: "emergency.descriptions.busy" },
  power: { label: "emergency.types.power", desc: "emergency.descriptions.power" },
};

const EMERGENCY_TYPES = [
  { type: "vendor", icon: Truck },
  { type: "damaged", icon: PackageX },
  { type: "equipment", icon: Wrench },
  { type: "staff", icon: UserMinus },
  { type: "rush", icon: Users },
  { type: "power", icon: Zap },
] as const;

export function SOSButton() {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Solid round button — 56px, accent-warning, NO pulse, NO gradient */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full text-white transition-colors duration-200 hover:brightness-90 active:scale-95 lg:bottom-6"
        style={{
          backgroundColor: "var(--color-accent-warning)",
          boxShadow: "0 4px 16px rgba(239, 68, 68, 0.3)",
        }}
        aria-label={t("emergency.title")}
      >
        <AlertTriangle size={24} />
      </button>

      {/* Emergency Overlay */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50" role="dialog" aria-label={t("emergency.title")} aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute inset-0 bg-black/20 dark:bg-black/40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="absolute bottom-0 left-0 right-0 rounded-t-[20px] bg-[var(--color-card-bg)] dark:bg-[var(--color-dark-card)] p-5 pb-8"
              style={{ boxShadow: "var(--shadow-nav)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-section" style={{ color: "var(--color-accent-warning)" }}>
                  {t("emergency.sosButton")}
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 hover:bg-[rgba(110,115,136,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)]"
                  style={{ color: "var(--color-text-secondary)" }}
                  aria-label={t("emergency.close")}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Emergency type buttons */}
              <div className="grid grid-cols-2 gap-3">
                {EMERGENCY_TYPES.map(({ type, icon: Icon }) => {
                  const keys = EMERGENCY_TYPE_KEYS[type];
                  return (
                    <Link
                      key={type}
                      href={`/emergency?type=${type}`}
                      onClick={() => setOpen(false)}
                      className="card flex flex-col items-center gap-2 p-4 text-center transition-colors duration-200 hover:bg-[rgba(110,115,136,0.03)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                    >
                      <Icon size={24} style={{ color: "var(--color-accent-warning)" }} />
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {t(keys.label)}
                      </span>
                      <span className="text-meta">{t(keys.desc)}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
