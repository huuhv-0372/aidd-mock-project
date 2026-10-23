"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { kudoMarkdownToEditorJson } from "@/lib/kudos/kudo-content-editor-json";
import type { KudoRow } from "@/lib/kudos/kudo-types";
import { buildCreateKudoData, buildUpdateKudoData } from "./kudo-form-data";
import { useHashtagOptions } from "./use-hashtag-options";
import { useImageAttachments } from "./use-image-attachments";
import type { WriteKudoCopy } from "./write-kudo-copy";
import { KUDO_LIMITS, type EditableKudo, type RecipientChoice, type WriteKudoActions } from "./write-kudo-types";

type Args = {
  /** Recipient already chosen at mount (counts as picked: no error, Gửi can enable). */
  initialRecipient?: RecipientChoice | null;
  copy: WriteKudoCopy;
  actions: WriteKudoActions;
  serializeContent: (doc: unknown) => string;
  /** Edit mode: the Kudo to pre-fill. Present = Lưu calls updateKudo instead of createKudo. */
  initialKudo?: EditableKudo | null;
  onSent: (id: string) => void;
  /** Edit mode: the Kudo as saved (called right before onClose). */
  onSaved?: (kudo: KudoRow) => void;
  onClose: () => void;
};

type Field = "recipient" | "title" | "content" | "hashtags";
const FIELDS: readonly Field[] = ["recipient", "title", "content", "hashtags"];

/**
 * State + submit of the Viết Kudo form. Rules (clarifications.md): Gửi stays disabled until Người nhận + Danh hiệu +
 * nội dung + >=1 Hashtag are set; each field shows "Không được để trống" once the user leaves it; the server answers
 * with a generic failure that is shown as one line (`error-form`), image problems under the images row, and a refused
 * recipient / title / content / hashtags ("invalid": the value was filled) under that field. Content over KUDO_LIMITS.contentMax characters of Markdown is
 * flagged while typing and blocks Gửi (the server would refuse it anyway).
 *
 * Edit mode (`initialKudo`): every field starts from the saved Kudo, the same Gửi rules apply to Lưu, and the FormData
 * (kudo-form-data.ts) carries the kept / new images instead of a recipient and the anonymous state.
 * FormData sent to createKudo: recipientId, title, content (Markdown), hashtags (repeated slug), isAnonymous
 * ("true" | "false"), anonymousName (only when anonymous and not blank), images (repeated File, in order).
 */
export function useWriteKudoForm({ initialRecipient = null, copy, actions, serializeContent, initialKudo = null, onSent, onSaved, onClose }: Args) {
  const [recipient, setRecipient] = useState<RecipientChoice | null>(initialKudo?.recipient ?? initialRecipient);
  const [recipientTyped, setRecipientTyped] = useState(false);
  const [title, setTitle] = useState(initialKudo?.title ?? "");
  // The converter is imported here, not by the page-level provider: it ships in the lazily loaded dialog chunk only.
  const [initialDoc] = useState(() => (initialKudo ? kudoMarkdownToEditorJson(initialKudo.content) : undefined));
  const [hasContent, setHasContent] = useState(Boolean(initialKudo)); // the editor re-reads it once created
  const [contentLength, setContentLength] = useState(0);
  const [hashtagSlugs, setHashtagSlugsState] = useState<string[]>(initialKudo?.hashtagSlugs ?? []);
  const [refused, setRefused] = useState<Partial<Record<Field, true>>>({});
  const [anonymous, setAnonymous] = useState(initialKudo?.isAnonymous ?? false);
  const [alias, setAlias] = useState(initialKudo?.anonymousName ?? "");
  const [touched, setTouched] = useState<Record<Field, boolean>>({ recipient: false, title: false, content: false, hashtags: false });
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const images = useImageAttachments(copy.errors, initialKudo?.images);
  const editorRef = useRef<Editor | null>(null);
  const sendingRef = useRef(false);
  const hashtags = useHashtagOptions(actions.getHashtagOptions);

  const touch = useCallback((field: Field) => setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true })), []);
  // Removing the last tag counts as leaving the field: "required" shows at once, not only when the dropdown closes.
  const setHashtagSlugs = useCallback(
    (slugs: string[]) => {
      setHashtagSlugsState(slugs);
      if (slugs.length === 0) touch("hashtags");
    },
    [touch],
  );
  const onContentChange = useCallback(
    (editor: Editor) => {
      setHasContent(editor.getText().trim().length > 0);
      setContentLength([...serializeContent(editor.getJSON())].length); // code points, as the server counts them
    },
    [serializeContent],
  );
  const onEditorReady = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
  }, []);

  const contentTooLong = contentLength > KUDO_LIMITS.contentMax;

  // An empty field that was left says "required"; `refused`: the server rejected a value the client had accepted (a race, a
  // forged state), which says "invalid" because the field is filled. That message stays until the next try.
  const fieldError = (field: Field, empty: boolean, emptyMessage = copy.required) =>
    (touched[field] && empty ? emptyMessage : null) ?? (refused[field] ? copy.errors.invalid : null);
  const errors: Record<Field, string | null> = {
    // Text typed but no Sunner picked reads differently from an empty field: it asks for a pick, not for input.
    recipient: fieldError("recipient", !recipient, recipientTyped ? copy.recipient.pickFromList : copy.required),
    title: fieldError("title", !title.trim()),
    content: contentTooLong ? copy.errors.contentTooLong : fieldError("content", !hasContent),
    hashtags: fieldError("hashtags", hashtagSlugs.length === 0),
  };
  const canSend = Boolean(recipient) && title.trim().length > 0 && hasContent && !contentTooLong && hashtagSlugs.length > 0 && !sending;

  async function submit() {
    const editor = editorRef.current;
    if (!canSend || !editor || !recipient || sendingRef.current) return;
    sendingRef.current = true;
    const failedText = initialKudo ? copy.errors.saveFailed : copy.errors.sendFailed;
    setSending(true);
    setFormError(null);
    setRefused({});
    images.setError(null);
    try {
      const common = { title, content: serializeContent(editor.getJSON()), hashtagSlugs, alias, anonymous, images: images.images };
      let failure: { fields?: Record<string, string> } | null = null;
      if (initialKudo) {
        const result = await actions.updateKudo(buildUpdateKudoData({ ...common, kudoId: initialKudo.id }));
        if (result.ok) onSaved?.(result.kudo);
        else failure = result;
      } else {
        const result = await actions.createKudo(buildCreateKudoData({ ...common, recipientId: recipient.id }));
        if (result.ok) onSent(result.id);
        else failure = result;
      }
      if (!failure) {
        onClose();
        return;
      }
      const fields = failure.fields ?? {};
      const refusedFields = FIELDS.filter((field) => fields[field]);
      // Edit mode: "invalid" is a refused kept image or the total count, not a file format problem.
      const imageInvalid = initialKudo ? copy.errors.invalid : copy.errors.imageFormat;
      if (fields.images) images.setError(fields.images === "size" ? copy.errors.imageSize : fields.images === "format" ? copy.errors.imageFormat : imageInvalid);
      else if (refusedFields.length > 0) setRefused(Object.fromEntries(refusedFields.map((field) => [field, true])));
      else setFormError(failedText); // generic, not_found, or a field with no place on the form (alias)
    } catch {
      setFormError(failedText);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return {
    recipient, setRecipient, setRecipientTyped, title, setTitle, hashtagSlugs, setHashtagSlugs, hashtags, anonymous, setAnonymous, alias, setAlias,
    onContentChange, images, errors, touch, onEditorReady, canSend, sending, formError, submit, initialDoc, contentLength, contentTooLong,
  };
}
