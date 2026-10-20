"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { useHashtagOptions } from "./use-hashtag-options";
import { useImageAttachments } from "./use-image-attachments";
import type { WriteKudoCopy } from "./write-kudo-copy";
import { KUDO_LIMITS, type RecipientChoice, type WriteKudoActions } from "./write-kudo-types";

type Args = {
  copy: WriteKudoCopy;
  actions: WriteKudoActions;
  serializeContent: (doc: unknown) => string;
  onSent: (id: string) => void;
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
 * FormData sent to createKudo: recipientId, title, content (Markdown), hashtags (repeated slug), isAnonymous
 * ("true" | "false"), anonymousName (only when anonymous and not blank), images (repeated File, in order).
 */
export function useWriteKudoForm({ copy, actions, serializeContent, onSent, onClose }: Args) {
  const [recipient, setRecipient] = useState<RecipientChoice | null>(null);
  const [recipientTyped, setRecipientTyped] = useState(false);
  const [title, setTitle] = useState("");
  const [hasContent, setHasContent] = useState(false);
  const [contentTooLong, setContentTooLong] = useState(false);
  const [hashtagSlugs, setHashtagSlugs] = useState<string[]>([]);
  const [refused, setRefused] = useState<Partial<Record<Field, true>>>({});
  const [anonymous, setAnonymous] = useState(false);
  const [alias, setAlias] = useState("");
  const [touched, setTouched] = useState<Record<Field, boolean>>({ recipient: false, title: false, content: false, hashtags: false });
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const images = useImageAttachments(copy.errors);
  const editorRef = useRef<Editor | null>(null);
  const sendingRef = useRef(false);
  const hashtags = useHashtagOptions(actions.getHashtagOptions);

  const touch = useCallback((field: Field) => setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true })), []);
  const onContentChange = useCallback(
    (editor: Editor) => {
      setHasContent(editor.getText().trim().length > 0);
      setContentTooLong(serializeContent(editor.getJSON()).length > KUDO_LIMITS.contentMax);
    },
    [serializeContent],
  );
  const onEditorReady = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
  }, []);

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
    setSending(true);
    setFormError(null);
    setRefused({});
    images.setError(null);
    try {
      const data = new FormData();
      data.set("recipientId", recipient.id);
      data.set("title", title.trim());
      data.set("content", serializeContent(editor.getJSON()));
      for (const slug of hashtagSlugs) data.append("hashtags", slug);
      data.set("isAnonymous", String(anonymous));
      if (anonymous && alias.trim()) data.set("anonymousName", alias.trim());
      for (const image of images.images) data.append("images", image.file);
      const result = await actions.createKudo(data);
      if (result.ok) {
        onSent(result.id);
        onClose();
        return;
      }
      const fields = result.fields ?? {};
      const refusedFields = FIELDS.filter((field) => fields[field]);
      if (fields.images) images.setError(fields.images === "size" ? copy.errors.imageSize : copy.errors.imageFormat);
      else if (refusedFields.length > 0) setRefused(Object.fromEntries(refusedFields.map((field) => [field, true])));
      else setFormError(copy.errors.sendFailed); // generic, or a field with no place on the form (alias)
    } catch {
      setFormError(copy.errors.sendFailed);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return {
    recipient, setRecipient, setRecipientTyped, title, setTitle, hashtagSlugs, setHashtagSlugs, hashtags, anonymous, setAnonymous, alias, setAlias,
    onContentChange, images, errors, touch, onEditorReady, canSend, sending, formError, submit,
  };
}
