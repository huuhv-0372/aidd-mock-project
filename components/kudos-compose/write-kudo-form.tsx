"use client";

import { useEffect, type RefObject } from "react";
import { AnonymousToggle } from "./anonymous-toggle";
import { CloseIcon, SendIcon } from "./compose-icons";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, ERROR_TEXT } from "./compose-field-styles";
import { HashtagPicker } from "./hashtag-picker";
import { ImagePicker } from "./image-picker";
import { KudoRichEditor } from "./kudo-rich-editor";
import { KudoTitleField } from "./kudo-title-field";
import { RecipientPicker } from "./recipient-picker";
import { useWriteKudoForm } from "./use-write-kudo-form";
import type { WriteKudoCopy } from "./write-kudo-copy";
import type { WriteKudoActions, WriteKudoLocale } from "./write-kudo-types";

type Props = {
  titleId: string;
  copy: WriteKudoCopy;
  locale: WriteKudoLocale;
  actions: WriteKudoActions;
  serializeContent: (doc: unknown) => string;
  onSent: (id: string) => void;
  onClose: () => void;
  /** Mirrors "a Kudo is being sent" so the dialog can refuse Esc / backdrop closes meanwhile. */
  busyRef: RefObject<boolean>;
};

/*
 * Body of the Viết Kudo modal (Figma ihQ26W78P2, mm:520:11647): 752px cream card, 40px padding, 32px between blocks.
 * It is mounted only while the dialog is open, so closing (Hủy / Esc / backdrop) throws the whole form state away.
 */
export function WriteKudoForm({ titleId, copy, locale, actions, serializeContent, onSent, onClose, busyRef }: Props) {
  const form = useWriteKudoForm({ copy, actions, serializeContent, onSent, onClose });
  const { errors, touch } = form;

  useEffect(() => {
    busyRef.current = form.sending;
  }, [busyRef, form.sending]);

  return (
    <div className="flex max-h-[calc(100dvh_-_1rem)] flex-col gap-8 overflow-y-auto rounded-3xl p-5 font-montserrat sm:p-10">
      {/* mm:I520:11647;520:9870 */}
      <h2 id={titleId} className="text-center text-2xl leading-8 font-bold sm:text-[32px] sm:leading-10">
        {copy.title}
      </h2>
      <RecipientPicker
        copy={copy}
        searchSunners={actions.searchSunners}
        value={form.recipient}
        onChange={form.setRecipient}
        onBlur={() => touch("recipient")}
        onTypedChange={form.setRecipientTyped}
        error={errors.recipient}
      />
      <KudoTitleField copy={copy} value={form.title} onChange={form.setTitle} onBlur={() => touch("title")} error={errors.title} />
      {/* mm:I520:11647;520:9874 */}
      <div className="flex flex-col gap-6">
        <KudoRichEditor
          copy={copy}
          searchSunners={actions.searchSunners}
          error={errors.content}
          onContentChange={form.onContentChange}
          onBlur={() => touch("content")}
          onEditorReady={form.onEditorReady}
        />
        <HashtagPicker
          copy={copy}
          locale={locale}
          options={form.hashtags.options}
          loadFailed={form.hashtags.failed}
          onRetry={form.hashtags.retry}
          selected={form.hashtagSlugs}
          onChange={form.setHashtagSlugs}
          onClosed={() => touch("hashtags")}
          error={errors.hashtags}
        />
        <ImagePicker
          copy={copy.image}
          images={form.images.images}
          error={form.images.error}
          onAdd={form.images.add}
          onRemove={form.images.remove}
        />
      </div>
      <AnonymousToggle
        copy={copy.anonymous}
        checked={form.anonymous}
        onCheckedChange={form.setAnonymous}
        alias={form.alias}
        onAliasChange={form.setAlias}
      />
      {/* mm:I520:11647;520:9905 */}
      <div className="flex flex-col gap-3">
        {form.formError && (
          <p role="alert" data-testid="error-form" className={`${ERROR_TEXT} text-center`}>
            {form.formError}
          </p>
        )}
        <div className="flex gap-4 sm:gap-6">
          {/* mm:I520:11647;520:9906 */}
          <button type="button" onClick={onClose} disabled={form.sending} className={BUTTON_SECONDARY}>
            {copy.actions.cancel}
            <CloseIcon />
          </button>
          {/* mm:I520:11647;520:9907 */}
          <button type="button" onClick={form.submit} disabled={!form.canSend} aria-busy={form.sending} className={BUTTON_PRIMARY}>
            {copy.actions.send}
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
