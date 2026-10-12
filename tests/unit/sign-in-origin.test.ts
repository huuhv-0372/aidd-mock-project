import { describe, expect, it } from "vitest";
import { parseRequestOrigin } from "@/lib/validation/request-origin";

describe("parseRequestOrigin", () => {
  it("accepts http and https origins", () => {
    expect(parseRequestOrigin("https://example.com")).toBe("https://example.com");
    expect(parseRequestOrigin("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it.each([null, "", "null", "javascript:x", "ftp://x", "garbage"])(
    "rejects %j",
    (value) => {
      expect(parseRequestOrigin(value)).toBeNull();
    },
  );
});
