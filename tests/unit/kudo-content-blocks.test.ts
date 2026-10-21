import { describe, expect, it } from "vitest";
import { parseKudoContent, type KudoBlock, type KudoInline } from "@/lib/kudos/kudo-content-blocks";
import { kudoEditorJsonToMarkdown, type KudoEditorNode } from "@/lib/kudos/kudo-content-markdown";
import { DETAIL_KUDO } from "@/tests/e2e/support/kudos-fixtures.mjs";

const ID = "2a000000-0000-0000-0000-000000000101";
const t = (text: string): KudoInline => ({ type: "text", text });
const p = (...children: KudoInline[]): KudoBlock => ({ type: "paragraph", children });
/** Inlines of a one-paragraph document. */
const inline = (markdown: string) => {
  const blocks = parseKudoContent(markdown);
  expect(blocks).toHaveLength(1);
  expect(blocks[0].type).toBe("paragraph");
  return (blocks[0] as Extract<KudoBlock, { type: "paragraph" }>).children;
};

/** Every inline node of a tree, depth first. */
function walk(nodes: (KudoBlock | KudoInline)[]): (KudoBlock | KudoInline)[] {
  return nodes.flatMap((node) => {
    if (node.type === "list") return [node, ...node.items.flatMap((item) => walk(item))];
    if ("children" in node) return [node, ...walk(node.children)];
    return [node];
  });
}
const textOf = (nodes: (KudoBlock | KudoInline)[]): string =>
  walk(nodes).map((n) => (n.type === "text" ? n.text : n.type === "mention" ? `@${n.name}` : "")).join("");

describe("parseKudoContent: inlines", () => {
  it("parses bold, italic and strike", () => {
    expect(inline("a **b** _c_ ~~d~~")).toEqual([
      t("a "), { type: "strong", children: [t("b")] }, t(" "), { type: "em", children: [t("c")] }, t(" "),
      { type: "s", children: [t("d")] },
    ]);
  });

  it("nests marks in the serializer's order (link > bold > italic > strike)", () => {
    expect(inline("**_~~x~~_**")).toEqual([
      { type: "strong", children: [{ type: "em", children: [{ type: "s", children: [t("x")] }] }] },
    ]);
    expect(inline("[**a** b](https://example.com/x)")).toEqual([
      { type: "link", href: "https://example.com/x", children: [{ type: "strong", children: [t("a")] }, t(" b")] },
    ]);
  });

  it("links http(s) URLs only, normalised by URL", () => {
    expect(inline("[a](http://example.com)")).toEqual([{ type: "link", href: "http://example.com/", children: [t("a")] }]);
  });

  it.each(["javascript:alert%281%29", "JaVaScRiPt:alert%281%29", "data:text/html,x", "/relative", "ftp://a.com", "www.a.com", ""])(
    "keeps only the label of a link to %j",
    (href) => {
      expect(inline(`x [label](${href}) y`)).toEqual([t("x "), t("label"), t(" y")]);
    },
  );

  it("never links a hand-made target with raw parentheses: the token stays text", () => {
    const nodes = inline("[mở ngay](javascript:alert(1))");
    expect(walk(nodes).some((n) => n.type === "link")).toBe(false);
    expect(textOf(nodes)).toBe("[mở ngay](javascript:alert(1))");
  });

  it("turns a mention into its name, never a link", () => {
    expect(inline(`Cảm ơn @[Nguyễn Văn A](${ID}) nhé`)).toEqual([t("Cảm ơn "), { type: "mention", name: "Nguyễn Văn A" }, t(" nhé")]);
  });

  it("prints escaped characters literally and never reads them as Markdown", () => {
    expect(inline("\\*a\\* \\_b\\_ \\~\\~c\\~\\~ \\[d\\](https://x.com) \\\\ \\`")).toEqual([
      t("*a* _b_ ~~c~~ [d](https://x.com) \\ `"),
    ]);
    expect(inline(`@[A\\_B \\[x\\]](${ID})`)).toEqual([{ type: "mention", name: "A_B [x]" }]);
  });

  it("keeps a backslash inside a link target", () => {
    expect(inline("[a](https://x.com/?q=\\*)")).toEqual([{ type: "link", href: "https://x.com/?q=\\*", children: [t("a")] }]);
  });

  it("leaves unterminated or empty delimiters as text", () => {
    for (const raw of ["**a", "a**", "_a", "~~a", "****", "__", "~~~~", "[a](https://x.com", "[a]", "@[a]", "*a*"]) {
      expect(textOf(inline(raw))).toBe(raw);
      expect(walk(inline(raw)).every((n) => n.type === "text" || n.type === "paragraph")).toBe(true);
    }
  });

  // 50k-char runs parse in ~5-20 ms; a quadratic pattern would take seconds. The ceiling leaves room for a busy
  // runner (parallel workers, GC) without hiding a real regression.
  it("stays linear on hostile delimiter runs", () => {
    parseKudoContent("warm **up** _the_ [jit](https://x.com)");
    for (const unit of ["*", "_", "~", "[", "@[", "[a](", "**_", "\\"]) {
      const raw = unit.repeat(50_000);
      const started = performance.now();
      parseKudoContent(raw);
      expect(performance.now() - started, unit).toBeLessThan(250);
    }
  });
});

describe("parseKudoContent: blocks", () => {
  it("makes each non-blank line a paragraph and drops blank lines", () => {
    expect(parseKudoContent("a\n\n\r\n  \nb")).toEqual([p(t("a")), p(t("b"))]);
    expect(parseKudoContent("")).toEqual([]);
  });

  it("groups consecutive numbered lines into one ordered list", () => {
    expect(parseKudoContent("1. a\n2. **b**\n3.")).toEqual([
      { type: "list", start: 1, items: [[p(t("a"))], [p({ type: "strong", children: [t("b")] })], []] },
    ]);
  });

  it("starts a new list when the numbering does not continue", () => {
    const blocks = parseKudoContent("1. a\n1. b\n5. c\n6. d");
    expect(blocks.map((b) => (b.type === "list" ? [b.start, b.items.length] : b.type))).toEqual([[1, 1], [1, 1], [5, 2]]);
  });

  it("nests indented lines (serializer INDENT) inside the list item", () => {
    expect(parseKudoContent("1. a\n   more\n   1. inner\n2. b")).toEqual([
      {
        type: "list",
        start: 1,
        items: [[p(t("a")), p(t("more")), { type: "list", start: 1, items: [[p(t("inner"))]] }], [p(t("b"))]],
      },
    ]);
  });

  it("groups quote lines and parses their content as blocks", () => {
    expect(parseKudoContent("> a\n>\n> 1. b\nc")).toEqual([
      { type: "quote", children: [p(t("a")), { type: "list", start: 1, items: [[p(t("b"))]] }] },
      p(t("c")),
    ]);
  });

  it("caps nesting depth and does not overflow the stack", () => {
    const blocks = parseKudoContent(">".repeat(20_000) + " deep");
    let depth = 0;
    for (let node: KudoBlock | undefined = blocks[0]; node?.type === "quote"; node = node.children[0]) depth++;
    expect(depth).toBeLessThanOrEqual(8);
  });

  it("round-trips what the serializer writes", () => {
    const text = (value: string, ...marks: KudoEditorNode["marks"] & object): KudoEditorNode => ({ type: "text", text: value, marks });
    const para = (...content: KudoEditorNode[]) => ({ type: "paragraph", content });
    const markdown = kudoEditorJsonToMarkdown({
      type: "doc",
      content: [
        para(text("a*b_c", { type: "bold" }), text(" "), text("site", { type: "link", attrs: { href: "https://e.com/a_b" } }, { type: "italic" })),
        { type: "blockquote", content: [para(text("q"))] },
        { type: "orderedList", content: [{ type: "listItem", content: [para(text("one"))] }] },
      ],
    });
    expect(parseKudoContent(markdown)).toEqual([
      p({ type: "strong", children: [t("a*b_c")] }, t(" "), { type: "link", href: "https://e.com/a_b", children: [{ type: "em", children: [t("site")] }] }),
      { type: "quote", children: [p(t("q"))] },
      { type: "list", start: 1, items: [[p(t("one"))]] },
    ]);
  });
});

describe("parseKudoContent: the E2E fixture DETAIL_CONTENT", () => {
  const blocks = parseKudoContent(DETAIL_KUDO.content);
  const nodes = walk(blocks);
  const named = (type: string) => nodes.filter((n) => n.type === type);

  it("renders every construct once", () => {
    expect(named("strong").map((n) => textOf([n]))).toEqual(["bạn"]);
    expect(named("em").map((n) => textOf([n]))).toEqual(["luôn"]);
    expect(named("s").map((n) => textOf([n]))).toEqual(["việc gấp"]);
    const lists = named("list") as Extract<KudoBlock, { type: "list" }>[];
    expect(lists.map((l) => l.items.length)).toEqual([3]);
    expect(named("quote").map((n) => textOf([n]))).toEqual(["Một đồng đội giỏi là người biết chia sẻ."]);
    expect(named("link")).toEqual([{ type: "link", href: "https://example.com/x", children: [t("tài liệu nội bộ")] }]);
    expect(named("mention")).toEqual([{ type: "mention", name: "Nguyễn Thị Minh Anh" }]);
  });

  it("keeps escaped asterisks literal and never links the javascript: token", () => {
    expect(textOf(blocks)).toContain("Dấu sao *nguyên văn* không phải chữ nghiêng.");
    expect(textOf(blocks)).not.toContain("@[");
    expect(textOf(blocks)).not.toContain("](https://example.com/x)");
    expect(named("link").some((n) => textOf([n]).includes("mở ngay"))).toBe(false);
  });
});
