import { getSchema } from "@tiptap/core";
import { Mention } from "@tiptap/extension-mention";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { kudoMarkdownToEditorJson } from "@/lib/kudos/kudo-content-editor-json";
import { kudoEditorJsonToMarkdown, type KudoEditorMark, type KudoEditorNode } from "@/lib/kudos/kudo-content-markdown";

/*
 * Markdown -> editor JSON must be the exact inverse of the serializer for everything it writes: opening a Kudo in the
 * edit modal and saving it unchanged sends the stored Markdown back byte for byte. Every result must also be a document
 * the real editor accepts (same extensions as components/kudos-compose/kudo-rich-editor.tsx).
 */
const schema = getSchema([
  StarterKit.configure({ heading: false, bulletList: false, code: false, codeBlock: false, horizontalRule: false, underline: false, trailingNode: false }),
  Mention,
]);

const ID = "2a000000-0000-0000-0000-000000000101";
const bold = { type: "bold" };
const italic = { type: "italic" };
const strike = { type: "strike" };
const link = (href: string): KudoEditorMark => ({ type: "link", attrs: { href } });
const text = (value: string, ...marks: KudoEditorMark[]): KudoEditorNode => ({ type: "text", text: value, ...(marks.length ? { marks } : {}) });
const mention = (label: string, ...marks: KudoEditorMark[]): KudoEditorNode => ({ type: "mention", attrs: { id: ID, label }, ...(marks.length ? { marks } : {}) });
const p = (...content: KudoEditorNode[]): KudoEditorNode => ({ type: "paragraph", content });
const br = (...marks: KudoEditorMark[]): KudoEditorNode => ({ type: "hardBreak", ...(marks.length ? { marks } : {}) });
const item = (...content: KudoEditorNode[]): KudoEditorNode => ({ type: "listItem", content: content.length ? content : [p()] });
const ol = (start: number, ...items: KudoEditorNode[]): KudoEditorNode => ({ type: "orderedList", attrs: { start }, content: items });
const quote = (...content: KudoEditorNode[]): KudoEditorNode => ({ type: "blockquote", content });
const toMd = (...content: KudoEditorNode[]) => kudoEditorJsonToMarkdown({ type: "doc", content });

/** Parses, checks the result against the editor schema, and returns the Markdown it serialises back to. */
function back(markdown: string): string {
  const doc = kudoMarkdownToEditorJson(markdown);
  schema.nodeFromJSON(doc).check();
  return kudoEditorJsonToMarkdown(doc);
}

// The editor docs of kudo-content-markdown.test.ts and kudo-content-round-trip.test.ts, plus mixed samples.
const SERIALIZER_CASES: [string, KudoEditorNode[]][] = [
  ["bold / italic / strike", [p(text("a", bold), text(" "), text("b", italic), text(" "), text("c", strike))]],
  ["nested and merged marks", [p(text("a", bold), text("b", bold, italic)), p(text("a", bold, italic, strike)), p(text("x ", bold), text("y"))]],
  ["whitespace outside delimiters", [p(text("a"), text("  hi  ", bold), text("b")), p(text("a"), text(" ", bold), text("b"))]],
  ["links", [p(text("site", link("https://example.com/a?b=1"))), p(text("site", link("http://example.com/x")))]],
  ["link with parentheses", [p(text("w", link("https://a.com/x_(y)")))]],
  ["styled link text", [p(text("go", link("https://a.com"), bold)), p(text("xem "), text("tài liệu", link("https://e.com/a_b"), bold), text(" nội bộ", link("https://e.com/a_b")))]],
  ["mention beside bold", [p(text("Cảm ơn", bold), text(" "), mention("Nguyễn Văn An"))]],
  ["mention with escaped label, `@` before a link", [p(text("Cảm ơn "), mention("Lê [Sun*] _x_"), text(" @"), text("Sun", link("https://e.com/")))]],
  ["bold mention", [p(text("a ", bold), mention("B", bold), text(" c"))]],
  ["linked mention (URL pasted over it)", [p(text("hi ", link("https://x.com/")), mention("An", link("https://x.com/"), bold)), p(mention("[B]", link("https://y.com/")))]],
  ["paragraphs and hard breaks", [p(text("a"), br(), text("b")), p(text("c"))]],
  ["marks across hard breaks", [p(text("a", bold), br(bold), text("b", bold)), p(text("a", link("https://a.com")), br(link("https://a.com")), text("b", link("https://a.com")))]],
  ["nested marks across a hard break", [p(text("a", bold, italic), br(bold), text("b ", bold), text("c"))]],
  ["inner blank paragraphs", [p(), p(text("a")), p(), p(), p(text("b")), p()]],
  ["ordered lists", [ol(1, item(p(text("one"))), item(p(text("two")), p(text("more")))), p(text("after")), ol(3, item(p(text("x"))))]],
  ["blank line inside an item", [ol(1, item(p(text("a")), p(), p(text("b")))), p(text("c"))]],
  ["nested list", [ol(1, item(p(text("a")), ol(1, item(p(text("inner"))), item(p(text("inner 2"))))), item(p(text("b"))))]],
  ["blockquote with blank lines and marks", [quote(p(text("a", bold)), p(), p(text("b")))]],
  ["empty quotes are dropped", [p(text("a")), quote(p(), p(text("b")))]],
  ["quote holding a list", [quote(p(text("q")), ol(1, item(p(text("in quote")))))]],
  ["list holding a quote", [ol(1, item(p(text("a")), quote(p(text("q")))))]],
  ["escaped Markdown characters", [p(text("2*3 _x_ ~y~ [z] `c` \\ \\. \\>"))]],
  ["line-start markers typed as text", [p(text("2025.")), p(text("1. foo")), p(text("> x")), p(text("a 1. b > c")), p(text("1.5 apples")), p(text("1234567890. x")), p(text("1. b", bold))]],
  ["markers as item / quote / hard-break text", [ol(1, item(p(text("1. x")), p(text(">y")))), quote(p(text("3. z"))), p(text("a"), br(), text("2. b"))]],
  ["empty first item", [ol(1, item(), item(p(text("b"))))]],
  ["empty items in a nested list, last item empty", [ol(1, item(p(text("a")), ol(1, item(), item(p(text("b"))), item())), item())]],
  ["leading spaces kept", [p(text(" a  b")), p(text("   indented after nothing"))]],
  ["paragraph indented like an item continuation", [ol(1, item(p(text("a")))), p(text("   x"))]],
  ["accents and punctuation", [p(text("Cảm ơn bạn đã hỗ trợ team! (rất nhiều)."))]],
  [
    "mixed sample",
    [
      p(text("Cảm ơn "), text("bạn", bold), text(" rất nhiều vì đã "), text("luôn", italic), text(" hỗ trợ.")),
      p(text("Cảm ơn "), mention("Nguyễn Thị Minh Anh"), text(" — xem "), text("tài liệu", link("https://example.com/guide")), text(" nhé.")),
      ol(2, item(p(text("Một ", strike), text("hai", strike, italic))), item(p(text("ba")), quote(p(text("trích"), br(), text("dẫn", bold))))),
      quote(p(text("> không phải quote")), ol(1, item(p(text("x"))))),
    ],
  ],
];

describe("kudoMarkdownToEditorJson", () => {
  it.each(SERIALIZER_CASES)("round-trips %s byte for byte", (_name, content) => {
    const markdown = toMd(...content);
    expect(markdown.length).toBeGreaterThan(0);
    expect(back(markdown)).toBe(markdown);
  });

  it.each([
    "Cảm ơn **bạn** rất nhiều vì đã _luôn_ hỗ trợ cả team trong quý này.\nCảm ơn @[Nguyễn Thị Minh Anh](2a000000-0000-0000-0000-000000000002) đã đồng hành cùng mình. Xem thêm [tài liệu nội bộ](https://example.com/guide) nhé.",
    "1. a\n2.",
    "x\n1.",
    "> 1.",
    "1. a\n   1.",
    "1. \n2. b",
    "a\n\nb",
    "> **a**\n>\n> b",
  ])("round-trips stored sample %j", (markdown) => {
    expect(back(markdown)).toBe(markdown);
  });

  it("builds the editor nodes: mention id and label, link href, flattened marks, a paragraph per line", () => {
    const doc = kudoMarkdownToEditorJson(`**Cảm ơn** @[A\\]B](${ID})\n[**go** x](https://a.com/)\n\n_i ~~s~~_`);
    expect(doc).toEqual({
      type: "doc",
      content: [
        p(text("Cảm ơn", bold), text(" "), mention("A]B")),
        p(text("go", link("https://a.com/"), bold), text(" x", link("https://a.com/"))),
        p(),
        p(text("i ", italic), text("s", italic, strike)),
      ],
    });
  });

  it("builds lists with their start and quotes with their blocks", () => {
    expect(kudoMarkdownToEditorJson("3. a\n   b\n4.\n> q")).toEqual({
      type: "doc",
      content: [ol(3, item(p(text("a")), p(text("b"))), item()), quote(p(text("q")))],
    });
  });

  // Kudos stored before the content schema normalised line breaks hold the CRLF the browser sent.
  it("reads CRLF and lone CR line breaks as LF", () => {
    const lf = "> **a**\n>\n> b\n1. x\n   y\n\nc";
    expect(kudoMarkdownToEditorJson(lf.replace(/\n/g, "\r\n"))).toEqual(kudoMarkdownToEditorJson(lf));
    expect(kudoMarkdownToEditorJson(lf.replace(/\n/g, "\r"))).toEqual(kudoMarkdownToEditorJson(lf));
    expect(back("a\r\n\r\nb")).toBe("a\n\nb");
  });

  it("reads a mention inside a link (a URL pasted over a mention) as a linked mention", () => {
    expect(kudoMarkdownToEditorJson(`[hi @[An](${ID})](https://x.com/)`)).toEqual({
      type: "doc",
      content: [p(text("hi ", link("https://x.com/")), mention("An", link("https://x.com/")))],
    });
  });

  it("keeps the label of a link that is not http(s), never the target", () => {
    for (const markdown of ["[x](ftp://a.com)", "[x](javascript:alert%281%29)", "[x](/relative)"]) {
      const doc = kudoMarkdownToEditorJson(markdown);
      expect(doc).toEqual({ type: "doc", content: [p(text("x"))] });
    }
  });

  it("leaves unknown syntax as text and never throws on odd input", () => {
    for (const markdown of ["", "   ", "\n\n", "**", "_a", "~~a", "[a](b", "@[x](not-a-uuid)", "# h", "- a", "```js", "\r\n> \r\n", ">", "> \n>", "2025.", "\\"]) {
      expect(() => back(markdown)).not.toThrow();
    }
    expect(kudoMarkdownToEditorJson("")).toEqual({ type: "doc", content: [p()] });
    expect(kudoMarkdownToEditorJson(null as unknown as string)).toEqual({ type: "doc", content: [p()] });
    expect(kudoMarkdownToEditorJson("@[x](not-a-uuid)").content?.[0].content?.some((n) => n.type === "mention")).toBe(false);
  });

  it("parses pathological input in linear time", () => {
    for (const markdown of ["**".repeat(20_000), "_a".repeat(20_000), "[a](".repeat(10_000), ">".repeat(20_000), "1. ".repeat(10_000), `${"   ".repeat(5_000)}x`, `[${`@[a](${ID})`.repeat(2_000)}`, "[@[".repeat(10_000), "[@[a]".repeat(10_000), `[@[a](${ID}`.repeat(1_000)]) {
      const started = performance.now();
      back(markdown);
      expect(performance.now() - started).toBeLessThan(500);
    }
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

const WORDS = ["a", "Cảm ơn", " ", "1. x", "2025.", "3.", "> q", ">", "\\", "*", "_", "~", "[", "]", "`", "@", "1.5", "x.", "(y)", "  b "];
const MARKS: KudoEditorMark[] = [bold, italic, strike, link("https://e.com/a_b")];

function fuzzDoc(random: () => number): KudoEditorNode[] {
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
  const marks = () => MARKS.filter(() => random() < 0.3);
  const inline = (): KudoEditorNode[] =>
    Array.from({ length: Math.floor(random() * 5) }, () => {
      const roll = random();
      const own = marks();
      if (roll < 0.1) return mention(pick(WORDS), ...own);
      if (roll < 0.2) return br(...own);
      return text(pick(WORDS), ...own);
    });
  const blocks = (depth: number): KudoEditorNode[] =>
    Array.from({ length: 1 + Math.floor(random() * 3) }, () => {
      const roll = random();
      if (depth < 3 && roll < 0.15) return ol(pick([1, 2, 7]), ...Array.from({ length: 1 + Math.floor(random() * 3) }, () => item(p(...inline()), ...(random() < 0.4 ? blocks(depth + 1) : []))));
      if (depth < 3 && roll < 0.3) return quote(...blocks(depth + 1));
      return p(...inline());
    });
  return blocks(0);
}

describe("kudoMarkdownToEditorJson fuzz (seeded)", () => {
  it("round-trips 500 random editor docs", () => {
    const random = prng(20261023);
    for (let run = 0; run < 500; run++) {
      const markdown = toMd(...fuzzDoc(random));
      expect(back(markdown), `run ${run}: ${JSON.stringify(markdown)}`).toBe(markdown);
    }
  });

  it("never throws on 500 random strings and always yields a valid editor document", () => {
    const random = prng(7);
    const ALPHABET = ["a", " ", "\n", "*", "_", "~", "[", "]", "(", ")", "@", "\\", ">", "1", ".", "   ", "`", "https://a.com/", ID];
    for (let run = 0; run < 500; run++) {
      const markdown = Array.from({ length: Math.floor(random() * 40) }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join("");
      expect(() => schema.nodeFromJSON(kudoMarkdownToEditorJson(markdown)).check(), JSON.stringify(markdown)).not.toThrow();
    }
  });
});
