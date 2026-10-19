"use client";

import Link from "next/link";
import { useEditorState, type Editor } from "@tiptap/react";
import type { ComponentType } from "react";
import { BoldIcon, ItalicIcon, LinkIcon, NumberListIcon, QuoteIcon, StrikethroughIcon } from "./compose-icons";
import { FOCUS } from "./compose-field-styles";
import { STANDARDS_PATH } from "@/lib/navigation/routes";
import type { WriteKudoCopy } from "./write-kudo-copy";

type Props = { editor: Editor | null; copy: WriteKudoCopy["toolbar"]; onInsertLink: () => void };

type Format = "bold" | "italic" | "strike" | "orderedList" | "blockquote";

// 40px cells with a 1px #998C5F border, 56px wide (24px icon + 15px padding + 1px border, as Figma draws strokes inside) (Figma mms_C.1-C.6, mm:I520:11647;520:9877). The "Tiêu chuẩn cộng đồng" cell (3053:11619) centers its 16/24 700 text.
const CELL =
  "flex h-11 min-w-11 cursor-pointer items-center justify-center border border-home-border bg-transparent px-2.5 sm:min-w-14 sm:px-[15px] text-login-bg hover:bg-[rgb(255_234_158/0.4)] disabled:cursor-not-allowed aria-pressed:bg-login-accent md:h-10 motion-safe:transition-colors motion-safe:duration-200";

const FORMATS: { format: Format; label: keyof Props["copy"]; Icon: ComponentType; rounded?: string }[] = [
  { format: "bold", label: "bold", Icon: BoldIcon, rounded: "rounded-tl-lg" },
  { format: "italic", label: "italic", Icon: ItalicIcon },
  { format: "strike", label: "strike", Icon: StrikethroughIcon },
  { format: "orderedList", label: "orderedList", Icon: NumberListIcon },
];

function toggle(editor: Editor, format: Format) {
  const chain = editor.chain().focus();
  if (format === "bold") chain.toggleBold();
  else if (format === "italic") chain.toggleItalic();
  else if (format === "strike") chain.toggleStrike();
  else if (format === "orderedList") chain.toggleOrderedList();
  else chain.toggleBlockquote();
  chain.run();
}

/*
 * Toolbar C (B / I / S / 1. / link / quote + "Tiêu chuẩn cộng đồng"). mousedown is cancelled on every button so the
 * editor keeps its selection and focus; `aria-pressed` follows the selection through useEditorState.
 */
export function KudoEditorToolbar({ editor, copy, onInsertLink }: Props) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      strike: current?.isActive("strike") ?? false,
      orderedList: current?.isActive("orderedList") ?? false,
      blockquote: current?.isActive("blockquote") ?? false,
    }),
  });
  const keep = (event: { preventDefault: () => void }) => event.preventDefault();

  function cell(format: Format, label: string, Icon: ComponentType, rounded = "") {
    return (
      <button
        key={format}
        type="button"
        aria-label={label}
        aria-pressed={active?.[format] ?? false}
        disabled={!editor}
        onMouseDown={keep}
        onClick={() => editor && toggle(editor, format)}
        className={`${CELL} ${rounded} ${FOCUS}`}
      >
        <Icon />
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-stretch">
      {FORMATS.map(({ format, label, Icon, rounded }) => cell(format, copy[label], Icon, rounded))}
      {/* mm:I520:11647;662:10507 */}
      <button
        type="button"
        aria-label={copy.link}
        aria-haspopup="dialog"
        disabled={!editor}
        onMouseDown={keep}
        onClick={onInsertLink}
        className={`${CELL} ${FOCUS}`}
      >
        <LinkIcon />
      </button>
      {cell("blockquote", copy.quote, QuoteIcon)}
      {/* mm:I520:11647;3053:11619 */}
      <Link
        href={STANDARDS_PATH}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex h-11 min-w-0 flex-1 basis-48 items-center justify-center sm:rounded-tr-lg border border-home-border px-4 text-base leading-6 font-bold tracking-[0.15px] text-[#e46060] underline hover:text-[#cf1322] md:h-10 ${FOCUS}`}
      >
        {copy.standards}
      </Link>
    </div>
  );
}
