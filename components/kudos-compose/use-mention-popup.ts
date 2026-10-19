"use client";

import { useCallback, useRef, useState, type CSSProperties, type RefObject } from "react";
import type { MentionPopup } from "./kudo-mention-extension";

type Placed = MentionPopup & { style: CSSProperties };

/** Bridges Tiptap's suggestion lifecycle to React state: the open list, its anchor under the caret and the highlighted row. */
export function useMentionPopup(wrapperRef: RefObject<HTMLElement | null>) {
  const [popup, setPopup] = useState<Placed | null>(null);
  const [index, setIndex] = useState(0);
  const popupRef = useRef<Placed | null>(null);
  const indexRef = useRef(0);

  const move = useCallback((next: number) => {
    indexRef.current = next;
    setIndex(next);
  }, []);

  const onPopup = useCallback(
    (raw: MentionPopup | null) => {
      if (!raw) {
        popupRef.current = null;
        setPopup(null);
        return;
      }
      const box = wrapperRef.current?.getBoundingClientRect();
      const left = raw.rect && box ? Math.max(0, Math.min(raw.rect.left - box.left, box.width - 256)) : 0;
      const top = raw.rect && box ? raw.rect.bottom - box.top + 4 : 0;
      const placed = { ...raw, style: { top, left } };
      popupRef.current = placed;
      setPopup(placed);
      move(0);
    },
    [wrapperRef, move],
  );

  /** Returns true when the key was consumed by the open list (ProseMirror then skips its own handling). */
  const onKey = useCallback(
    (event: KeyboardEvent) => {
      const items = popupRef.current?.items ?? [];
      if (!items.length) return false;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const step = event.key === "ArrowDown" ? 1 : -1;
        move((indexRef.current + step + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        popupRef.current?.pick(items[indexRef.current] ?? items[0]);
        return true;
      }
      return false;
    },
    [move],
  );

  return { popup, index, move, onPopup, onKey };
}
