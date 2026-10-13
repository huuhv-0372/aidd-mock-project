// Single source of truth for in-app navigation targets used by the homepage.
export const HOME_PATH = "/";
export const AWARDS_INFORMATION_PATH = "/awards-information";
export const SUN_KUDOS_PATH = "/sun-kudos";
export const STANDARDS_PATH = "/tieu-chuan-chung";
export const PROFILE_PATH = "/profile";

export const AWARD_SLUGS = [
  "top-talent",
  "top-project",
  "top-project-leader",
  "best-manager",
  "signature-2025-creator",
  "mvp",
] as const;

export type AwardSlug = (typeof AWARD_SLUGS)[number];

export function awardHref(slug: AwardSlug): string {
  return `${AWARDS_INFORMATION_PATH}#${slug}`;
}
