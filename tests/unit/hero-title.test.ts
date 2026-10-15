import { describe, expect, it } from "vitest";
import { heroTier, starCount } from "@/lib/kudos/hero-title";

describe("heroTier", () => {
  it.each([
    [0, "none"],
    [1, "new"],
    [4, "new"],
    [5, "rising"],
    [9, "rising"],
    [10, "super"],
    [20, "super"],
    [21, "legend"],
    [500, "legend"],
  ] as const)("%i distinct senders -> %s", (senders, tier) => {
    expect(heroTier(senders)).toBe(tier);
  });

  it.each([-3, Number.NaN])("treats %s as no title", (value) => {
    expect(heroTier(value)).toBe("none");
  });
});

describe("starCount", () => {
  it.each([
    [0, 0],
    [9, 0],
    [10, 1],
    [19, 1],
    [20, 2],
    [49, 2],
    [50, 3],
    [1000, 3],
  ] as const)("%i kudos received -> %i stars", (received, stars) => {
    expect(starCount(received)).toBe(stars);
  });
});
