"use client";

import { useStatusToast } from "@/components/ui/status-toast";
import { kudoDetailHref } from "@/lib/navigation/routes";
import { KUDO_CARD_FOCUS_RING } from "./kudo-card-focus-ring";

export type CopyKudoLinkCopy = { label: string; toast: string };

/*
 * "Copy Link" button of a Kudo card (Figma 144x56): copies `{origin}/sun-kudos/{id}` and shows a toast
 * (shared `useStatusToast`: portalled to <body>, one `status` at a time).
 */
export function CopyKudoLinkButton({ kudoId, copy }: { kudoId: string; copy: CopyKudoLinkCopy }) {
  const { show, toast } = useStatusToast();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${kudoDetailHref(kudoId)}`);
    } catch {
      return; // clipboard blocked: stay silent rather than claim a copy that did not happen
    }
    show(copy.toast);
  }

  return (
    <>
      {/* mm:I2940:13465;335:9465 */}
      <button
        type="button"
        onClick={copyLink}
        className={`inline-flex min-h-14 min-w-11 cursor-pointer items-center gap-1 rounded p-4 text-base leading-6 font-bold tracking-[0.15px] text-login-bg hover:bg-black/5 motion-safe:transition-colors motion-safe:duration-200 ${KUDO_CARD_FOCUS_RING}`}
      >
        {/* mm:I2940:13465;335:9465;186:1439 */}
        {copy.label}
        {/* mm:I2940:13465;335:9465;186:1441 */}
        <span aria-hidden className="kudos-icon kudos-icon-link size-6" />
      </button>
      {toast}
    </>
  );
}
