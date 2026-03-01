"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

const MAX_ACTIONS = 10;

export interface UndoAction {
  id: string;
  type: string;
  data: unknown;
  undo: () => void | Promise<void>;
}

export interface UseUndoReturn {
  canUndo: boolean;
  undo: () => void;
  pushAction: (action: Omit<UndoAction, "id">) => void;
  lastAction: UndoAction | null;
  showToast: boolean;
  dismissToast: () => void;
}

const UndoContext = createContext<UseUndoReturn | null>(null);

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `undo-${Date.now()}-${idCounter}`;
}

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<UndoAction[]>([]);
  const [showToast, setShowToast] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    setShowToast(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const pushAction = useCallback((action: Omit<UndoAction, "id">) => {
    const fullAction: UndoAction = { ...action, id: generateId() };
    setStack((prev) => [fullAction, ...prev].slice(0, MAX_ACTIONS));
    setShowToast(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowToast(false), 5000);
  }, []);

  const undo = useCallback(() => {
    const last = stack[0];
    if (!last) return;
    last.undo();
    setStack((prev) => prev.slice(1));
    dismissToast();
  }, [stack, dismissToast]);

  const value: UseUndoReturn = {
    canUndo: stack.length > 0,
    undo,
    pushAction,
    lastAction: stack[0] ?? null,
    showToast,
    dismissToast,
  };

  return (
    <UndoContext.Provider value={value}>{children}</UndoContext.Provider>
  );
}

export function useUndo(): UseUndoReturn {
  const ctx = useContext(UndoContext);
  if (!ctx) {
    throw new Error("useUndo must be used within UndoProvider");
  }
  return ctx;
}
