// Single source of truth for in-app navigation targets used by the homepage.
export const HOME_PATH = "/";
export const AWARDS_INFORMATION_PATH = "/awards-information";
export const SUN_KUDOS_PATH = "/sun-kudos";
export const STANDARDS_PATH = "/tieu-chuan-chung";
export const PROFILE_PATH = "/profile";
export const FORBIDDEN_PATH = "/403";

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

/** Kudo detail page (route not built yet: resolves to 404 until the detail plan lands). */
export function kudoDetailHref(id: string): string {
  return `${SUN_KUDOS_PATH}/${encodeURIComponent(id)}`;
}

/** Profile page of a Sunner (route not built yet: resolves to 404 until the profile plan lands). */
export function profileHref(id: string): string {
  return `${PROFILE_PATH}/${encodeURIComponent(id)}`;
}
