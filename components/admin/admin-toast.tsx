"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const TOAST_MS = 3000;

const ToastContext = createContext<(message: string) => void>(() => {});

/** `show(message)` from any row's action menu: the toast outlives the row (a role change can drop it from a filtered list). */
export const useAdminToast = () => useContext(ToastContext);

/*
 * Holds the one status message of the user table (role changed). Role `status` so it is announced; same look as the Copy Link
 * toast (components/ui/status-toast.tsx, which has no testid hook, so the admin screen keeps its own). A new message replaces the
 * visible one; it hides after 3 s.
 */
export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = useCallback((next: string) => {
    setMessage(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), TOAST_MS);
  }, []);

  return (
    <ToastContext value={show}>
      {children}
      {message === null ? null : (
        <p
          role="status"
          data-testid="admin-status-toast"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-home-border bg-kudos-panel px-6 py-3 text-base leading-6 font-bold text-white shadow-[0_4px_4px_rgb(0_0_0/0.25),0_0_6px_#fae287]"
        >
          {message}
        </p>
      )}
    </ToastContext>
  );
}
