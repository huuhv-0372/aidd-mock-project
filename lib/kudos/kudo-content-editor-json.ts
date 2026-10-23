/**
 * Stored Kudo content (the Markdown-lite written by kudo-content-markdown.ts) -> the Tiptap document the edit modal
 * pre-fills (plans/261022-edit-kudo). The exact inverse of kudoEditorJsonToMarkdown for everything that serializer
 * writes: `kudoEditorJsonToMarkdown(kudoMarkdownToEditorJson(md)) === md`, so opening a Kudo and saving it unchanged
 * sends the stored Markdown back byte for byte. Client-safe: no zod, no editor package, no server import.
 *
 * Reads the same syntax as the detail page's reader (kudo-content-blocks.ts), but keeps what that reader drops on
 * purpose and the editor needs: mention ids, blank lines (empty paragraphs) and leading spaces. Every line is one
 * paragraph (the serializer writes paragraphs and hard breaks alike as `\n`). A marker-only line `N.` is the trimmed
 * last line of an empty item when it ends its block; mid-text it follows the reader's rule (otherwise it is text).
 *
 * Runs on any stored string: never throws, unknown syntax stays text, nothing backtracks (delimiters found with
 * indexOf, link/mention patterns exclude their own delimiters except whole mention tokens, nesting depth capped).
 */
import type { KudoEditorMark, KudoEditorNode } from "@/lib/kudos/kudo-content-markdown";

// The serializer's escapes become private-use placeholders before parsing (same scheme as kudo-content-blocks.ts).
const ESCAPABLE = "\\`*_~[].>";
const PLACEHOLDER_BASE = 0xe000;
const PLACEHOLDER = /[-]/g;

const protectEscapes = (markdown: string) =>
  markdown.replace(/\\([\\`*_~[\].>])/g, (_, char: string) => String.fromCharCode(PLACEHOLDER_BASE + ESCAPABLE.indexOf(char)));
const unescapeChar = (placeholder: string) => ESCAPABLE[placeholder.charCodeAt(0) - PLACEHOLDER_BASE];
/** Editor text: the escaped character without its backslash. */
const restoreText = (text: string) => text.replace(PLACEHOLDER, unescapeChar);
/** A link target is never escaped by the serializer: any `\x` in it was in the URL. */
const restoreRaw = (text: string) => text.replace(PLACEHOLDER, (placeholder) => `\\${unescapeChar(placeholder)}`);

const INDENT = "   ";
const MAX_DEPTH = 8;
const LIST_MARKER = /^(\d{1,9})\.(?: |$)/;
const QUOTE_MARKER = /^> ?/;
const MENTION = /@\[([^[\]]*)\]\(([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)/y;
// The label may hold whole mention tokens (a URL pasted over a mention: `[hi @[An](uuid)](url)`), no other bare bracket.
// Still linear: past a failed mention branch the `@` is text and the next `[` ends the label.
const LINK = /\[((?:@\[[^[\]]*\]\([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\)|[^[\]])*)\]\(([^()]*)\)/y;
const MARKS: readonly (readonly [string, KudoEditorMark])[] = [
  ["**", { type: "bold" }],
  ["~~", { type: "strike" }],
  ["_", { type: "italic" }],
];

/** http(s) only, kept as written (the serializer normalises it again). try/catch, not URL.canParse: older browsers lack it. */
function safeHref(raw: string): string | null {
  try {
    const { protocol } = new URL(raw);
    return protocol === "http:" || protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
}

const withMarks = (marks: KudoEditorMark[]) => (marks.length ? { marks } : {});
const emptyParagraph = (): KudoEditorNode => ({ type: "paragraph", content: [] });

type Token = { nodes: KudoEditorNode[]; end: number };

/** The inline token starting at `i` (its nodes carry `marks` plus its own), or null when the character there is text. */
function readToken(text: string, i: number, marks: KudoEditorMark[]): Token | null {
  const char = text[i];
  if (char === "@" || char === "[") {
    const pattern = char === "@" ? MENTION : LINK;
    pattern.lastIndex = i;
    const match = pattern.exec(text);
    if (!match) return null;
    const end = pattern.lastIndex;
    if (char === "@") return { nodes: [{ type: "mention", attrs: { id: match[2], label: restoreText(match[1]) }, ...withMarks(marks) }], end };
    const href = safeHref(restoreRaw(match[2]));
    // Not http(s): the label stays, the target never reaches the editor (as on the detail page).
    return { nodes: parseInline(match[1], href ? [...marks, { type: "link", attrs: { href } }] : marks), end };
  }
  for (const [delimiter, mark] of MARKS) {
    if (!text.startsWith(delimiter, i)) continue;
    // The first closer wins: a span never holds its own delimiter, so a mark never nests in itself.
    const close = text.indexOf(delimiter, i + delimiter.length);
    if (close <= i + delimiter.length) return null;
    return { nodes: parseInline(text.slice(i + delimiter.length, close), [...marks, mark]), end: close + delimiter.length };
  }
  return null;
}

/** Text and mention nodes with their marks flattened onto them, as Tiptap stores them. Never an empty text node. */
function parseInline(text: string, marks: KudoEditorMark[]): KudoEditorNode[] {
  const out: KudoEditorNode[] = [];
  let plainFrom = 0;
  const pushPlain = (to: number) => {
    if (to > plainFrom) out.push({ type: "text", text: restoreText(text.slice(plainFrom, to)), ...withMarks(marks) });
  };
  for (let i = 0; i < text.length; ) {
    const token = readToken(text, i, marks);
    if (!token) {
      i++;
      continue;
    }
    pushPlain(i);
    out.push(...token.nodes);
    i = plainFrom = token.end;
  }
  pushPlain(text.length);
  return out;
}

const paragraph = (line: string): KudoEditorNode => (line ? { type: "paragraph", content: parseInline(line, []) } : emptyParagraph());

/**
 * Whether `lines[at]` opens a list: a marker with anything after it (the serializer writes `N. ` even for an empty
 * item and escapes a typed one), or a bare `N.` that is the last line of its block (the document's trimEnd took its
 * space) or that the reader would continue (an INDENT-ed line or the next number below it).
 */
function opensList(lines: string[], at: number): boolean {
  const match = LIST_MARKER.exec(lines[at]);
  if (!match) return false;
  if (match[0].endsWith(" ") || at === lines.length - 1) return true;
  const next = lines[at + 1];
  if (next.startsWith(INDENT)) return true;
  const following = LIST_MARKER.exec(next);
  return following !== null && Number(following[1]) === Number(match[1]) + 1;
}

/** An item is `paragraph block*` in the editor schema: one that would start with another block gets an empty paragraph. */
function listItem(blocks: KudoEditorNode[]): KudoEditorNode {
  return { type: "listItem", content: blocks[0]?.type === "paragraph" ? blocks : [emptyParagraph(), ...blocks] };
}

/**
 * One list: items numbered start, start+1, ...; each takes the INDENT-ed lines below it, and blank lines only when an
 * INDENT-ed line follows them (an empty paragraph inside the item; otherwise the blank lines belong after the list).
 */
function readList(lines: string[], from: number, depth: number): { block: KudoEditorNode; next: number } {
  const start = Number(LIST_MARKER.exec(lines[from])?.[1]);
  const items: KudoEditorNode[] = [];
  let i = from;
  for (let match = LIST_MARKER.exec(lines[i]); match && Number(match[1]) === start + items.length; ) {
    const itemLines = [lines[i].slice(match[0].length)];
    for (i++; i < lines.length; ) {
      if (lines[i].startsWith(INDENT)) {
        itemLines.push(lines[i++].slice(INDENT.length));
        continue;
      }
      let blankEnd = i;
      while (blankEnd < lines.length && lines[blankEnd] === "") blankEnd++;
      if (blankEnd === i || blankEnd === lines.length || !lines[blankEnd].startsWith(INDENT)) break;
      for (; i < blankEnd; i++) itemLines.push("");
    }
    items.push(listItem(parseBlocks(itemLines, depth + 1)));
    match = i < lines.length ? LIST_MARKER.exec(lines[i]) : null;
  }
  return { block: { type: "orderedList", attrs: { start }, content: items }, next: i };
}

function parseBlocks(lines: string[], depth: number): KudoEditorNode[] {
  const blocks: KudoEditorNode[] = [];
  const nested = depth < MAX_DEPTH; // past the cap, markers are text (no stack growth on `>>>>...`)
  for (let i = 0; i < lines.length; ) {
    if (nested && lines[i].startsWith(">")) {
      const from = i;
      const inner: string[] = [];
      for (; i < lines.length && lines[i].startsWith(">"); i++) inner.push(lines[i].replace(QUOTE_MARKER, ""));
      // The serializer writes no quote whose lines are all empty: bare `>` lines are text, as on the detail page.
      if (inner.some((line) => line !== "")) blocks.push({ type: "blockquote", content: parseBlocks(inner, depth + 1) });
      else blocks.push(...lines.slice(from, i).map(paragraph));
    } else if (nested && opensList(lines, i)) {
      const { block, next } = readList(lines, i, depth);
      blocks.push(block);
      i = next;
    } else {
      blocks.push(paragraph(lines[i++]));
    }
  }
  return blocks;
}

/** Never throws; empty or non-string content yields a document with one empty paragraph. */
export function kudoMarkdownToEditorJson(markdown: string): KudoEditorNode {
  // CRLF / lone CR: Kudos stored before the content schema normalised the browser's multipart line breaks.
  const lines = protectEscapes(typeof markdown === "string" ? markdown : "").split(/\r\n?|\n/);
  const content = parseBlocks(lines, 0);
  return { type: "doc", content: content.length ? content : [emptyParagraph()] };
}
