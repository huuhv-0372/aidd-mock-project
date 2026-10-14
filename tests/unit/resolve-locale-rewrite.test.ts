import { describe, expect, it } from "vitest";
import { resolveLocaleRewrite } from "@/lib/i18n/resolve-locale-rewrite";

describe("resolveLocaleRewrite", () => {
  it.each([
    ["/", "en", "/en"],
    ["/", undefined, "/vi"],
    ["/login", "vi", "/vi/login"],
    ["/awards-information", "en", "/en/awards-information"],
    ["/countdown", "en", "/en/countdown"],
  ])("rewrites %s with cookie %j to %s", (path, cookie, expected) => {
    expect(resolveLocaleRewrite(path, cookie)).toBe(expected);
  });

  // A tampered or unsupported cookie never reaches the URL: it falls back to vi.
  it.each(["EN", "jp", "", "en/../x", null])("falls back to vi for cookie %j", (cookie) => {
    expect(resolveLocaleRewrite("/login", cookie)).toBe("/vi/login");
  });

  // Typing the internal segment by hand only nests it again (-> 404), it is never a public URL.
  it("does not treat a hand-typed locale prefix as already localised", () => {
    expect(resolveLocaleRewrite("/en/login", "vi")).toBe("/vi/en/login");
    expect(resolveLocaleRewrite("/vi", "en")).toBe("/en/vi");
  });

  // Route handlers outside app/[locale] keep their path.
  it.each(["/auth", "/auth/", "/auth/callback"])("leaves %s unrewritten", (path) => {
    expect(resolveLocaleRewrite(path, "en")).toBeNull();
  });

  it("matches the /auth prefix by segment, not by string", () => {
    expect(resolveLocaleRewrite("/authors", "en")).toBe("/en/authors");
  });
});
