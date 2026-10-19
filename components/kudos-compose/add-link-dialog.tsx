"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { validateAddLink, type AddLinkErrors } from "./add-link-validation";
import { FieldLabel } from "./compose-field-label";
import { CloseIcon, LinkIcon } from "./compose-icons";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, DIALOG_PANEL, ERROR_TEXT, INPUT } from "./compose-field-styles";
import type { AddLinkCopy } from "./write-kudo-copy";
import { useModalDialog } from "./use-modal-dialog";

type Props = {
  open: boolean;
  copy: AddLinkCopy;
  /** Esc, Hủy, backdrop click or a successful Lưu: closes only this dialog. */
  onClose: () => void;
  onSave: (value: { text: string; link: string }) => void;
};

function Row({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-4">
      <div className="sm:flex sm:h-14 sm:items-center">
        <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function AddLinkForm({ copy, onClose, onSave, titleId }: Omit<Props, "open"> & { titleId: string }) {
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [errors, setErrors] = useState<AddLinkErrors>({});
  const textId = useId();
  const linkId = useId();

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateAddLink(text, link, copy);
    setErrors(result.errors);
    if (result.errors.text || result.errors.link) return;
    onSave({ text: result.text, link: result.link });
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-8 p-5 sm:p-10">
      {/* mm:I1002:12682;1002:12500 */}
      <h2 id={titleId} className="text-[32px] leading-10 font-bold">
        {copy.title}
      </h2>
      {/* mm:I1002:12682;1002:12501 (inputs carry no maxlength: the error must be reachable by typing past the limit) */}
      <Row label={copy.textLabel} htmlFor={textId}>
        <input
          id={textId}
          type="text"
          value={text}
          aria-invalid={errors.text ? true : undefined}
          onChange={(event) => setText(event.target.value)}
          className={INPUT}
        />
        {errors.text && (
          <p data-testid="error-text" className={ERROR_TEXT}>
            {errors.text}
          </p>
        )}
      </Row>
      {/* mm:I1002:12682;1002:12652 */}
      <Row label={copy.linkLabel} htmlFor={linkId}>
        <input
          id={linkId}
          type="text"
          inputMode="url"
          autoComplete="off"
          value={link}
          aria-invalid={errors.link ? true : undefined}
          onChange={(event) => setLink(event.target.value)}
          className={INPUT}
        />
        {errors.link && (
          <p data-testid="error-link" className={ERROR_TEXT}>
            {errors.link}
          </p>
        )}
      </Row>
      {/* mm:I1002:12682;1002:12543 */}
      <div className="flex gap-6">
        {/* mm:I1002:12682;1002:12544 */}
        <button type="button" onClick={onClose} className={BUTTON_SECONDARY}>
          {copy.cancel}
          <CloseIcon />
        </button>
        {/* mm:I1002:12682;1002:12545 */}
        <button type="submit" className={BUTTON_PRIMARY}>
          {copy.save}
          <LinkIcon />
        </button>
      </div>
    </form>
  );
}

/*
 * Add link (Figma OyDLDuSGEa, mm:1002:12682): nested native <dialog> opened by the toolbar link button. Fields are
 * unmounted while closed, so every open starts empty. Validation lives in add-link-validation.ts.
 */
export function AddLinkDialog({ open, copy, onClose, onSave }: Props) {
  const ref = useModalDialog(open);
  const titleId = useId();
  return (
    <dialog
      ref={ref}
      aria-labelledby={open ? titleId : undefined}
      onClose={(event) => event.target === event.currentTarget && open && onClose()}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className={DIALOG_PANEL}
    >
      {open && <AddLinkForm titleId={titleId} copy={copy} onClose={onClose} onSave={onSave} />}
    </dialog>
  );
}

