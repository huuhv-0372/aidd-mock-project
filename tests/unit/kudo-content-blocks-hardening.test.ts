import { describe, expect, it } from "vitest";
import { parseKudoContent, type KudoBlock, type KudoInline } from "@/lib/kudos/kudo-content-blocks";

const ID = "2a000000-0000-0000-0000-000000000101";
const t = (text: string): KudoInline => ({ type: "text", text });
const p = (...children: KudoInline[]): KudoBlock => ({ type: "paragraph", children });

describe("parseKudoContent: link targets that are not URLs (B1)", () => {
  // Old cost (safeHref built a URL and caught the throw for every target): ~270 ms for 50,000 chars of `[a](x)`.
  // With URL.canParse first the same input takes ~15-30 ms, about what valid links cost. The 120 ms ceiling is >5x the
  // typical new time (no flake on a busy runner) and still under half the old cost, so the throw-per-link path fails it.
  it("parses 50,000 chars of invalid link targets well under the throw-per-link cost", () => {
    parseKudoContent("warm [a](x) [b](https://x.com)");
    for (const unit of ["[a](x)", "[a](https://:)"]) {
      const raw = unit.repeat(Math.ceil(50_000 / unit.length)).slice(0, 50_000);
      const started = performance.now();
      const blocks = parseKudoContent(raw);
      expect(performance.now() - started, unit).toBeLessThan(120);
      expect(JSON.stringify(blocks)).not.toContain('"link"');
    }
  });

  it("still links http(s) only, case-insensitively normalised", () => {
    expect(parseKudoContent("[a](HTTPS://Example.com)")).toEqual([
      p({ type: "link", href: "https://example.com/", children: [t("a")] }),
    ]);
    expect(parseKudoContent("[a](javascript:alert%281%29)")).toEqual([p(t("a"))]);
  });
});

describe("parseKudoContent: mentions need a uuid target (B3)", () => {
  it("reads `@` before a link as text and keeps the link", () => {
    expect(parseKudoContent("Nhờ @[Sun](https://sun-asterisk.com/)")).toEqual([
      p(t("Nhờ @"), { type: "link", href: "https://sun-asterisk.com/", children: [t("Sun")] }),
    ]);
  });

  it.each(["not-a-uuid", "", "2a000000-0000-0000-0000-00000000010", "2a000000-0000-0000-0000-000000000101x"])(
    "reads `@[x](%s)` as `@` + a non-http link (label only, no mention)",
    (target) => {
      expect(parseKudoContent(`@[x](${target})`)).toEqual([p(t("@"), t("x"))]);
    },
  );

  it("keeps a uuid-shaped target (any hex case, any version) a mention", () => {
    expect(parseKudoContent(`@[A](${ID.toUpperCase()})`)).toEqual([p({ type: "mention", name: "A" })]);
  });
});

describe("parseKudoContent: line-start markers (B2)", () => {
  it("prints escaped `.` and `>` literally and never reads them as structure", () => {
    expect(parseKudoContent("2025\\.\n1\\. foo\n\\> x\n\\>")).toEqual([p(t("2025.")), p(t("1. foo")), p(t("> x")), p(t(">"))]);
  });

  it("never drops a marker-only line that does not continue a list (old unescaped content)", () => {
    expect(parseKudoContent("2025.")).toEqual([p(t("2025."))]);
    expect(parseKudoContent("Năm\n2025.\nxong")).toEqual([p(t("Năm")), p(t("2025.")), p(t("xong"))]);
  });

  it("keeps a quote with no text as its marker text", () => {
    expect(parseKudoContent(">\n> ")).toEqual([p(t(">")), p(t(">"))]);
  });

  it.each(["1.5 apples", "2024.01.02 x", "1234567890. x", "1.x"])("reads %j as a paragraph (LIST_MARKER boundary)", (line) => {
    expect(parseKudoContent(line)).toEqual([p(t(line))]);
  });

  it("still reads a 9-digit marker as a list", () => {
    expect(parseKudoContent("123456789. x")).toEqual([{ type: "list", start: 123456789, items: [[p(t("x"))]] }]);
  });
});

describe("parseKudoContent: nesting depth (T6)", () => {
  const depthOf = (blocks: KudoBlock[]) => {
    let depth = 0;
    for (let node: KudoBlock | undefined = blocks[0]; node && node.type !== "paragraph"; depth++) {
      node = node.type === "quote" ? node.children[0] : node.items[0]?.[0];
    }
    return depth;
  };

  it.each([
    ["list", "1. ".repeat(20_000) + "deep"],
    ["quote", "> ".repeat(20_000) + "deep"],
    ["mixed", "1. > ".repeat(10_000) + "deep"],
  ])("caps %s nesting 20,000 deep without overflowing the stack", (_name, raw) => {
    let blocks: KudoBlock[] = [];
    expect(() => (blocks = parseKudoContent(raw))).not.toThrow();
    expect(depthOf(blocks)).toBeLessThanOrEqual(8);
  });
});

describe("parseKudoContent: empty list items the serializer writes (fix round 1)", () => {
  const list = (start: number, ...items: KudoBlock[][]): KudoBlock => ({ type: "list", start, items });
  const quote = (...children: KudoBlock[]): KudoBlock => ({ type: "quote", children });

  // The serializer writes an empty editor item as `N. `: a first empty item must still open the list when the
  // numbering goes on, else it reads as a paragraph `1.` followed by a list that starts at 2.
  it("opens a list on an empty first item when the next line continues the numbering", () => {
    expect(parseKudoContent("1. \n2. b")).toEqual([list(1, [], [p(t("b"))])]);
    expect(parseKudoContent("1. \n2.")).toEqual([list(1, [], [])]);
    expect(parseKudoContent("1. a\n   1. \n   2. b")).toEqual([list(1, [p(t("a")), list(1, [], [p(t("b"))])])]);
    expect(parseKudoContent("> 1. \n> 2. b")).toEqual([quote(list(1, [], [p(t("b"))]))]);
  });

  it("opens a list on an empty first item that holds indented lines (Shift+Enter at the start of an item)", () => {
    expect(parseKudoContent("1. \n   x")).toEqual([list(1, [p(t("x"))])]);
    expect(parseKudoContent("1. \n   1. x\n2. y")).toEqual([list(1, [list(1, [p(t("x"))])], [p(t("y"))])]);
  });

  // An empty paragraph inside a quote is a bare `>`; like a blank line anywhere else it must not split the list around it.
  it("keeps a list item whole across an empty line of its quote", () => {
    expect(parseKudoContent("> 1. a\n>\n>    b\n> 2. c")).toEqual([quote(list(1, [p(t("a")), p(t("b"))], [p(t("c"))]))]);
  });

  it("still keeps a marker-only line as text when nothing continues the numbering", () => {
    expect(parseKudoContent("1. \nfoo")).toEqual([p(t("1.")), p(t("foo"))]);
    expect(parseKudoContent("2025.\n2027. x")).toEqual([p(t("2025.")), list(2027, [p(t("x"))])]);
    expect(parseKudoContent("1.\n1. b")).toEqual([p(t("1.")), list(1, [p(t("b"))])]);
  });
});
