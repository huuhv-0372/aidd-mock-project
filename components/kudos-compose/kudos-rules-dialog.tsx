"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { FOCUS_RING, PRIMARY_CTA_HOVER } from "@/components/site-shell/shell-class-names";
import { IconClose, IconPen } from "@/components/site-shell/shell-icons";

export type KudosRulesDialogCopy = { close: string; writeKudo: string };

/** `id` of the "Thể lệ" heading rendered by KudosRulesContent (kudos-rules-content.tsx repeats the literal); names the dialog. */
const TITLE_ID = "kudos-rules-title";

const FOOTER_BUTTON =
  "flex h-14 cursor-pointer items-center justify-center gap-2 rounded px-4 text-base leading-6 font-bold tracking-[0.5px] motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200";

/*
 * Thể lệ panel (Figma b1Filzi9i6, `Thể Lệ` 3204:6052): a native modal <dialog> docked to the right, 553px wide,
 * full height. `open` is the single source of truth: the effect shows or closes the dialog, and the native
 * `close` event (Esc, backdrop click) reports back through `onClose`. The children (server-rendered rules copy)
 * scroll; the footer (B_Button: Đóng + Viết KUDOS) stays pinned. "Viết KUDOS" closes the panel, then calls
 * `onWriteKudo` so the caller can open the write modal.
 */
export function KudosRulesDialog({
  open,
  onClose,
  onWriteKudo,
  copy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onWriteKudo: () => void;
  copy: KudosRulesDialogCopy;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // mm:3204:6052
    <dialog
      ref={dialogRef}
      aria-labelledby={TITLE_ID}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-0 ml-auto h-dvh max-h-none w-[min(553px,100vw)] max-w-none overflow-hidden bg-kudos-panel p-0 font-montserrat text-white backdrop:bg-black/60 open:flex open:flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6 pt-6 pb-6 pl-5 sm:gap-10 sm:pb-10 sm:pl-10">
        {/* mm:3204:6053. No right padding on the panel: the scroller runs to the panel edge so its scrollbar sits there and
            never narrows the 473px Figma content column (KudosRulesContent caps itself at 473px). */}
        <div data-testid="rules-scroll" className="min-h-0 flex-1 overflow-y-auto pr-4 sm:pr-0">
          {children}
        </div>
        {/* mm:3204:6092 */}
        <div className="flex shrink-0 gap-4 pr-5 sm:pr-10">
          {/* mm:3204:6093 */}
          <button
            type="button"
            onClick={onClose}
            className={`${FOOTER_BUTTON} shrink-0 border border-home-border bg-[rgb(255_234_158/0.1)] text-white hover:bg-[rgb(255_234_158/0.2)] ${FOCUS_RING}`}
          >
            {/* mm:I3204:6093;186:2759 */}
            <IconClose />
            {/* mm:I3204:6093;186:2760 */}
            {copy.close}
          </button>
          {/* mm:3204:6094 */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onWriteKudo();
            }}
            className={`${FOOTER_BUTTON} min-w-0 flex-1 bg-login-accent text-login-bg ${PRIMARY_CTA_HOVER} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
          >
            {/* mm:I3204:6094;186:1763 */}
            <IconPen />
            {/* mm:I3204:6094;186:1568 */}
            {copy.writeKudo}
          </button>
        </div>
      </div>
    </dialog>
  );
}
