/**
 * Kudo content is Markdown-lite (B/I/S, lists, links, quotes, mentions `@[Name](uuid)`); cards show it
 * as plain text. Blank lines are dropped so `line-clamp` counts real lines.
 *
 * The serializer (kudo-content-markdown.ts) backslash-escapes backslash, backtick, `*`, `_`, `~`, `[` and `]`.
 * Those escapes are swapped for private-use placeholders first, so an escaped delimiter is never read as
 * Markdown, then restored without the backslash.
 */
const ESCAPABLE = "\\`*_~[]";
const PLACEHOLDER_BASE = 0xe000;

const protectEscapes = (markdown: string) =>
  markdown.replace(/\\([\\`*_~[\]])/g, (_, char: string) => String.fromCharCode(PLACEHOLDER_BASE + ESCAPABLE.indexOf(char)));

const restoreEscapes = (text: string) =>
  text.replace(/[-]/g, (placeholder) => ESCAPABLE[placeholder.charCodeAt(0) - PLACEHOLDER_BASE]);

export function kudoPlainText(markdown: string): string {
  return restoreEscapes(
    protectEscapes(markdown)
      .split(/\r?\n/)
      .map(stripLine)
      .filter((line) => line.length > 0)
      .join("\n"),
  );
}

/**
 * Runs on untrusted text (validator, every card), so each pattern is linear: no inner part can match its own
 * delimiter, so a match attempt stops at the next delimiter instead of rescanning the line from every opener.
 * Labels hold no `[`/`]` and targets no `(`/`)` (the serializer escapes brackets and percent-encodes parentheses).
 */
function stripLine(line: string): string {
  return line
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/, "")
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
