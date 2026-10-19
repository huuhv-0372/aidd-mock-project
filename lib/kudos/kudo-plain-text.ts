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

function stripLine(line: string): string {
  return line
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/, "")
    .replace(/@\[([^\]]*)\]\([^)]*\)/g, "@$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/\*(\S(?:.*?\S)?)\*/g, "$1")
    .replace(/(^|\W)_(\S(?:.*?\S)?)_(?=\W|$)/g, "$1$2")
    .replace(/`([^`]*)`/g, "$1")
    .trim();
}
