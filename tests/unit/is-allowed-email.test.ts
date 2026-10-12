import { describe, expect, it } from "vitest";
import { isAllowedEmail } from "@/lib/auth/is-allowed-email";

describe("isAllowedEmail", () => {
  it.each([
    "an.nguyen@sun-asterisk.com",
    "An.Nguyen@SUN-ASTERISK.COM",
    "  an@sun-asterisk.com  ",
    // Multiple '@': only the part after the last '@' is the domain.
    "weird@name@sun-asterisk.com",
  ])("allows %s", (email) => {
    expect(isAllowedEmail(email)).toBe(true);
  });

  it.each([
    ["suffix lookalike", "an@sun-asterisk.com.evil.io"],
    ["prefix lookalike", "an@evil-sun-asterisk.com"],
    ["subdomain", "an@mail.sun-asterisk.com"],
    ["other domain", "an@gmail.com"],
    ["last '@' wins", "an@sun-asterisk.com@evil.io"],
    ["no '@'", "sun-asterisk.com"],
    ["empty local part", "@sun-asterisk.com"],
    ["empty", ""],
    ["whitespace only", "   "],
  ])("rejects %s (%s)", (_label, email) => {
    expect(isAllowedEmail(email)).toBe(false);
  });

  it.each([null, undefined])("rejects a missing email (%s)", (email) => {
    expect(isAllowedEmail(email)).toBe(false);
  });
});
