"use client";

import {
  motion,
  useReducedMotion,
  useMotionValue,
  useTransform,
  animate,
  AnimatePresence,
  type Variants,
} from "framer-motion";
import { Children, useEffect, useState, type ReactNode } from "react";

function useMotionConfig() {
  const reduced = useReducedMotion();
  return { reduced: !!reduced };
}

/* ─── AnimatedCard — simple fade-in, NO hover lift, NO spring ─── */
interface AnimatedCardProps {
  children: ReactNode;
  staggerIndex?: number;
  className?: string;
}

export function AnimatedCard({ children, staggerIndex = 0, className }: AnimatedCardProps) {
  const { reduced } = useMotionConfig();

  const variants: Variants = {
    hidden: { opacity: 0, y: reduced ? 0 : 6 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: reduced ? 0 : 0.25,
        delay: reduced ? 0 : i * 0.06,
        ease: "easeInOut",
      },
    }),
  };

  return (
    <motion.div
      custom={staggerIndex}
      initial="hidden"
      animate="visible"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── StaggerContainer — staggers children ─── */
interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

const staggerChildVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeInOut" },
  },
};

export function StaggerContainer({
  children,
  staggerDelay = 0.06,
  className,
}: StaggerContainerProps) {
  const { reduced } = useMotionConfig();
  const delay = reduced ? 0 : staggerDelay;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: delay,
            delayChildren: 0,
          },
        },
      }}
      className={className}
    >
      <AnimatePresence mode="wait">
        {Children.map(children, (child, i) => {
          const key =
            child != null && typeof child === "object" && "key" in child
              ? (child as React.ReactElement).key
              : i;
          return (
            <motion.div
              key={key}
              variants={reduced ? undefined : staggerChildVariants}
            >
              {child}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── ConfidenceBar — 200ms ease-in-out, NO spring ─── */
interface ConfidenceBarProps {
  value: number;
  color?: string;
  className?: string;
}

export function ConfidenceBar({
  value,
  color = "var(--color-accent-primary)",
  className,
}: ConfidenceBarProps) {
  const { reduced } = useMotionConfig();
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={`h-1.5 flex-1 max-w-[120px] overflow-hidden rounded-full ${className ?? ""}`}
      style={{ backgroundColor: "var(--color-track-bg)" }}
      aria-hidden
    >
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: reduced ? `${clamped}%` : "0%" }}
        animate={{ width: `${clamped}%` }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 0.3, ease: "easeInOut" }
        }
      />
    </div>
  );
}

/* ─── AnimatedNumber — counts up ─── */
interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  duration = 0.8,
  decimals = 0,
  className,
}: AnimatedNumberProps) {
  const { reduced } = useMotionConfig();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString()
  );
  const [display, setDisplay] = useState(
    reduced ? (decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString()) : "0"
  );

  useEffect(() => {
    if (reduced) {
      setDisplay(decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString());
      return;
    }
    const controls = animate(count, value, {
      duration,
      ease: "easeInOut",
    });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, duration, decimals, reduced, count, rounded]);

  return (
    <span className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/* ─── CheckmarkAnimation — 200ms ease-in-out, NO spring/bounce ─── */
interface CheckmarkAnimationProps {
  className?: string;
}

export function CheckmarkAnimation({ className }: CheckmarkAnimationProps) {
  const { reduced } = useMotionConfig();

  return (
    <motion.div
      className={`flex h-9 w-9 items-center justify-center rounded-full ${className ?? ""}`}
      style={{ backgroundColor: "var(--color-accent-profit)" }}
      initial={reduced ? false : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 0.2, ease: "easeInOut" }
      }
      aria-hidden
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </motion.div>
  );
}

/* ─── SlideIn — 250ms ease-in-out ─── */
interface SlideInProps {
  children: ReactNode;
  direction?: "left" | "right" | "up" | "down";
  delay?: number;
  className?: string;
}

export function SlideIn({
  children,
  direction = "up",
  delay = 0,
  className,
}: SlideInProps) {
  const { reduced } = useMotionConfig();

  const offsets: Record<string, { x?: number; y?: number }> = {
    left: { x: -12 },
    right: { x: 12 },
    up: { y: 12 },
    down: { y: -12 },
  };

  const from = offsets[direction] ?? { y: 12 };

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, ...from }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: reduced ? 0 : 0.25,
        delay: reduced ? 0 : delay,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── FadeIn — 250ms ease-in-out ─── */
interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.25,
  className,
}: FadeInProps) {
  const { reduced } = useMotionConfig();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: reduced ? 0 : duration,
        delay: reduced ? 0 : delay,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
