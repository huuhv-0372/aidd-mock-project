import { describe, expect, it } from "vitest";
import {
  AWARD_SLUGS,
  AWARDS_INFORMATION_PATH,
  HOME_PATH,
  PROFILE_PATH,
  STANDARDS_PATH,
  SUN_KUDOS_PATH,
  awardHref,
} from "@/lib/navigation/routes";

describe("navigation routes", () => {
  it("defines absolute app paths", () => {
    for (const path of [HOME_PATH, AWARDS_INFORMATION_PATH, SUN_KUDOS_PATH, STANDARDS_PATH, PROFILE_PATH]) {
      expect(path.startsWith("/")).toBe(true);
    }
  });

  it("lists six distinct kebab-case award slugs", () => {
    expect(AWARD_SLUGS).toHaveLength(6);
    expect(new Set(AWARD_SLUGS).size).toBe(6);
    for (const slug of AWARD_SLUGS) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("builds award links as an anchor on the awards information page", () => {
    expect(awardHref("top-talent")).toBe("/awards-information#top-talent");
    expect(awardHref("mvp")).toBe(`${AWARDS_INFORMATION_PATH}#mvp`);
  });
});
