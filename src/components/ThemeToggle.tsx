"use client";

import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200 hover:bg-[rgba(110,115,136,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)]"
      style={{ color: "var(--color-text-secondary)" }}
      aria-label={
        theme === "light"
          ? "Zu dunkel wechseln"
          : theme === "dark"
            ? "Zu System wechseln"
            : "Zu hell wechseln"
      }
    >
      {theme === "light" ? (
        <Sun size={18} />
      ) : theme === "dark" ? (
        <Moon size={18} />
      ) : (
        <Monitor size={18} />
      )}
    </button>
  );
}
