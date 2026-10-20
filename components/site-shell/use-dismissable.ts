"use client";

import { useEffect, type RefObject } from "react";

/** The nearest <dialog> around a node, null outside any. */
const dialogOf = (node: Element | null) => node?.closest("dialog") ?? null;

/**
 * The open modal <dialog> on top, null when none is open. Modals stack by showModal() order, which here equals document
 * order: a nested dialog (Add link inside Viết Kudo) is a descendant of its parent, and unrelated modals never coexist
 * because the page behind an open modal is inert.
 */
const topModal = () => Array.from(document.querySelectorAll("dialog:modal")).at(-1) ?? null;

/**
 * Closes a popup on an outside pointer-down or Escape. `onDismiss(true)` asks the caller to
 * restore focus to the trigger (keyboard dismissal); outside clicks keep the new focus target. Escape is consumed
 * (preventDefault) only when the popup sits in the topmost modal <dialog> (or no modal is open and the popup sits in none): a popup
 * inside a modal then closes alone instead of taking the dialog with it, while a popup left open outside the modal never
 * swallows the Esc that is meant to close the modal. The key's target is not consulted: with focus on <body> (a focused
 * control unmounted) it says nothing about which layer the user is in.
 */
export function useDismissable(
  open: boolean,
  rootRef: RefObject<HTMLElement | null>,
  onDismiss: (restoreFocus: boolean) => void,
) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onDismiss(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Same layer: without preventDefault the Esc also reaches the enclosing native <dialog> (its "cancel") and closes the whole modal.
      if (dialogOf(rootRef.current) === topModal()) event.preventDefault();
      onDismiss(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, rootRef, onDismiss]);
}
