import { describe, expect, it } from "vitest";
import { parseKudoContent, type KudoBlock, type KudoInline } from "@/lib/kudos/kudo-content-blocks";
import { kudoEditorJsonToMarkdown, type KudoEditorMark, type KudoEditorNode } from "@/lib/kudos/kudo-content-markdown";

/*
 * Serializer -> parser must give back the structure the editor held. Each case builds the expected reader tree and
 * derives the editor doc from it (marks flattened onto text nodes, as Tiptap stores them), so the two cannot drift.
 */
const ID = "2a000000-0000-0000-0000-000000000101";
const HREF = "https://e.com/a_b";
const t = (text: string): KudoInline => ({ type: "text", text });
const strong = (...children: KudoInline[]): KudoInline => ({ type: "strong", children });
const em = (...children: KudoInline[]): KudoInline => ({ type: "em", children });
const s = (...children: KudoInline[]): KudoInline => ({ type: "s", children });
const a = (...children: KudoInline[]): KudoInline => ({ type: "link", href: HREF, children });
const at = (name: string): KudoInline => ({ type: "mention", name });
const p = (...children: KudoInline[]): KudoBlock => ({ type: "paragraph", children });
const ol = (start: number, ...items: KudoBlock[][]): KudoBlock => ({ type: "list", start, items });
const q = (...children: KudoBlock[]): KudoBlock => ({ type: "quote", children });

const MARK_OF = { strong: { type: "bold" }, em: { type: "italic" }, s: { type: "strike" }, link: { type: "link", attrs: { href: HREF } } };

/** Reader inlines -> editor text/mention nodes carrying their marks. */
function toEditorInline(nodes: KudoInline[], marks: KudoEditorMark[] = []): KudoEditorNode[] {
  return nodes.flatMap((node): KudoEditorNode[] => {
    const own = marks.length ? { marks } : {};
    if (node.type === "text") return [{ type: "text", text: node.text, ...own }];
    if (node.type === "mention") return [{ type: "mention", attrs: { id: ID, label: node.name }, ...own }];
    return toEditorInline(node.children, [...marks, MARK_OF[node.type]]);
  });
}

/** A paragraph's lines (one reader paragraph each) joined by hard breaks. */
const editorParagraph = (...lines: KudoInline[][]): KudoEditorNode => ({
  type: "paragraph",
  content: lines.flatMap((line, i) => [...(i ? [{ type: "hardBreak" }] : []), ...toEditorInline(line)]),
});

function toEditorBlocks(blocks: KudoBlock[]): KudoEditorNode[] {
  return blocks.map((block): KudoEditorNode => {
    if (block.type === "paragraph") return editorParagraph(block.children);
    if (block.type === "quote") return { type: "blockquote", content: toEditorBlocks(block.children) };
    const content = block.items.map((item) => ({ type: "listItem", content: toEditorBlocks(item) }));
    return { type: "orderedList", attrs: { start: block.start }, content };
  });
}

const roundTrip = (editor: KudoEditorNode[]) => parseKudoContent(kudoEditorJsonToMarkdown({ type: "doc", content: editor }));

describe("serializer -> parser round trip", () => {
  it.each<[string, KudoBlock[]]>([
    ["paragraph", [p(t("Cảm ơn bạn (rất nhiều)!"))]],
    ["nested marks", [p(t("x "), strong(t("b "), em(t("i "), s(t("s")))), t(" y"))]],
    ["link holding marks", [p(t("xem "), a(strong(t("tài liệu")), t(" nội bộ")))]],
    ["mention, and `@` typed before a link (B3)", [p(t("Cảm ơn "), at("Lê [Sun*]"), t(" @"), a(t("Sun")))]],
    ["ordered list with start", [ol(3, [p(t("ba"))], [p(t("bốn"))])]],
    ["nested list", [ol(1, [p(t("a")), ol(1, [p(t("inner"))], [p(t("inner 2"))])], [p(t("b"))])]],
    ["quote holding a list", [q(p(t("q")), ol(1, [p(t("in quote"))]))]],
    ["text starting with markers (B2)", [p(t("1. không phải list")), p(t("2025.")), p(t("> không phải quote")), p(t("\\ và *"))]],
    ["markers as list-item and quote text", [ol(1, [p(t("2. a")), p(t(">b"))]), q(p(t("3. c")))]],
    ["boundary numbers stay text", [p(t("1.5 apples")), p(t("2024.01.02 x")), p(t("1234567890. x"))]],
    ["empty first list item", [ol(1, [], [p(t("b"))])]],
    ["empty items in a nested list", [ol(1, [p(t("a")), ol(1, [], [p(t("b"))], [])], [])]],
  ])("keeps %s", (_name, expected) => {
    expect(roundTrip(toEditorBlocks(expected))).toEqual(expected);
  });

  it("splits a hard break inside a mark and inside a list item into lines, marks closed on each", () => {
    const bold = { type: "bold" };
    const editor: KudoEditorNode[] = [
      { type: "paragraph", content: [{ type: "text", text: "a", marks: [bold] }, { type: "hardBreak", marks: [bold] }, { type: "text", text: "1. b", marks: [bold] }] },
      { type: "orderedList", content: [{ type: "listItem", content: [editorParagraph([t("x")], [t("2. y")])] }] },
    ];
    expect(roundTrip(editor)).toEqual([p(strong(t("a"))), p(strong(t("1. b"))), ol(1, [p(t("x")), p(t("2. y"))])]);
  });
});

/** mulberry32: a seeded PRNG, so a failing fuzz case reproduces. */
function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), seed | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Tokens that touch every escape and line-start rule; none has edge whitespace (delimiters hug their text).
const WORDS = ["a", "Cảm ơn", "1. x", "2025.", "3.", "> q", ">", "\\", "*", "_", "~", "[", "]", "`", "@", "1.5", "x.", "(y)"];
const MARK_KINDS = ["link", "strong", "em", "s"] as const;

function fuzzDoc(random: () => number): KudoBlock[] {
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
  // Marks nest only in the serializer's order (link > bold > italic > strike); mentions never sit inside a link.
  const inlines = (from: number, inLink: boolean): KudoInline[] =>
    Array.from({ length: 1 + Math.floor(random() * 3) }, () => {
      const roll = random();
      if (roll < 0.1 && !inLink) return at(pick(WORDS));
      if (roll < 0.45 && from < MARK_KINDS.length) {
        const level = from + Math.floor(random() * (MARK_KINDS.length - from));
        const kind = MARK_KINDS[level];
        const children = inlines(level + 1, inLink || kind === "link");
        return kind === "link" ? a(...children) : { type: kind, children };
      }
      return t(pick(WORDS));
    });
  // A list's items. An item can be empty (an empty editor item), but a lone empty item is a bare `N.` the reader cannot
  // tell from text, so it only appears next to another item.
  const items = (depth: number): KudoBlock[][] => {
    const count = 1 + Math.floor(random() * 2);
    return Array.from({ length: count }, () => {
      const item = random() < 0.25 ? [] : blocks(depth + 1);
      return count === 1 && !normalizeBlocks(item).length ? [p(t(pick(WORDS)))] : item;
    });
  };
  const blocks = (depth: number): KudoBlock[] => {
    const out: KudoBlock[] = [];
    for (let n = 1 + Math.floor(random() * 3); n > 0; n--) {
      const roll = random();
      // What the reader sees so far: empty paragraphs and empty quotes leave no trace.
      // Two lists or two quotes in a row are one run in Markdown: keep a paragraph between them.
      const prev = normalizeBlocks(out).at(-1)?.type;
      if (depth < 3 && roll < 0.2 && prev !== "list") out.push(ol(pick([1, 3, 2025]), ...items(depth)));
      else if (depth < 3 && roll < 0.35 && prev !== "quote") out.push(q(...blocks(depth + 1)));
      else if (roll < 0.45) out.push(p()); // an empty paragraph
      else if (roll < 0.5 && prev !== "quote") out.push(q(...Array.from({ length: Math.floor(random() * 3) }, () => p()))); // a quote holding only empty paragraphs
      else out.push(p(...inlines(0, false)));
    }
    return out;
  };
  return blocks(0);
}

/** The reader's view of a tree: neighbouring texts are one run, neighbouring same marks are one span. */
function normalize(nodes: KudoInline[]): KudoInline[] {
  const out: KudoInline[] = [];
  for (const node of nodes) {
    const last = out.at(-1);
    if (node.type === "text" && last?.type === "text") last.text += node.text;
    else if (node.type !== "text" && node.type !== "mention" && last?.type === node.type) last.children.push(...node.children);
    else out.push(node.type === "text" || node.type === "mention" ? { ...node } : { ...node, children: [...node.children] });
  }
  return out.map((node) => (node.type === "text" || node.type === "mention" ? node : { ...node, children: normalize(node.children) }));
}

/** Also what the reader drops: empty paragraphs, and quotes left with nothing (the serializer writes none for them). */
function normalizeBlocks(blocks: KudoBlock[]): KudoBlock[] {
  return blocks.flatMap((block): KudoBlock[] => {
    if (block.type === "paragraph") return block.children.length ? [p(...normalize(block.children))] : [];
    if (block.type === "quote") {
      const children = normalizeBlocks(block.children);
      return children.length ? [q(...children)] : [];
    }
    return [ol(block.start, ...block.items.map(normalizeBlocks))];
  });
}

describe("serializer -> parser fuzz (seeded)", () => {
  it("round-trips 300 random editor docs", () => {
    const random = prng(20261022);
    for (let run = 0; run < 300; run++) {
      const expected = fuzzDoc(random);
      const markdown = kudoEditorJsonToMarkdown({ type: "doc", content: toEditorBlocks(expected) });
      expect(parseKudoContent(markdown), `run ${run}: ${JSON.stringify(markdown)}`).toEqual(normalizeBlocks(expected));
    }
  });
});
