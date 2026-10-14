import { describe, expect, it } from "vitest";
import { AWARD_SLUGS } from "@/lib/navigation/routes";
import { parseAwardHash } from "@/lib/awards/parse-award-hash";

describe("parseAwardHash", () => {
  it("accepts every award slug with or without the leading #", () => {
    for (const slug of AWARD_SLUGS) {
      expect(parseAwardHash(`#${slug}`)).toBe(slug);
      expect(parseAwardHash(slug)).toBe(slug);
    }
  });

  it("decodes percent-encoded slugs", () => {
    expect(parseAwardHash("#top%2Dtalent")).toBe("top-talent");
  });

  it("returns null for unknown, empty, or case-mismatched hashes", () => {
    for (const hash of ["", "#", "#unknown-award", "#Top-Talent", "#top-talent/extra", "#top-talent "]) {
      expect(parseAwardHash(hash)).toBeNull();
    }
  });

  it("returns null (never throws) for malformed percent-encoding", () => {
    expect(parseAwardHash("#%E0%A4%A")).toBeNull();
    expect(parseAwardHash("#%")).toBeNull();
  });
});
