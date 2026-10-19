"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GLOW_SHADOW, PRIMARY_CTA_HOVER } from "./shell-class-names";
import { IconClose, IconPen } from "./shell-icons";
import { useDismissable } from "./use-dismissable";

export type WidgetCopy = { rules: string; writeKudo: string; close: string };

type WidgetButtonProps = {
  /** Accessible name of the closed floating button. */
  label: string;
  copy: WidgetCopy;
  onOpenRules: () => void;
  onWriteKudo?: () => void;
  /** Guest: "Viết KUDOS" becomes a link (e.g. "/login") instead of a button. */
  writeKudoHref?: string;
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const MOTION = "motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200";
/* Figma A/B menu buttons (186:1567): 64px high, 16px padding, 8px icon gap, 4px radius, 24px/32px bold label. */
const ITEM = `flex h-16 cursor-pointer items-center gap-2 rounded bg-login-accent px-4 text-2xl leading-8 font-bold text-login-bg ${PRIMARY_CTA_HOVER} ${FOCUS} ${MOTION}`;

/*
 * Floating widget (Figma Widget Button `5022:15169`) and its open state (`313:9140`): a column with
 * A "Thể lệ", B "Viết KUDOS" and the red C close button. The menu replaces the closed pill in place;
 * Esc, an outside press or C closes it. Picking an item closes the menu and hands over to the page-level
 * handlers (rules panel / write modal), which live outside this component.
 */
export function WidgetButton({ label, copy, onOpenRules, onWriteKudo, writeKudoHref }: WidgetButtonProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  const close = useCallback((restore: boolean) => {
    restoreFocus.current = restore;
    setOpen(false);
  }, []);
  useDismissable(open, menuRef, close);

  useEffect(() => {
    if (open) {
      firstItemRef.current?.focus();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      toggleRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return (
      // mm:5022:15169
      <button
        ref={toggleRef}
        type="button"
        data-testid="widget-button"
        aria-label={label}
        aria-haspopup="true"
        onClick={() => setOpen(true)}
        className={`fixed right-[19px] bottom-6 z-40 flex h-16 min-w-[106px] cursor-pointer items-center justify-center gap-2 rounded-full bg-login-accent p-4 text-login-bg hover:bg-[#fff3c4] hover:shadow-[0_4px_8px_rgb(0_0_0/0.35),0_0_10px_#fae287] ${FOCUS} ${MOTION} ${GLOW_SHADOW}`}
      >
        {/* mm:I5022:15169;214:3839;186:1935 */}
        <span className="flex items-center gap-2" aria-hidden="true">
          {/* mm:I5022:15169;214:3839;186:1763 */}
          <IconPen />
          {/* mm:I5022:15169;214:3839;186:1568 */}
          <span className="text-2xl leading-8 font-bold">/</span>
        </span>
        {/* mm:I5022:15169;214:3839;186:1766 */}
        <Image src="/images/home/icon-kudos-logo.svg" alt="" width={20} height={19} aria-hidden="true" />
      </button>
    );
  }

  const pick = (action?: () => void) => () => {
    close(true);
    action?.();
  };
  const writeContent: ReactNode = (
    <>
      {/* mm:I313:9140;214:3732;186:1763 */}
      <IconPen />
      {/* mm:I313:9140;214:3732;186:1568 */}
      {copy.writeKudo}
    </>
  );

  return (
    // mm:313:9140
    <div ref={menuRef} data-testid="widget-menu" role="group" aria-label={label} className="fixed right-[19px] bottom-6 z-40 flex flex-col items-end gap-5">
      {/* mm:313:9140 > A_Button thể lệ (I313:9140;214:3799) */}
      <button ref={firstItemRef} type="button" onClick={pick(onOpenRules)} className={ITEM}>
        {/* mm:I313:9140;214:3799;186:1763 */}
        <Image src="/images/home/icon-kudos-logo.svg" alt="" width={20} height={19} aria-hidden="true" />
        {/* mm:I313:9140;214:3799;186:1568 */}
        {copy.rules}
      </button>
      {/* mm:I313:9140;214:3732 (B_Button viết kudos) */}
      {writeKudoHref ? (
        <Link href={writeKudoHref} onClick={pick()} className={ITEM}>
          {writeContent}
        </Link>
      ) : (
        <button type="button" onClick={pick(onWriteKudo)} className={ITEM}>
          {writeContent}
        </button>
      )}
      {/* mm:I313:9140;214:3827 (C_Button huỷ) */}
      <button
        type="button"
        data-testid="widget-close"
        aria-label={copy.close}
        onClick={() => close(true)}
        className={`flex size-14 cursor-pointer items-center justify-center rounded-full bg-kudos-heart text-white hover:brightness-110 ${FOCUS} motion-safe:transition-[filter] motion-safe:duration-200`}
      >
        <IconClose />
      </button>
    </div>
  );
}
