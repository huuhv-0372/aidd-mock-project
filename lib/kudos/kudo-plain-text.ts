/**
 * Kudo content is Markdown-lite (B/I/S, lists, links, quotes, mentions `@[Name](uuid)`); cards show it
 * as plain text. Blank lines are dropped so `line-clamp` counts real lines.
 */
export function kudoPlainText(markdown: string): string {
  return markdown
    .split(/\r?\n/)
    .map(stripLine)
    .filter((line) => line.length > 0)
    .join("\n");
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
