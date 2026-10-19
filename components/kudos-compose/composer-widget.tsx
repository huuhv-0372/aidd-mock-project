"use client";

import { useEffect } from "react";
import { WidgetButton, type WidgetCopy } from "@/components/site-shell/widget-button";
import { useKudosComposer } from "./kudos-composer-provider";

/*
 * The floating widget wired to the page's composer: "Thể lệ" opens the rules panel, "Viết KUDOS" the write modal.
 * A guest gets `writeKudoHref` (the login page) and tells the provider, so the rules panel's own "Viết KUDOS"
 * sends a guest to login too.
 */
export function ComposerWidget({ label, copy, writeKudoHref }: { label: string; copy: WidgetCopy; writeKudoHref?: string }) {
  const { openRules, openComposer, setGuestWriteHref } = useKudosComposer();

  useEffect(() => {
    setGuestWriteHref(writeKudoHref ?? null);
    return () => setGuestWriteHref(null);
  }, [writeKudoHref, setGuestWriteHref]);

  return (
    <WidgetButton label={label} copy={copy} onOpenRules={openRules} onWriteKudo={openComposer} writeKudoHref={writeKudoHref} />
  );
}
