/**
 * Stored Kudo content (the Markdown-lite written by kudo-content-markdown.ts) -> a small block/inline tree that the
 * detail page renders as React elements (components/kudos/kudo-rich-content.tsx). Pure: no React, no DOM.
 *
 * Mirrors the serializer: every `\n` is a line (paragraphs and hard breaks are not told apart), `1. ` lines form an
 * ordered list whose item continues on lines indented by three spaces, `> ` lines form a quote; inlines are
 * `**b**`, `_i_`, `~~s~~`, `[t](url)` and `@[Name](uuid)`. Blank lines are dropped, as in kudo-plain-text.ts.
 * The serializer escapes a line-start `N.`/`>` typed as text (`N\.`, `\>`); content stored before that escape existed
 * may still hold them bare, so a marker that would leave nothing to show stays text instead.
 *
 * Runs on untrusted text, so nothing here can backtrack: delimiters are found with indexOf, link/mention patterns
 * exclude their own delimiters (labels hold no `[`/`]`, targets no `(`/`)`), nesting depth is capped.
 */
export type KudoInline =
  | { type: "text"; text: string }
  | { type: "strong" | "em" | "s"; children: KudoInline[] }
  | { type: "link"; href: string; children: KudoInline[] }
  | { type: "mention"; name: string };

export type KudoBlock =
  | { type: "paragraph"; children: KudoInline[] }
  | { type: "list"; start: number; items: KudoBlock[][] }
  | { type: "quote"; children: KudoBlock[] };

// Same escape scheme as kudo-plain-text.ts: escaped characters become private-use placeholders before parsing,
// so an escaped delimiter is never read as Markdown.
const ESCAPABLE = "\\`*_~[].>";
const PLACEHOLDER_BASE = 0xe000;
const PLACEHOLDER = /[-]/g;

const protectEscapes = (markdown: string) =>
  markdown.replace(/\\([\\`*_~[\].>])/g, (_, char: string) => String.fromCharCode(PLACEHOLDER_BASE + ESCAPABLE.indexOf(char)));

const unescapeChar = (placeholder: string) => ESCAPABLE[placeholder.charCodeAt(0) - PLACEHOLDER_BASE];
/** Text shown to the reader: the escaped character without its backslash. */
const restoreText = (text: string) => text.replace(PLACEHOLDER, unescapeChar);
/** A link target is not escaped by the serializer, so any `\x` in it was there in the URL: put it back as written. */
const restoreRaw = (text: string) => text.replace(PLACEHOLDER, (placeholder) => `\\${unescapeChar(placeholder)}`);

const INDENT = "   ";
const MAX_DEPTH = 8;
const LIST_MARKER = /^(\d{1,9})\.(?: |$)/;
const QUOTE_MARKER = /^> ?/;
// A mention's target is a user id: the same 8-4-4-4-12 hex rule as `pgUuid` (z.guid()) in lib/validation/write-kudo.ts,
// inlined so this module stays dependency-free. Any other target leaves `@` as text and `[` opens a normal link.
const MENTION = /@\[([^[\]]*)\]\(([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)/y;
const LINK = /\[([^[\]]*)\]\(([^()]*)\)/y;
const MARKS = [
  ["**", "strong"],
  ["~~", "s"],
  ["_", "em"],
] as const;

/**
 * Only absolute http(s) URLs become links (same rule as the serializer's safeHref), normalised by `URL`.
 * canParse first: a throwing `new URL` per invalid target cost ~25x a valid one on every view.
 */
function safeHref(raw: string): string | null {
  if (!URL.canParse(raw)) return null;
  const url = new URL(raw);
  return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
}

type Token = { nodes: KudoInline[]; end: number };

/** The inline token starting at `i`, or null when the character there is plain text. */
function readToken(text: string, i: number): Token | null {
  const char = text[i];
  if (char === "@" || char === "[") {
    const pattern = char === "@" ? MENTION : LINK;
    pattern.lastIndex = i;
    const match = pattern.exec(text);
    if (!match) return null;
    const end = pattern.lastIndex;
    if (char === "@") return { nodes: [{ type: "mention", name: restoreText(match[1]) }], end };
    const children = parseInline(match[1]);
    const href = safeHref(restoreRaw(match[2]));
    // Not http(s): the reader still sees the label, never the raw token or the target.
    return { nodes: href ? [{ type: "link", href, children }] : children, end };
  }
  for (const [mark, type] of MARKS) {
    if (!text.startsWith(mark, i)) continue;
    // The first closer wins, so a span never holds its own delimiter: same-mark nesting is impossible and a
    // missing closer is found once (no closer after `i` means none for any later opener either).
    const close = text.indexOf(mark, i + mark.length);
    if (close <= i + mark.length) return null;
    return { nodes: [{ type, children: parseInline(text.slice(i + mark.length, close)) }], end: close + mark.length };
  }
  return null;
}

function parseInline(text: string): KudoInline[] {
  const out: KudoInline[] = [];
  let plainFrom = 0;
  const pushPlain = (to: number) => {
    if (to > plainFrom) out.push({ type: "text", text: restoreText(text.slice(plainFrom, to)) });
  };
  for (let i = 0; i < text.length; ) {
    const token = readToken(text, i);
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

const paragraph = (line: string): KudoBlock => ({ type: "paragraph", children: parseInline(line.trim()) });

/**
 * Whether `lines[at]` opens a list. A marker with text does. A marker-only line (`2025.`) is an empty first item,
 * which the serializer writes as `N. `, only when something continues it: an INDENT-ed line (the item's content) or
 * the next line numbered N+1. Anything else leaves the number as text instead of an empty item.
 */
function opensList(lines: string[], at: number): boolean {
  const match = LIST_MARKER.exec(lines[at]);
  if (!match) return false;
  if (lines[at].slice(match[0].length).trim() !== "") return true;
  const next = lines[at + 1];
  if (next === undefined) return false;
  if (next.startsWith(INDENT)) return true;
  const following = LIST_MARKER.exec(next);
  return following !== null && Number(following[1]) === Number(match[1]) + 1;
}

/**
 * One list: consecutive items numbered start, start+1, ...; each item takes the INDENT-ed lines below it.
 * A marker-only line that continues the numbering (`1. a`, `2. b`, `3.`) is an empty item: the serializer writes an
 * empty editor item that way, and the reader still sees the number as the item marker, so no text is lost.
 */
function readList(lines: string[], from: number, depth: number): { block: KudoBlock; next: number } {
  const start = Number(LIST_MARKER.exec(lines[from])?.[1]);
  const items: KudoBlock[][] = [];
  let i = from;
  for (let match = LIST_MARKER.exec(lines[i]); match && Number(match[1]) === start + items.length; ) {
    const itemLines = [lines[i].slice(match[0].length)];
    for (i++; i < lines.length && lines[i].startsWith(INDENT); i++) itemLines.push(lines[i].slice(INDENT.length));
    items.push(parseBlocks(itemLines, depth + 1));
    match = i < lines.length ? LIST_MARKER.exec(lines[i]) : null;
  }
  return { block: { type: "list", start, items }, next: i };
}

function parseBlocks(lines: string[], depth: number): KudoBlock[] {
  const blocks: KudoBlock[] = [];
  const nested = depth < MAX_DEPTH; // past the cap, markers are plain text (no stack growth on `>>>>...`)
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
    } else if (nested && line.startsWith(">")) {
      const from = i;
      const inner: string[] = [];
      for (; i < lines.length && lines[i].startsWith(">"); i++) {
        // A bare `>` is an empty line of the quote: dropped like a blank line anywhere else, so it never splits a list.
        const content = lines[i].replace(QUOTE_MARKER, "");
        if (content.trim()) inner.push(content);
      }
      const children = parseBlocks(inner, depth + 1);
      // A quote of bare `>` lines has nothing to show: keep the markers as text rather than an empty box.
      if (children.length) blocks.push({ type: "quote", children });
      else blocks.push(...lines.slice(from, i).map(paragraph));
    } else if (nested && opensList(lines, i)) {
      const { block, next } = readList(lines, i, depth);
      blocks.push(block);
      i = next;
    } else {
      blocks.push(paragraph(line));
      i++;
    }
  }
  return blocks;
}

/** Never throws; empty or blank content yields no blocks. */
export function parseKudoContent(markdown: string): KudoBlock[] {
  const lines = protectEscapes(markdown)
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  return parseBlocks(lines, 0);
}
