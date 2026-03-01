"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useUndo } from "@/components/UndoProvider";

export function UndoToast() {
  const { showToast, undo, dismissToast } = useUndo();

  return (
    <AnimatePresence>
      {showToast && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-4 rounded-card border border-text-secondary/20 bg-card px-4 py-3 shadow-lg dark:border-dark-text-secondary/20 dark:bg-dark-card"
        >
          <span className="text-sm text-text-primary dark:text-dark-text">
            Letzte Aktion rückgängig machen
          </span>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={undo}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 dark:focus:ring-offset-dark-bg"
            >
              Rückgängig
            </button>
            <button
              type="button"
              onClick={dismissToast}
              className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-text-secondary/10 dark:text-dark-text-secondary dark:hover:bg-dark-text-secondary/10"
            >
              Schließen
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
