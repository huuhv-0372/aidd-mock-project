import { describe, expect, it } from "vitest";
import { buildKudosFilterHref } from "@/lib/kudos/kudos-filter-href";
import { parseKudosFilters } from "@/lib/kudos/parse-kudos-filters";

const catalog = {
  hashtagSlugs: ["dedicated", "aim-high"],
  departmentCodes: ["CEVC1", "STVC - R&D", "OPDC - HRF - C&B"],
};

describe("parseKudosFilters", () => {
  it("keeps values present in the catalog", () => {
    expect(parseKudosFilters({ hashtag: "dedicated", department: "CEVC1" }, catalog)).toEqual({
      hashtag: "dedicated",
      department: "CEVC1",
    });
  });

  it("drops unknown slugs and codes", () => {
    expect(parseKudosFilters({ hashtag: "nope", department: "XYZ" }, catalog)).toEqual({});
    expect(parseKudosFilters({ hashtag: "nope", department: "CEVC1" }, catalog)).toEqual({ department: "CEVC1" });
  });

  it("accepts department codes containing spaces and ampersands", () => {
    expect(parseKudosFilters({ department: "STVC - R&D" }, catalog)).toEqual({ department: "STVC - R&D" });
    expect(parseKudosFilters({ department: "OPDC - HRF - C&B" }, catalog)).toEqual({
      department: "OPDC - HRF - C&B",
    });
  });

  it("treats empty, blank, missing and over-long values as absent", () => {
    expect(parseKudosFilters({ hashtag: "", department: "   " }, catalog)).toEqual({});
    expect(parseKudosFilters({}, catalog)).toEqual({});
    expect(parseKudosFilters({ hashtag: "a".repeat(101) }, catalog)).toEqual({});
  });

  it("uses the first value of a repeated param", () => {
    expect(parseKudosFilters({ hashtag: ["aim-high", "dedicated"] }, catalog)).toEqual({ hashtag: "aim-high" });
  });

  it("drops a filter whose catalog failed to load", () => {
    expect(
      parseKudosFilters(
        { hashtag: "dedicated", department: "CEVC1" },
        { hashtagSlugs: null, departmentCodes: catalog.departmentCodes },
      ),
    ).toEqual({ department: "CEVC1" });
  });
});

describe("buildKudosFilterHref", () => {
  it("returns the bare path when no filter is set", () => {
    expect(buildKudosFilterHref({}, {})).toBe("/sun-kudos");
  });

  it("sets and replaces a filter while keeping the other", () => {
    expect(buildKudosFilterHref({ department: "CEVC1" }, { hashtag: "aim-high" })).toBe(
      "/sun-kudos?hashtag=aim-high&department=CEVC1",
    );
    expect(buildKudosFilterHref({ hashtag: "dedicated" }, { hashtag: "aim-high" })).toBe(
      "/sun-kudos?hashtag=aim-high",
    );
  });

  it("removes a param when its filter is cleared with null", () => {
    expect(buildKudosFilterHref({ hashtag: "dedicated", department: "CEVC1" }, { hashtag: null })).toBe(
      "/sun-kudos?department=CEVC1",
    );
    expect(buildKudosFilterHref({ hashtag: "dedicated" }, { hashtag: null })).toBe("/sun-kudos");
  });

  it("encodes codes with & and spaces so they round-trip", () => {
    const href = buildKudosFilterHref({}, { department: "STVC - R&D" });
    expect(href).not.toContain("&D");
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(params.department).toBe("STVC - R&D");
  });
});
