/**
 * Kudo content is Markdown-lite (B/I/S, lists, links, quotes, mentions `@[Name](uuid)`); cards show it
 * as plain text. Blank lines are dropped so `line-clamp` counts real lines.
 *
 * The serializer (kudo-content-markdown.ts) backslash-escapes backslash, backtick, `*`, `_`, `~`, `[` and `]`, plus a
 * line-start `N.` or `>` typed as text. Those escapes are swapped for private-use placeholders first, so an escaped
 * delimiter is never read as Markdown, then restored without the backslash.
 */
const ESCAPABLE = "\\`*_~[].>";
const PLACEHOLDER_BASE = 0xe000;

const protectEscapes = (markdown: string) =>
  markdown.replace(/\\([\\`*_~[\].>])/g, (_, char: string) => String.fromCharCode(PLACEHOLDER_BASE + ESCAPABLE.indexOf(char)));

const restoreEscapes = (text: string) =>
  text.replace(/[-]/g, (placeholder) => ESCAPABLE[placeholder.charCodeAt(0) - PLACEHOLDER_BASE]);

export function kudoPlainText(markdown: string): string {
  const rows = protectEscapes(markdown)
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(readMarkers);
  const lines: string[] = [];
  for (let from = 0; from < rows.length; ) {
    if (!rows[from].quoted) {
      lines.push(stripInline(rows[from++].body));
      continue;
    }
    let to = from;
    while (to < rows.length && rows[to].quoted) to++;
    // As on the detail page, a run of quote lines with no text at all keeps its marker as text; a bare `>` among
    // quoted text is just an empty line of that quote.
    const noText = rows.slice(from, to).every((row) => row.body.trim() === "");
    for (; from < to; from++) lines.push(noText ? ">" : stripInline(rows[from].body));
  }
  return restoreEscapes(lines.filter((line) => line.length > 0).join("\n"));
}

/**
 * One line-start marker the detail page reads as structure (kudo-content-blocks.ts), after any list-item INDENT:
 * a quote `>`, or a `N. ` list marker (its LIST_MARKER) with text after it. A bare `2025.` is text there, so it stays
 * text here. Sticky and applied in a loop, so nested markers (`> 1. > x`) cost one pass over the prefix.
 */
const LINE_MARKER = /(?: {3})*(?:> ?|\d{1,9}\. (?=\s*\S))/y;

type Row = { body: string; quoted: boolean };

/** The line without its markers, and whether one of them is a quote `>`. */
function readMarkers(line: string): Row {
  let markersEnd = 0;
  let quoted = false;
  LINE_MARKER.lastIndex = 0;
  for (let match = LINE_MARKER.exec(line); match; match = LINE_MARKER.exec(line)) {
    markersEnd = LINE_MARKER.lastIndex;
    quoted ||= match[0].includes(">");
  }
  return { body: line.slice(markersEnd), quoted };
}

/**
 * Runs on untrusted text (validator, every card), so each pattern is linear: no inner part can match its own
 * delimiter, so a match attempt stops at the next delimiter instead of rescanning the line from every opener.
 * Labels hold no `[`/`]` and targets no `(`/`)` (the serializer escapes brackets and percent-encodes parentheses).
 */
function stripInline(body: string): string {
  return body
    .replace(/@\[([^[\]]*)\]\([^()]*\)/g, "@$1")
    .replace(/!\[([^[\]]*)\]\([^()]*\)/g, "$1")
    .replace(/\[([^[\]]*)\]\([^()]*\)/g, "$1")
    .replace(/(\*\*|__)((?:(?!\1).)+)\1/g, "$2")
    .replace(/~~((?:(?!~~).)+)~~/g, "$1")
    .replace(/\*([^*\s](?:[^*]*[^*\s])?)\*/g, "$1")
    .replace(/(^|\W)_([^_\s](?:[^_]*[^_\s])?)_(?=\W|$)/g, "$1$2")
    .replace(/`([^`]*)`/g, "$1")
    .trim();
}
