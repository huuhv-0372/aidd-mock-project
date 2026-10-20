/**
 * Editor JSON -> the Markdown subset stored in `kudos.content`:
 * `**b**`, `_i_`, `~~s~~`, `1. `, `> `, `[t](https://...)`, `@[Name](uuid)`. Paragraphs and hard breaks become `\n`.
 * The JSON shape is declared here (Tiptap/ProseMirror doc) so this file imports no editor package and
 * stays out of every bundle that does not already need it.
 */
export type KudoEditorMark = { type: string; attrs?: Record<string, unknown> };
export type KudoEditorNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: KudoEditorNode[];
  text?: string;
  marks?: KudoEditorMark[];
};

const INDENT = "   ";
// Mark nesting order, outermost first. Runs of the same mark are merged so `**a****_b_**` never appears.
const MARK_ORDER = ["link", "bold", "italic", "strike"] as const;

const escapeText = (text: string) => text.replace(/[\\`*_~[\]]/g, "\\$&");

/** Only http(s) survive; `(` and `)` are percent-encoded so they cannot end the link early (URL already encodes spaces). */
function safeHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href.replace(/\(/g, "%28").replace(/\)/g, "%29");
  } catch {
    return null;
  }
}

/**
 * Delimiters must hug the text: `** a **` is not bold, so surrounding whitespace moves outside.
 * Sliced by trimStart/trimEnd offsets, not a /^(\s*)(.*?)(\s*)$/ regex: that is quadratic on a long whitespace run
 * inside the span, and this runs on every editor update.
 */
function wrap(inner: string, open: string, close: string): string {
  const start = inner.length - inner.trimStart().length;
  const end = inner.trimEnd().length;
  const core = inner.slice(start, end);
  return core ? `${inner.slice(0, start)}${open}${core}${close}${inner.slice(end)}` : inner;
}

/** A mark kept across a hard break (Shift+Enter in bold) closes before `\n` and reopens after: spans never cross lines. */
const perLine = (inner: string, mark: (line: string) => string) => inner.split("\n").map(mark).join("\n");

const hasMark = (node: KudoEditorNode, type: string) => node.marks?.find((m) => m.type === type);

function leaf(node: KudoEditorNode): string {
  if (node.type === "text") return escapeText(node.text ?? "");
  if (node.type === "hardBreak") return "\n";
  if (node.type === "mention") {
    const id = node.attrs?.id;
    const label = node.attrs?.label ?? node.attrs?.name;
    if (typeof id !== "string" || id === "") return "";
    return `@[${escapeText(typeof label === "string" ? label : "")}](${id})`;
  }
  return "";
}

function renderInline(nodes: KudoEditorNode[], level = 0): string {
  const type = MARK_ORDER[level];
  if (!type) return nodes.map(leaf).join("");
  let out = "";
  for (let i = 0; i < nodes.length; ) {
    const first = hasMark(nodes[i], type);
    let j = i + 1;
    if (first) {
      // Consecutive nodes carrying the same mark (same href for links) form one run.
      while (j < nodes.length) {
        const next = hasMark(nodes[j], type);
        if (!next || (type === "link" && next.attrs?.href !== first.attrs?.href)) break;
        j++;
      }
    } else {
      while (j < nodes.length && !hasMark(nodes[j], type)) j++;
    }
    const inner = renderInline(nodes.slice(i, j), level + 1);
    i = j;
    if (!first) out += inner;
    else if (type === "link") {
      const href = safeHref(first.attrs?.href);
      out += href ? perLine(inner, (line) => (line.trim() ? `[${line}](${href})` : line)) : inner;
    } else {
      const delimiter = { bold: "**", italic: "_", strike: "~~" }[type];
      out += perLine(inner, (line) => wrap(line, delimiter, delimiter));
    }
  }
  return out;
}

function renderBlocks(nodes: KudoEditorNode[] | undefined): string[] {
  return (nodes ?? []).flatMap(renderBlock);
}

function renderBlock(node: KudoEditorNode): string[] {
  switch (node.type) {
    case "orderedList": {
      const start = typeof node.attrs?.start === "number" ? node.attrs.start : 1;
      return (node.content ?? []).flatMap((item, index) => {
        const [first = "", ...rest] = renderBlocks(item.content);
        return [`${start + index}. ${first}`, ...rest.map((line) => (line ? INDENT + line : line))];
      });
    }
    case "blockquote":
      return renderBlocks(node.content).map((line) => (line ? `> ${line}` : ">"));
    case "paragraph":
    case "heading":
      return renderInline(node.content ?? []).split("\n");
    default:
      // Nodes this editor never produces (lists, code, rules...) degrade to their text instead of failing the send.
      return node.content ? renderBlocks(node.content) : [];
  }
}

/** Never throws on malformed JSON: unknown shapes yield an empty string, which the server rejects as empty content. */
export function kudoEditorJsonToMarkdown(doc: KudoEditorNode): string {
  const lines = renderBlocks(doc?.content);
  // trimEnd, not /\s+$/: that regex is quadratic on a long whitespace run mid-text, and this runs on every keystroke.
  return lines.join("\n").replace(/^\n+/, "").trimEnd();
}
