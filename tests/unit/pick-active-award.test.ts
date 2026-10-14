import { describe, expect, it } from "vitest";
import { pickActiveAward } from "@/lib/awards/pick-active-award";

const sections = [
  { slug: "top-talent", top: 100 },
  { slug: "top-project", top: 600 },
  { slug: "mvp", top: 1100 },
] as const;

describe("pickActiveAward", () => {
  it("falls back to the first section when none has reached the offset", () => {
    expect(pickActiveAward(sections, 50)).toBe("top-talent");
  });

  it("picks the last section whose top is at or above the offset line", () => {
    expect(pickActiveAward(sections, 700)).toBe("top-project");
  });

  it("picks the last section once scrolled past it", () => {
    expect(pickActiveAward(sections, 5000)).toBe("mvp");
  });

  it("treats top equal to the offset as reached", () => {
    expect(pickActiveAward(sections, 600)).toBe("top-project");
  });

  it("accepts negative tops (sections already scrolled above the viewport)", () => {
    expect(pickActiveAward([{ slug: "top-talent", top: -900 }, { slug: "top-project", top: -20 }, { slug: "mvp", top: 500 }], 80)).toBe("top-project");
  });
});
