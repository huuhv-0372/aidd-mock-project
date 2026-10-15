import { describe, expect, it } from "vitest";
import {
  AWARD_SLUGS,
  AWARDS_INFORMATION_PATH,
  HOME_PATH,
  PROFILE_PATH,
  STANDARDS_PATH,
  SUN_KUDOS_PATH,
  awardHref,
  kudoDetailHref,
  profileHref,
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

  it("builds kudo detail and profile links under their sections", () => {
    const id = "c1000000-0000-4000-8000-000000000001";
    expect(kudoDetailHref(id)).toBe(`/sun-kudos/${id}`);
    expect(profileHref(id)).toBe(`/profile/${id}`);
  });

  it("encodes ids so they cannot add path segments or query strings", () => {
    expect(kudoDetailHref("a/b?c")).toBe("/sun-kudos/a%2Fb%3Fc");
    expect(profileHref("../x")).toBe("/profile/..%2Fx");
  });
});
