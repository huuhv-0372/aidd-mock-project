---
phase: 02
title: "Track A: Homepage UI (presentational)"
status: completed
owner: momorph-ui-implementer
test_policy: e2e-red-first
blocked_by: [01]
---

# Phase 02 - Track A UI

- **Screen:** fileKey `9ypp4enmFmdK3YAFJLIu6C`, screenId `i87tDx10uM` (Figma node 2167:9026). Read frame + specs via MoMorph first. ALL copy verbatim from the Figma node tree (award descriptions are empty in specs for 5 of 6 cards; footer copyright keeps Figma's text). Selectors per phase-01 contract (read-only RED files from 01).
- **Goal:** sticky header (logo, nav with active/hover, bell + empty panel "Chưa có thông báo" no badge, language selector, account menu = Profile link + sign-out slot), hero (key visual, h1 ROOT FURTHER, Coming soon, countdown, event info, 2 CTAs), Root Further block, awards (C1 title + C2 six cards: 3 cols desktop, 2 cols tablet/mobile per Figma + test ID-16, whole card = one anchor), Sun* Kudos block, floating widget button (button only, no menu), footer. 1440 and 375.
- **Owned files:** create `components/home/*` (header, account-menu, notification-button, home-hero, home-countdown, root-further-content, awards-section, award-card, award-cards-data.ts, kudos-section, widget-button, home-footer, sign-out-button), `public/images/home/*`. Move `components/login/language-selector.tsx` -> `components/ui/language-selector.tsx` (`git mv`, behaviour unchanged) and fix its one import in `components/login/login-header.tsx`. Edit `app/globals.css` (`@theme` tokens, append only), `app/layout.tsx` (extra font weights only).
- **Out of scope:** `app/page.tsx`, timer/ticking, sign-out action/form, `lib/**`, proxy, tests (01 owns the spec), real i18n, notifications data, widget menu.
- **Integration contract (fixed; 03/04 depend on it):**
  - `HomeHeader({ signOutSlot: ReactNode })`; `AccountMenu({ children })` is the only client leaf besides `LanguageSelector` and `NotificationButton`; `SignOutButton()` = plain `<button type="submit" role="menuitem">Sign out</button>` (no onClick).
  - `HomeHero({ countdown: ReactNode })`; `HomeCountdown({ days, hours, minutes, showComingSoon })` all `string`/`boolean`, server-safe, renders "Coming soon" only when `showComingSoon`, testids `countdown-days|hours|minutes`. Reuse `components/countdown/countdown-unit.tsx` (`--s` scale wrapper) if Figma digit boxes match; else own unit file and note why.
  - Hrefs/slugs come from `lib/navigation/routes.ts` (names fixed in phase 03: `HOME_PATH, AWARDS_INFORMATION_PATH, SUN_KUDOS_PATH, STANDARDS_PATH, PROFILE_PATH, AWARD_SLUGS, awardHref(slug)`); never hard-code paths.
- **Rules:** server components by default, `"use client"` only on the leaves above; `next/image` with `sizes`; `min-h-11 min-w-11`; `focus-visible:`; `motion-safe:` + `motion-reduce:`; Tailwind v4 `@theme`; files < 200 lines (split sections); account menu closes on outside click/Esc/toggle, opens on Enter/Space.
- **Success:** `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `npm run test:e2e -- tests/e2e/login.spec.ts` still green (selector move). Visual diff + homepage GREEN happen in 04.
- **Risks:** Figma asset export 500s (login hit this; approximate + log open item); awards imagery weight (M/L: optimized sizes, lazy below fold); large file (L/L: split by section).

## MoMorph refs:
- Homepage SAA: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM
- Clarifications: plans/261012-1549-homepage-saa/clarifications.md
- testPolicy: e2e-red-first
