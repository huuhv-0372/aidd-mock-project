/**
 * Stored Kudo content (the Markdown-lite written by kudo-content-markdown.ts) -> a small block/inline tree that the
 * detail page renders as React elements (components/kudos/kudo-rich-content.tsx). Pure: no React, no DOM.
 *
 * Mirrors the serializer: every `\n` is a line (paragraphs and hard breaks are not told apart), `1. ` lines form an
 * ordered list whose item continues on lines indented by three spaces, `> ` lines form a quote; inlines are
 * `**b**`, `_i_`, `~~s~~`, `[t](url)` and `@[Name](uuid)`. Blank lines are dropped, as in kudo-plain-text.ts.
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
const ESCAPABLE = "\\`*_~[]";
const PLACEHOLDER_BASE = 0xe000;
const PLACEHOLDER = /[-]/g;

const protectEscapes = (markdown: string) =>
  markdown.replace(/\\([\\`*_~[\]])/g, (_, char: string) => String.fromCharCode(PLACEHOLDER_BASE + ESCAPABLE.indexOf(char)));

const unescapeChar = (placeholder: string) => ESCAPABLE[placeholder.charCodeAt(0) - PLACEHOLDER_BASE];
/** Text shown to the reader: the escaped character without its backslash. */
const restoreText = (text: string) => text.replace(PLACEHOLDER, unescapeChar);
/** A link target is not escaped by the serializer, so any `\x` in it was there in the URL: put it back as written. */
const restoreRaw = (text: string) => text.replace(PLACEHOLDER, (placeholder) => `\\${unescapeChar(placeholder)}`);

const INDENT = "   ";
const MAX_DEPTH = 8;
const LIST_MARKER = /^(\d{1,9})\.(?: |$)/;
const QUOTE_MARKER = /^> ?/;
const MENTION = /@\[([^[\]]*)\]\(([^()]*)\)/y;
const LINK = /\[([^[\]]*)\]\(([^()]*)\)/y;
const MARKS = [
  ["**", "strong"],
  ["~~", "s"],
  ["_", "em"],
] as const;

/** Only absolute http(s) URLs become links (same rule as the serializer's safeHref), normalised by `URL`. */
function safeHref(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
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

/** One list: consecutive items numbered start, start+1, ...; each item takes the INDENT-ed lines below it. */
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
      const inner: string[] = [];
      for (; i < lines.length && lines[i].startsWith(">"); i++) inner.push(lines[i].replace(QUOTE_MARKER, ""));
      blocks.push({ type: "quote", children: parseBlocks(inner, depth + 1) });
    } else if (nested && LIST_MARKER.test(line)) {
      const { block, next } = readList(lines, i, depth);
      blocks.push(block);
      i = next;
    } else {
      blocks.push({ type: "paragraph", children: parseInline(line.trim()) });
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
