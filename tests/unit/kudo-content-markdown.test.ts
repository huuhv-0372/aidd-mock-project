import { describe, expect, it } from "vitest";
import { kudoEditorJsonToMarkdown, type KudoEditorNode } from "@/lib/kudos/kudo-content-markdown";

const ID = "2a000000-0000-0000-0000-000000000101";
const text = (value: string, ...marks: KudoEditorNode["marks"] & object): KudoEditorNode => ({
  type: "text",
  text: value,
  ...(marks.length ? { marks } : {}),
});
const p = (...content: KudoEditorNode[]): KudoEditorNode => ({ type: "paragraph", content });
const doc = (...content: KudoEditorNode[]): KudoEditorNode => ({ type: "doc", content });
const md = (...content: KudoEditorNode[]) => kudoEditorJsonToMarkdown(doc(...content));
const link = (href: unknown) => ({ type: "link", attrs: { href } });

describe("kudoEditorJsonToMarkdown", () => {
  it.each([
    ["bold", [{ type: "bold" }], "**x**"],
    ["italic", [{ type: "italic" }], "_x_"],
    ["strike", [{ type: "strike" }], "~~x~~"],
  ])("serialises %s", (_name, marks, expected) => {
    expect(md(p(text("x", ...marks)))).toBe(expected);
  });

  it("nests marks and merges neighbouring runs of the same mark", () => {
    expect(md(p(text("a", { type: "bold" }), text("b", { type: "bold" }, { type: "italic" })))).toBe("**a_b_**");
    expect(md(p(text("a", { type: "bold" }, { type: "italic" }, { type: "strike" })))).toBe("**_~~a~~_**");
    expect(md(p(text("x ", { type: "bold" }), text("y")))).toBe("**x** y");
  });

  it("keeps delimiters tight around whitespace and skips whitespace-only runs", () => {
    expect(md(p(text("a"), text("  hi  ", { type: "bold" }), text("b")))).toBe("a  **hi**  b");
    expect(md(p(text("a"), text(" ", { type: "bold" }), text("b")))).toBe("a b");
  });

  it("writes a link only for http(s) URLs and keeps the text otherwise", () => {
    expect(md(p(text("site", link("https://example.com/a?b=1"))))).toBe("[site](https://example.com/a?b=1)");
    expect(md(p(text("site", link("http://example.com/x"))))).toBe("[site](http://example.com/x)");
    for (const href of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "ftp://a.com", "www.a.com", "", undefined]) {
      expect(md(p(text("site", link(href))))).toBe("site");
    }
  });

  it("encodes parentheses in the URL so the link cannot end early", () => {
    expect(md(p(text("w", link("https://a.com/x_(y)"))))).toBe("[w](https://a.com/x_%28y%29)");
  });

  it("styles text inside a link", () => {
    expect(md(p(text("go", link("https://a.com"), { type: "bold" })))).toBe("[**go**](https://a.com/)");
  });

  it("serialises a mention as @[Name](id) next to bold text", () => {
    const mention: KudoEditorNode = { type: "mention", attrs: { id: ID, label: "Nguyễn Văn An" } };
    expect(md(p(text("Cảm ơn", { type: "bold" }), text(" "), mention))).toBe(`**Cảm ơn** @[Nguyễn Văn An](${ID})`);
    expect(md(p({ type: "mention", attrs: { label: "x" } }))).toBe("");
  });

  it("turns paragraphs and hard breaks into newlines", () => {
    expect(md(p(text("a"), { type: "hardBreak" }, text("b")), p(text("c")))).toBe("a\nb\nc");
  });

  it("drops leading and trailing blank paragraphs but keeps inner ones", () => {
    expect(md(p(), p(text("a")), p(), p(text("b")), p())).toBe("a\n\nb");
  });

  it("serialises ordered lists, honouring start and multi-paragraph items", () => {
    const item = (...c: KudoEditorNode[]): KudoEditorNode => ({ type: "listItem", content: c });
    expect(md({ type: "orderedList", content: [item(p(text("one"))), item(p(text("two")), p(text("more")))] })).toBe(
      "1. one\n2. two\n   more",
    );
    expect(md({ type: "orderedList", attrs: { start: 3 }, content: [item(p(text("x")))] })).toBe("3. x");
  });

  it("serialises blockquotes, including blank lines and inline marks", () => {
    expect(md({ type: "blockquote", content: [p(text("a", { type: "bold" })), p(), p(text("b"))] })).toBe("> **a**\n>\n> b");
  });

  it("escapes Markdown characters in plain text", () => {
    expect(md(p(text("2*3 _x_ ~y~ [z] `c` \\")))).toBe("2\\*3 \\_x\\_ \\~y\\~ \\[z\\] \\`c\\` \\\\");
    expect(md(p({ type: "mention", attrs: { id: ID, label: "A]B" } }))).toBe(`@[A\\]B](${ID})`);
  });

  it("leaves accented text and ordinary punctuation alone", () => {
    expect(md(p(text("Cảm ơn bạn đã hỗ trợ team! (rất nhiều).")))).toBe("Cảm ơn bạn đã hỗ trợ team! (rất nhiều).");
  });

  it("degrades unknown nodes and malformed input without throwing", () => {
    expect(md({ type: "bulletList", content: [{ type: "listItem", content: [p(text("a"))] }] })).toBe("a");
    expect(md({ type: "horizontalRule" })).toBe("");
    expect(kudoEditorJsonToMarkdown({})).toBe("");
    expect(kudoEditorJsonToMarkdown(null as unknown as KudoEditorNode)).toBe("");
  });
});
