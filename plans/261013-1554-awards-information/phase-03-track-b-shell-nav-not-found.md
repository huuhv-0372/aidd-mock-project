---
phase: 03
title: "Track B: shared shell, nav behavior, 404"
status: completed
owner: implementer
test_policy: e2e-red-first
blocked_by: [01]
---

# Phase 03 - Track B

## Goal
(1) Move everything the second page shares out of `components/home/`; (2) make the header active item a prop; (3) write the scroll-spy / hash / click logic (unit-tested, RED-first); (4) add the SAA-styled 404. Homepage stays visually and behaviorally identical.

## Owned files
- **Move (`git mv`, no logic change)** `components/home/ -> components/site-shell/`: `home-header.tsx -> site-header.tsx` (`SiteHeader`), `home-footer.tsx -> site-footer.tsx` (`SiteFooter`), `widget-button.tsx`, `home-link.tsx`, `home-class-names.ts -> shell-class-names.ts`, `home-icons.tsx -> shell-icons.tsx`, `header-session-controls.tsx`, `header-controls-placeholder.tsx`, `signed-in-controls.tsx`, `login-link.tsx`, `account-menu.tsx`, `notification-button.tsx`, `sign-out-button.tsx`, `sign-out-form.tsx`, `use-dismissable.ts`, `kudos-section.tsx`.
- **Split** `components/home/home-copy.ts`: create `components/site-shell/shell-copy.ts` with `LOGO_ALT, NAV_LINKS, FOOTER_LINKS, FOOTER_COPYRIGHT, KUDOS_COPY` (move the Figma-typo comment with them); `home-copy.ts` keeps `COMING_SOON, EVENT_INFO`.
- **Edit imports** in the remaining `components/home/*` (hero, cta, countdown*, root-further*, awards-section, award-card) and `app/page.tsx` (`HomeHeader -> SiteHeader activeHref={HOME_PATH}`). Grep for stale `components/home/` imports; also check `tests/` and docs mentions.
- **Header change:** remove the `ACTIVE_HREF` const; `SiteHeader({ controls, activeHref }: { controls: ReactNode; activeHref: string })`; `aria-current` from the prop. Nothing else changes (markup, classes, `order`).
- **Create** `lib/awards/parse-award-hash.ts` (`parseAwardHash(hash: string): AwardSlug | null`, accepts `#slug` or `slug`, URL-decoded, exact `AWARD_SLUGS` match, else null), `lib/awards/pick-active-award.ts` (`pickActiveAward(sections: readonly { slug: AwardSlug; top: number }[], offset: number): AwardSlug` = last section with `top <= offset`, else first), `components/awards/use-active-award.ts` (`"use client"` hook, contract in plan.md), `app/not-found.tsx`.
- **Tests (unit, `tests/unit/`)**: `parse-award-hash.test.ts` (valid, `#`-less, unknown, empty, encoded junk -> null), `pick-active-award.test.ts` (none reached -> first, middle, past last -> last, equal to offset -> that one). RED first, then implement.

## Hook behavior (`useActiveAward(slugs)`)
- Initial state first slug. On mount: `parseAwardHash(location.hash)` valid -> activate + `scrollIntoView` that section (instant; native hash scroll may already have fired); invalid -> nothing, no throw.
- Spy: `IntersectionObserver` on the `document.getElementById(slug)` sections only as a re-measure trigger; on trigger compute `top` via `getBoundingClientRect` and call `pickActiveAward` with offset = sticky bar height + small gap (read from the nav element's `getBoundingClientRect().bottom`, not a magic number). Disconnect on unmount; missing element -> skipped.
- `select(slug)`: set active, `scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" })`, `history.replaceState(null, "", "#" + slug)` (no history spam), pause the spy until `scrollend` (fallback timeout ~1s) so intermediate sections do not flicker the active item.
- Listen `hashchange`: valid slug -> activate + scroll; invalid -> ignore (ID-13).

## 404 (`app/not-found.tsx`)
Server component, `bg-login-bg`, `font-montserrat`, centered: heading `Không tìm thấy trang`, one-line Vietnamese hint, `next/link` button `Về trang chủ` -> `HOME_PATH`. Use `FOCUS_RING` from site-shell, `min-h-11`, `focus-visible:`. No header/footer. No stack/error details.

## Out of scope
`app/awards-information/*`, `components/awards/*` except the hook, `public/**`, proxy/auth, `playwright.config.ts`, existing tests (selectors unchanged; if a homepage test breaks the move is wrong, do not edit the test).

## Steps / Success
1. Shell move + `shell-copy` split + `SiteHeader` prop + import fixes; `npx tsc --noEmit`, `npm run lint`, `npm run build`. Do this first (02 imports these paths).
2. RED unit tests, then `lib/awards/*`, then the hook, then `not-found.tsx`.
3. `npm test` (all) green; full `npm run test:e2e` green for homepage*.spec, login, countdown (shell move proof); `awards-information.spec.ts` still partly RED until 04 (page absent/not wired) - expected.
4. Kill servers you start; check ports before running.

## Risks
| Risk | L/I | Counter |
|------|-----|---------|
| Missed import breaks build after move | M/M | tsc + build gate; grep `components/home/` |
| Homepage visual drift | L/H | no markup edits; full homepage E2E; 04 visual diff |
| `replaceState` conflicts with Next router state | L/M | Next 16 supports native history API; E2E asserts hash + no console error |
| Hook runs on server | L/M | all DOM access inside effects/handlers |

## MoMorph refs:
- Hệ thống giải: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/zFYDgyj_pD
- Clarifications: plans/261013-1554-awards-information/clarifications.md
- testPolicy: e2e-red-first

## Completion notes (2026-10-13)
- Done: shell moved `components/home/ -> components/site-shell/` (SiteHeader `activeHref` prop, shell-copy split); `lib/awards/{parse-award-hash,pick-active-award}.ts` with unit tests (RED then GREEN); `use-active-award.ts`; `app/not-found.tsx`.
- Deviation: scroll-spy offset = first section's `scroll-margin-top` + 16px, not nav bottom. Reason: from lg the nav is a tall left column, so its bottom edge is not the docking line; the section scroll-margin-top is exactly where scrollIntoView lands a section at every breakpoint (confirmed by both reviews). Cost: sections must share one scroll-mt per breakpoint (they do).
