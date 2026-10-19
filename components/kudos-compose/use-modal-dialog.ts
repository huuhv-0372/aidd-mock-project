"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps a native <dialog> in step with an `open` flag: showModal() on open (focus trap, Esc, inert page, focus on the
 * first field) and close() on close.
 */
export function useModalDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);
  return ref;
}
