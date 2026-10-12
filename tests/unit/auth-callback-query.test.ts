import { describe, expect, it } from "vitest";
import { parseAuthCallbackQuery } from "@/lib/validation/auth-callback";

const parse = (query: string) => parseAuthCallbackQuery(new URLSearchParams(query));

describe("parseAuthCallbackQuery", () => {
  it("returns the code for a valid callback", () => {
    expect(parse("code=abc-123")).toEqual({ code: "abc-123" });
  });

  it("returns null when code is missing", () => {
    expect(parse("")).toBeNull();
  });

  it("returns null when code is empty", () => {
    expect(parse("code=")).toBeNull();
  });

  it("accepts a code of exactly 512 chars and rejects 513", () => {
    expect(parse(`code=${"a".repeat(512)}`)).toEqual({ code: "a".repeat(512) });
    expect(parse(`code=${"a".repeat(513)}`)).toBeNull();
  });

  it("returns null when the provider reports an error, even with a code", () => {
    expect(parse("error=access_denied")).toBeNull();
    expect(parse("code=abc&error=access_denied&error_description=denied")).toBeNull();
  });

  it("strips next and any other param", () => {
    expect(parse("code=abc&next=https://evil.example&redirect_to=//evil")).toEqual({
      code: "abc",
    });
  });
});
