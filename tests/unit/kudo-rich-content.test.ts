import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KudoRichContent } from "@/components/kudos/kudo-rich-content";
import { DETAIL_KUDO } from "@/tests/e2e/support/kudos-fixtures.mjs";

const render = (markdown: string) => renderToStaticMarkup(createElement(KudoRichContent, { markdown }));

describe("KudoRichContent", () => {
  it("renders marks, list, quote, safe link and mention as elements", () => {
    const html = render(DETAIL_KUDO.content);
    expect(html).toContain("<strong>bạn</strong>");
    expect(html).toContain("<em>luôn</em>");
    expect(html).toContain("<s>việc gấp</s>");
    expect(html.match(/<li>/g)).toHaveLength(3);
    expect(html).toMatch(/<blockquote[^>]*><p>Một đồng đội giỏi là người biết chia sẻ\.<\/p><\/blockquote>/);
    expect(html).toContain('<a href="https://example.com/x" target="_blank" rel="noopener noreferrer"');
    expect(html).toContain("<strong>@Nguyễn Thị Minh Anh</strong>");
    expect(html).toContain("Dấu sao *nguyên văn* không phải chữ nghiêng.");
    expect(html.match(/<a /g)).toHaveLength(1);
  });

  it("escapes markup in the text instead of injecting it", () => {
    const html = render('<img src=x onerror="alert(1)"> **<script>x</script>**');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain("<strong>&lt;script&gt;x&lt;/script&gt;</strong>");
  });

  it("keeps the list numbering from the source", () => {
    expect(render("4. a\n5. b")).toContain('<ol start="4"');
  });
});
