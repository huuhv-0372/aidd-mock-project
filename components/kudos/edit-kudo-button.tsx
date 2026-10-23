"use client";

import { useKudosComposer } from "@/components/kudos-compose/kudos-composer-provider";
import type { KudoRow } from "@/lib/kudos/kudo-types";
import { KUDO_CARD_FOCUS_RING } from "./kudo-card-focus-ring";

/*
 * Pencil beside the title of a Kudo the viewer sent (Figma mm:I3127:21871;2234:33040): opens the Viết Kudo modal in edit
 * mode. The 32px glyph sits in a 44px hit area; the -m-1.5 gives the 12px back so the title row keeps its design height.
 */
export function EditKudoButton({ kudo }: { kudo: KudoRow }) {
  const { openEditor, editLabel } = useKudosComposer();
  return (
    <button
      type="button"
      data-testid="kudo-edit-icon"
      aria-label={editLabel}
      onClick={() => openEditor(kudo)}
      className={`-m-1.5 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-login-bg hover:bg-[rgb(255_234_158/0.6)] motion-safe:transition-colors motion-safe:duration-200 ${KUDO_CARD_FOCUS_RING}`}
    >
      <span aria-hidden className="kudos-icon kudos-icon-pen size-8" />
    </button>
  );
}
