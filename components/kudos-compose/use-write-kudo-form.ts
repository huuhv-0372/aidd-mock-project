"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useImageAttachments } from "./use-image-attachments";
import type { WriteKudoCopy } from "./write-kudo-copy";
import type { HashtagOption, RecipientChoice, WriteKudoActions } from "./write-kudo-types";

type Args = {
  copy: WriteKudoCopy;
  actions: WriteKudoActions;
  serializeContent: (doc: unknown) => string;
  onSent: (id: string) => void;
  onClose: () => void;
};

type Field = "recipient" | "title" | "content" | "hashtags";

/**
 * State + submit of the Viết Kudo form. Rules (clarifications.md): Gửi stays disabled until Người nhận + Danh hiệu +
 * nội dung + >=1 Hashtag are set; each field shows "Không được để trống" once the user leaves it; the server answers
 * with a generic failure that is shown as one line (`error-form`), image problems under the images row.
 *
 * FormData sent to createKudo: recipientId, title, content (Markdown), hashtags (repeated slug), isAnonymous
 * ("true" | "false"), anonymousName (only when anonymous and not blank), images (repeated File, in order).
 */
export function useWriteKudoForm({ copy, actions, serializeContent, onSent, onClose }: Args) {
  const [recipient, setRecipient] = useState<RecipientChoice | null>(null);
  const [recipientTyped, setRecipientTyped] = useState(false);
  const [title, setTitle] = useState("");
  const [hasContent, setHasContent] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagOptions, setHashtagOptions] = useState<HashtagOption[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [alias, setAlias] = useState("");
  const [touched, setTouched] = useState<Record<Field, boolean>>({ recipient: false, title: false, content: false, hashtags: false });
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const images = useImageAttachments(copy.errors);
  const editorRef = useRef<Editor | null>(null);
  const sendingRef = useRef(false);
  const { getHashtagOptions } = actions;

  useEffect(() => {
    let alive = true;
    getHashtagOptions().then((result) => alive && setHashtagOptions(result.ok ? result.items : []));
    return () => {
      alive = false;
    };
  }, [getHashtagOptions]);

  const touch = useCallback((field: Field) => setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true })), []);
  const onEditorReady = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
  }, []);

  const required = copy.required;
  const errors: Record<Field, string | null> = {
    // Text typed but no Sunner picked reads differently from an empty field: it asks for a pick, not for input.
    recipient: touched.recipient && !recipient ? (recipientTyped ? copy.recipient.pickFromList : required) : null,
    title: touched.title && !title.trim() ? required : null,
    content: touched.content && !hasContent ? required : null,
    hashtags: touched.hashtags && hashtags.length === 0 ? required : null,
  };
  const canSend = Boolean(recipient) && title.trim().length > 0 && hasContent && hashtags.length > 0 && !sending;

  async function submit() {
    const editor = editorRef.current;
    if (!canSend || !editor || !recipient || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setFormError(null);
    images.setError(null);
    try {
      const data = new FormData();
      data.set("recipientId", recipient.id);
      data.set("title", title.trim());
      data.set("content", serializeContent(editor.getJSON()));
      for (const slug of hashtags) data.append("hashtags", slug);
      data.set("isAnonymous", String(anonymous));
      if (anonymous && alias.trim()) data.set("anonymousName", alias.trim());
      for (const image of images.images) data.append("images", image.file);
      const result = await actions.createKudo(data);
      if (result.ok) {
        onSent(result.id);
        onClose();
        return;
      }
      if (result.fields?.images) images.setError(result.fields.images === "size" ? copy.errors.imageSize : copy.errors.imageFormat);
      else setFormError(copy.errors.sendFailed);
    } catch {
      setFormError(copy.errors.sendFailed);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return {
    recipient, setRecipient, setRecipientTyped, title, setTitle, hashtags, setHashtags, hashtagOptions, anonymous, setAnonymous, alias, setAlias,
    setHasContent, images, errors, touch, onEditorReady, canSend, sending, formError, submit,
  };
}
