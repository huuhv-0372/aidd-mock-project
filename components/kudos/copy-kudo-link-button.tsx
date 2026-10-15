"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";
import { kudoDetailHref } from "@/lib/navigation/routes";

export type CopyKudoLinkCopy = { label: string; toast: string };

const TOAST_MS = 3000;

/*
 * "Copy Link" button of a Kudo card (Figma 144x56): copies `{origin}/sun-kudos/{id}` and shows a toast.
 * The toast is portalled to <body>: the carousel track is transformed, which would otherwise make a `fixed`
 * toast position against the track instead of the viewport. It only exists while visible (one `status` at a time).
 */
export function CopyKudoLinkButton({ kudoId, copy }: { kudoId: string; copy: CopyKudoLinkCopy }) {
  const [toastVisible, setToastVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${kudoDetailHref(kudoId)}`);
    } catch {
      return; // clipboard blocked: stay silent rather than claim a copy that did not happen
    }
    setToastVisible(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToastVisible(false), TOAST_MS);
  }

  return (
    <>
      {/* mm:I2940:13465;335:9465 */}
      <button
        type="button"
        onClick={copyLink}
        className={`inline-flex min-h-14 min-w-11 cursor-pointer items-center gap-1 rounded p-4 text-base leading-6 font-bold tracking-[0.15px] text-login-bg hover:bg-black/5 motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_RING}`}
      >
        {/* mm:I2940:13465;335:9465;186:1439 */}
        {copy.label}
        {/* mm:I2940:13465;335:9465;186:1441 */}
        <span aria-hidden className="kudos-icon kudos-icon-link size-6" />
      </button>
      {toastVisible &&
        createPortal(
          <p
            role="status"
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-home-border bg-kudos-panel px-6 py-3 text-base leading-6 font-bold text-white shadow-[0_4px_4px_rgb(0_0_0/0.25),0_0_6px_#fae287]"
          >
            {copy.toast}
          </p>,
          document.body,
        )}
    </>
  );
}
