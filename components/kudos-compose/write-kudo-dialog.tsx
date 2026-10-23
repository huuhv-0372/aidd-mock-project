"use client";

import { useId, useRef } from "react";
import { DIALOG_PANEL } from "./compose-field-styles";
import { useModalDialog } from "./use-modal-dialog";
import { WriteKudoForm } from "./write-kudo-form";
import type { WriteKudoCopy } from "./write-kudo-copy";
import type { KudoRow } from "@/lib/kudos/kudo-types";
import type { EditableKudo, RecipientChoice, WriteKudoActions, WriteKudoLocale } from "./write-kudo-types";

export type WriteKudoDialogProps = {
  open: boolean;
  /** Hủy, Esc, backdrop click, or right after a successful send. The form is discarded. */
  onClose: () => void;
  /** A Kudo was created (called right before onClose). */
  onSent: (id: string) => void;
  locale: WriteKudoLocale;
  /** Recipient already chosen when the modal opens (e.g. from a profile page); null starts the field empty. */
  initialRecipient?: RecipientChoice | null;
  copy: WriteKudoCopy;
  /** Server actions of the Kudos feature, injected so this component never imports server code. */
  actions: WriteKudoActions;
  /** Tiptap JSON -> Markdown (lib/kudos/kudo-content-markdown.ts `toMarkdown`). */
  serializeContent: (doc: unknown) => string;
  /** Edit mode (plans/261022-edit-kudo): a Kudo the viewer sent. Present = the modal pre-fills it and Lưu saves it. */
  initialKudo?: EditableKudo | null;
  /** A Kudo was saved in edit mode, with the row as stored (called right before onClose). */
  onSaved: (kudo: KudoRow) => void;
};

/*
 * Viết Kudo modal (Figma ihQ26W78P2; edit mode: 419VXmMy6I): native <dialog> + showModal() (focus trap, Esc, inert page). The form inside is
 * mounted only while open, so every open starts empty. Works with next/dynamic({ ssr: false }) (named + default export).
 */
export function WriteKudoDialog({ open, onClose, onSent, locale, initialRecipient = null, copy, actions, serializeContent, initialKudo = null, onSaved }: WriteKudoDialogProps) {
  const ref = useModalDialog(open);
  const titleId = useId();
  const busyRef = useRef(false);
  return (
    <dialog
      ref={ref}
      aria-labelledby={open ? titleId : undefined}
      // close / cancel bubble through the React tree: ignore the ones fired by the nested Add link dialog
      onCancel={(event) => event.target === event.currentTarget && busyRef.current && event.preventDefault()}
      onClose={(event) => event.target === event.currentTarget && open && onClose()}
      onClick={(event) => event.target === event.currentTarget && !busyRef.current && onClose()}
      className={DIALOG_PANEL}
    >
      {open && (
        <WriteKudoForm
          titleId={titleId}
          copy={copy}
          locale={locale}
          initialRecipient={initialRecipient}
          actions={actions}
          serializeContent={serializeContent}
          initialKudo={initialKudo}
          onSent={onSent}
          onSaved={onSaved}
          onClose={onClose}
          busyRef={busyRef}
        />
      )}
    </dialog>
  );
}

export default WriteKudoDialog;
