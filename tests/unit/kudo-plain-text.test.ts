import { describe, expect, it } from "vitest";
import { kudoEditorJsonToMarkdown } from "@/lib/kudos/kudo-content-markdown";
import { kudoPlainText } from "@/lib/kudos/kudo-plain-text";

describe("kudoPlainText", () => {
  it("turns a mention into @Name", () => {
    expect(kudoPlainText("Cảm ơn @[Nguyễn Văn A](2a000000-0000-4000-8000-000000000001) nhé")).toBe(
      "Cảm ơn @Nguyễn Văn A nhé",
    );
  });

  it("strips bold, italic, strike, code and underscore emphasis", () => {
    expect(kudoPlainText("**đậm** và *nghiêng* và ~~gạch~~ và `mã` và _xiên_")).toBe(
      "đậm và nghiêng và gạch và mã và xiên",
    );
  });

  it("keeps the label of links and images, drops the URL", () => {
    expect(kudoPlainText("Xem [tài liệu](https://example.com/a) ![ảnh](/x.png)")).toBe("Xem tài liệu ảnh");
  });

  it("removes list, quote and heading markers per line", () => {
    expect(kudoPlainText("- một\n* hai\n1. ba\n> trích dẫn\n## Tiêu đề")).toBe(
      "một\nhai\nba\ntrích dẫn\nTiêu đề",
    );
  });

  it("drops blank lines so line-clamp counts real lines", () => {
    expect(kudoPlainText("a\n\n\r\n  \nb")).toBe("a\nb");
  });

  it("leaves snake_case identifiers and lone asterisks alone", () => {
    expect(kudoPlainText("gọi get_token_now và 2 * 3")).toBe("gọi get_token_now và 2 * 3");
  });

  it("unescapes the characters the Kudo serializer escapes", () => {
    expect(kudoPlainText("2\\*3 \\_x\\_ \\~y\\~ \\[z\\] \\`c\\` \\\\")).toBe("2*3 _x_ ~y~ [z] `c` \\");
  });

  it("does not treat escaped delimiters as emphasis or a list marker", () => {
    expect(kudoPlainText("\\*a\\* và \\_b\\_")).toBe("*a* và _b_");
    expect(kudoPlainText("\\* không phải gạch đầu dòng")).toBe("* không phải gạch đầu dòng");
  });

  it("renders a mention whose label holds escaped brackets", () => {
    expect(kudoPlainText("Cảm ơn @[A\\]B \\*](2a000000-0000-4000-8000-000000000001)")).toBe("Cảm ơn @A]B *");
  });

  it("keeps the plain text of serializer output (escapes round-trip)", () => {
    const doc = {
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "2*3 và [z] " },
            { type: "text", text: "đậm_", marks: [{ type: "bold" }] },
            { type: "mention", attrs: { id: "2a000000-0000-4000-8000-000000000001", label: "Lê [Sun*]" } },
          ],
        },
      ],
    };
    expect(kudoPlainText(kudoEditorJsonToMarkdown(doc))).toBe("2*3 và [z] đậm_@Lê [Sun*]");
  });

  it("returns an empty string for empty input", () => {
    expect(kudoPlainText("")).toBe("");
  });
});
