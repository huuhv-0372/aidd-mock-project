---
title: "Awards Information screen (Hệ thống giải, Figma-exact)"
description: "SAA 2025 Awards Information (MoMorph zFYDgyj_pD): shared site shell, sticky scroll-spy nav, 6 award cards, Kudos block, 404 page, E2E red-first."
status: completed
priority: P2
effort: 3h
branch: main
tags: [feature, ui, momorph]
blockedBy: []
blocks: []
created: 2026-10-13
work_type: feature
test_policy: e2e-red-first
spec_waived: "SDD mode disabled (takumi.sddMode: off)"
---

# Awards Information

MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/zFYDgyj_pD (fileKey `9ypp4enmFmdK3YAFJLIu6C`, screenId `zFYDgyj_pD`, Figma node 313:8436).
Inputs: `clarifications.md` (AUTHORITATIVE, gate done), `plans/momorph-specs/he-thong-giai-zFYDgyj_pD/{specs,test-cases}.csv`.
Related (not a blocker): `plans/261012-1549-homepage-saa` (functionally done, committed). Its E2E infra (4th "authed" server on 3103 + test-only fake Supabase) is reused as-is; Homepage must stay visually unchanged.

## Phases

| # | Phase | Owner | Effort | Blocked by | Status |
|---|-------|-------|--------|-----------|--------|
| 01 | [E2E RED gate](phase-01-e2e-red-gate.md) | tester | 0.75h | - | completed (RED 23/24, see reports/e2e-red-evidence.md) |
| 02 | [Track A: Awards UI (presentational)](phase-02-track-a-awards-ui.md) | momorph-ui-implementer | 1h | 01 | completed (hero keyvisual approximated, open) |
| 03 | [Track B: shared shell, nav behavior, 404](phase-03-track-b-shell-nav-not-found.md) | implementer | 0.75h | 01 | completed (scroll-spy offset deviation) |
| 04 | [Integration + GREEN + visual check](phase-04-integration-green-visual.md) | implementer + tester | 0.5h | 02, 03 | completed (gates green; scoped re-review running; uncommitted) |

## Status notes (2026-10-13)

- Gates: lint 0, tsc 0, vitest 153/153, build 0, full E2E 118/118 (59 x2). Uncommitted; awaiting user seal.
- Review pass 1 SEALED 8, 0 critical. Fix round 1 applied; scoped re-review in progress.
- Deviations: top-talent quantity `10 Đơn vị` -> `10 Cá nhân` (Figma wins); scroll-spy offset = first section `scroll-margin-top` + 16px, not nav bottom.
- Next moves: (1) DONE: committed 440601c (refactor shell) + 2eccaa8 (feat) on main, 2026-10-14. (2) Finish scoped re-review, owner controller, done = verdict recorded in `reports/`. (3) DONE 2026-10-14: hero = exact Figma 2x export via Figma MCP (pixel diff 4.69 vs 19.00 before). (4) DONE 2026-10-14: Deferred review finding: active item lags after a user interrupts a smooth scroll (use-active-award.ts settle does not re-measure). An rAF re-measure made ID-9 flaky (1/10) and was reverted; revisit with settle+measure on wheel/touchstart. Owner implementer, not blocking. Fixed by measuring on every scroll frame (rAF) instead of IntersectionObserver and ending the select pause only on a scrollend that leaves the target at rest (or the 1s fallback); ID-9 stable 10/10. (2) is done: scoped re-review SEALED.

Order: `01 -> (02 || 03) -> 04`. 02 and 03 own disjoint FILES (see each phase). Soft dep: 02 imports the hook + shell paths that 03 creates (names fixed below), so 02's final `tsc`/build waits for 03's step 1-2 (shell move + hook); 03 should do those first.

## Key decisions

- **Route** `/awards-information` (`app/awards-information/page.tsx`). Login required via existing default-deny proxy (`PUBLIC_PATHS` unchanged, no proxy/auth edit). Test cases ID-0/1 (`/he-thong-giai`) run against `/awards-information`.
- **Shell extraction** (CLAUDE.md "second use"): header, footer, widget button and everything they import move `components/home/ -> components/site-shell/` via `git mv` (kebab-case, no behavior change). `HomeHeader` becomes `SiteHeader({ controls, activeHref })`, the hard-coded `ACTIVE_HREF` goes away; Homepage passes `HOME_PATH`, this page passes `AWARDS_INFORMATION_PATH`. `KudosSection` + `KUDOS_COPY` move too (Figma block D1 is the same card; UI agent only forks if MCP data differs).
- **Nav behavior** = pure logic (`lib/awards/*`, unit-tested in vitest node env) + one client hook `useActiveAward` + one client leaf `AwardsNav`. Everything else stays server components.
- **Section ids = `AWARD_SLUGS`** (`<section id={slug}>`), so Homepage links `/awards-information#<slug>` already land correctly. Unknown hash: no error, first item stays active (ID-13).
- **404**: `app/not-found.tsx`, SAA-styled, shared by every unbuilt route (covers ID-14: `/sun-kudos` is not built).
- **Responsive**: header is sticky only from `lg`; below `lg` the chip bar is `sticky top-0`, from `lg` the left nav sticks below the header. Section `scroll-mt-*` must clear whichever sticky bars apply.

## Integration contract (fixed, 02/03/04 depend on it)

- `components/awards/use-active-award.ts` (03): `useActiveAward(slugs: readonly AwardSlug[]): { activeSlug: AwardSlug; select: (slug: AwardSlug) => void }`. Initial = first slug (SSR-safe); on mount a valid `#slug` activates + scrolls it; `select` = smooth scroll (instant under `prefers-reduced-motion`) + set hash + set active, spy paused until scroll settles.
- `components/awards/awards-nav.tsx` (02, `"use client"` leaf): `AwardsNav({ items: readonly { slug: AwardSlug; label: string }[] })`, calls the hook, renders `<a href="#slug">` per item; click -> `preventDefault` + `select`.
- Pure logic (03): `lib/awards/parse-award-hash.ts` (`parseAwardHash(hash): AwardSlug | null`), `lib/awards/pick-active-award.ts` (`pickActiveAward(...)`).
- Selector contract (written by 01, read-only for 02/03): see phase 01.

## Test matrix

- Unit (03, RED-first): `parseAwardHash`, `pickActiveAward`.
- E2E (01 -> 04, authed server + past server): ID-0..9, 11..14. Visual check (04): ID-10 hover, 1440/375 frame diff, ID-3/7/8 layout/imagery.

## Verification commands (every code phase)

`npm run lint` · `npx tsc --noEmit` · `npm test` · `npm run build` · `npm run test:e2e -- tests/e2e/awards-information.spec.ts`. Full `npm run test:e2e` in 03 and 04 (header/shell is shared with Homepage; safety scope: no auth change, so unit scope = touched logic only).
Before any E2E: check `netstat -ano | findstr "3100 3101 3102 3103 54398"` for stale `next start`; agents kill servers they start (stale servers poison runs).

## Rollback

Revert the phase commits. No DB/schema/env change. 03's shell move is pure renames plus one prop; reverting 03 alone breaks 02's imports, so revert 04 -> 03 -> 02 in that order (or all together).

## Risks (summary)

| Risk | L/I | Counter |
|------|-----|---------|
| Shell move regresses Homepage | M/H | `git mv` only, prop added; full E2E (homepage*.spec) + unit in 03 and 04 |
| Scroll-spy flicker flips active during smooth scroll (ID-9/11 flaky) | M/M | spy paused until scroll settles; E2E polls `aria-current`, never fixed sleeps |
| Figma copy/assets differ from spec prose | M/L | copy only from Figma node tree; award assets reused else exported |
| Figma asset export 500 | M/L | approximate + log open item (as in Login) |

## MoMorph refs:
- Hệ thống giải: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/zFYDgyj_pD
- Clarifications: plans/261013-1554-awards-information/clarifications.md
- testPolicy: e2e-red-first
