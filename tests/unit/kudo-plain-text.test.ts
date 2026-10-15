import { describe, expect, it } from "vitest";
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

  it("returns an empty string for empty input", () => {
    expect(kudoPlainText("")).toBe("");
  });
});
