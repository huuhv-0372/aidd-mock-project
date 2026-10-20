"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { useEffect, useId, useRef, useState } from "react";
import { AddLinkDialog } from "./add-link-dialog";
import { ERROR_FLOAT } from "./compose-field-styles";
import { EDITOR_CLASS } from "./kudo-editor-styles";
import { KudoEditorToolbar } from "./kudo-editor-toolbar";
import { createMentionExtension } from "./kudo-mention-extension";
import { MentionSuggestionList } from "./mention-suggestion-list";
import { useMentionPopup } from "./use-mention-popup";
import type { WriteKudoCopy } from "./write-kudo-copy";
import type { WriteKudoActions } from "./write-kudo-types";

type Props = {
  copy: WriteKudoCopy;
  searchSunners: WriteKudoActions["searchSunners"];
  error: string | null;
  /** The document changed: the form reads whether it has visible text (a mention counts) and how long its Markdown is. */
  onContentChange: (editor: Editor) => void;
  /** Leaving the editor (not for the Add link detour): the form decides whether to show the required error. */
  onBlur: () => void;
  /** Hands the form the live editor so submit can read editor.getJSON(). */
  onEditorReady: (editor: Editor | null) => void;
};

function editorAttributes(label: string, describedBy: string, error: string | null): Record<string, string> {
  return {
    role: "textbox",
    "aria-multiline": "true",
    "aria-label": label,
    "aria-describedby": describedBy,
    ...(error ? { "aria-invalid": "true" } : {}),
    "data-testid": "kudo-editor",
    class: EDITOR_CLASS,
  };
}

/*
 * Rich text field (Figma C / D / D.1, mm:520:9875): Tiptap v3 with bold, italic, strike, ordered list, quote, links
 * (Add link dialog) and "@" mentions. The toolbar, the "@" list and the Add link dialog all live inside this block so
 * they stay inside the modal's top layer.
 */
export function KudoRichEditor({ copy, searchSunners, error, onContentChange, onBlur, onEditorReady }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const linkOpenRef = useRef(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const hintId = useId();
  const errorId = useId();
  const mention = useMentionPopup(wrapperRef);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        underline: false,
        trailingNode: false,
        link: { openOnClick: false, autolink: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
      }),
      Placeholder.configure({ placeholder: copy.editor.placeholder }),
      createMentionExtension({ searchSunners, onPopup: mention.onPopup, onKey: mention.onKey }),
    ],
    editorProps: { attributes: editorAttributes(copy.editor.label, hintId, null) },
    onUpdate: ({ editor: current }) => onContentChange(current),
    onBlur: () => {
      if (!linkOpenRef.current) onBlur();
    },
  });

  useEffect(() => {
    onEditorReady(editor);
    return () => onEditorReady(null);
  }, [editor, onEditorReady]);

  // aria-invalid / aria-describedby sit on the contenteditable, which Tiptap owns: they go through its editorProps.
  useEffect(() => {
    editor?.setOptions({
      editorProps: { attributes: editorAttributes(copy.editor.label, error ? `${hintId} ${errorId}` : hintId, error) },
    });
  }, [editor, error, copy.editor.label, hintId, errorId]);

  function setLink(open: boolean) {
    linkOpenRef.current = open;
    setLinkOpen(open);
  }

  return (
    <div ref={wrapperRef} className="relative flex flex-col gap-1">
      <div className="flex flex-col">
        {/* mm:I520:11647;520:9877 */}
        <KudoEditorToolbar editor={editor} copy={copy.toolbar} onInsertLink={() => setLink(true)} />
        {/* mm:I520:11647;520:9886 */}
        <div
          className={`h-[200px] cursor-text overflow-y-auto rounded-b-lg border border-t-0 bg-white focus-within:ring-1 motion-safe:transition-colors motion-safe:duration-200 ${error ? "border-[#cf1322] focus-within:ring-[#cf1322]" : "border-home-border focus-within:border-login-bg focus-within:ring-login-bg"}`}
          onClick={() => editor?.commands.focus()}
        >
          <EditorContent editor={editor} className="min-h-full [&>div]:min-h-[198px]" />
        </div>
      </div>
      <MentionSuggestionList
        popup={mention.popup}
        active={mention.index}
        label={copy.editor.mentionListLabel}
        noResultLabel={copy.recipient.noResult}
        onPick={(item) => mention.popup?.pick(item)}
        onHover={mention.move}
      />
      {/* mm:I520:11647;520:9887 */}
      <p id={hintId} className="text-center text-base leading-6 font-bold tracking-[0.5px] text-login-bg">
        {copy.editor.mentionHint}
      </p>
      {error && (
        <p id={errorId} data-testid="error-content" className={ERROR_FLOAT}>
          {error}
        </p>
      )}
      <AddLinkDialog
        open={linkOpen}
        copy={copy.addLink}
        onClose={() => setLink(false)}
        onSave={({ text, link }) => {
          setLink(false);
          editor
            ?.chain()
            .focus()
            .insertContent({ type: "text", text, marks: [{ type: "link", attrs: { href: link } }] })
            .run();
        }}
      />
    </div>
  );
}
