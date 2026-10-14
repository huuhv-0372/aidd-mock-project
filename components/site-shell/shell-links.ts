import {
  AWARDS_INFORMATION_PATH,
  HOME_PATH,
  STANDARDS_PATH,
  SUN_KUDOS_PATH,
} from "@/lib/navigation/routes";
import type { Dictionary } from "@/messages/vi";

export type ShellCopy = Dictionary["shell"];

/*
 * Shared shell navigation (header, footer) from the Figma node tree (MoMorph i87tDx10uM). Labels come
 * from the dictionary (`shell.nav`). The VI labels carry two deliberate corrections of obvious Figma
 * typos so they match the pinned selector contract: "Award Information" -> "Awards Information"
 * and "Comming soon" -> "Coming soon".
 */
const NAV_LINK_DEFS = [
  { key: "about", href: HOME_PATH },
  { key: "awards", href: AWARDS_INFORMATION_PATH },
  { key: "kudos", href: SUN_KUDOS_PATH },
] as const;

export type NavLink = { href: string; label: string };

export function getNavLinks(shell: ShellCopy): NavLink[] {
  return NAV_LINK_DEFS.map(({ key, href }) => ({ href, label: shell.nav[key] }));
}

export function getFooterLinks(shell: ShellCopy): NavLink[] {
  return [...getNavLinks(shell), { href: STANDARDS_PATH, label: shell.footer.standards }];
}
