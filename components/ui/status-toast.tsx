"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const TOAST_MS = 3000;

/*
 * Short status message (Figma Copy Link toast): portalled to <body> because the carousel track is transformed, which would
 * otherwise make a `fixed` toast position against the track instead of the viewport. Role `status` so it is announced.
 */
function StatusToast({ message }: { message: string }) {
  return createPortal(
    <p
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-home-border bg-kudos-panel px-6 py-3 text-base leading-6 font-bold text-white shadow-[0_4px_4px_rgb(0_0_0/0.25),0_0_6px_#fae287]"
    >
      {message}
    </p>,
    document.body,
  );
}

/**
 * Owns one toast: `show(message)` replaces any visible one and hides it after 3 s. Render the returned `toast` node
 * once in the component that calls `show`. It only exists while visible, so there is at most one `status` at a time.
 */
export function useStatusToast(): { show: (message: string) => void; toast: ReactNode } {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = useCallback((next: string) => {
    setMessage(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), TOAST_MS);
  }, []);

  return { show, toast: message === null ? null : <StatusToast message={message} /> };
}
