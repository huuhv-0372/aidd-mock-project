---
phase: 04
title: "Integration + GREEN + visual check"
status: completed
owner: implementer + tester
test_policy: e2e-red-first
blocked_by: [02, 03]
---

# Phase 04 - Integration, GREEN, visual check

## Goal
02 and 03 are wired together, the SAME E2E command from 01 is GREEN, Homepage is unchanged, and the page matches Figma at 1440 and 375.

## Owned files
Fix-ups only, in the owner's files: integration glue in `app/awards-information/page.tsx` / `components/awards/*` (implementer, contract mismatches only); bounded visual fixes go back to `momorph-ui-implementer` (never weaken tests); `plans/261013-1554-awards-information/{plan.md,phase-*.md}` status updates; `reports/` evidence. Spec edits only for selector-contract bugs, logged in the report.

## Steps
1. Reconcile contract: `AwardsNav` props, hook signature, `section id = slug`, selectors vs phase 01. Fix glue, do not redesign.
2. Gates: `npm run lint` · `npx tsc --noEmit` · `npm test` · `npm run build`.
3. Ports check (`netstat -ano | findstr "3100 3101 3102 3103 54398"`), kill stale servers, then `npm run test:e2e -- tests/e2e/awards-information.spec.ts` (the 01 command) GREEN; then full `npm run test:e2e` with `--repeat-each=2` (scroll/active timing, homepage regression). Re-run these yourself; do not trust a subagent "all green".
4. Visual check (tester, Playwright MCP): screenshots at 1440 and 375 vs Figma frame (layout, alternating card sides, image 336x336, sticky nav, chip bar); ID-10 hover highlight on nav items; Homepage `/` 1440/375 unchanged vs before the shell move (header, footer, widget).
5. Manual: `/awards-information` anonymous -> `/login`; Homepage award card click lands on its card with its item active; `/sun-kudos` shows the 404 page.
6. Review via reviewer template (security: no new input/auth surface, header/footer untouched logic). Docs impact: minor (note shell folder + route in `docs/` if a structure doc exists). Update plan statuses.

## Success (observable)
- Lint, tsc, unit, build exit 0. 01 command exit 0 (ID-0..9, 11..14); full E2E exit 0 twice.
- Zero console/page errors on `/awards-information` incl. unknown hash. Visual diff: no material mismatch at 1440/375; ID-10 confirmed by screenshot.
- No file over 200 lines; no stale `components/home/` imports of moved files.

## Risks
| Risk | L/I | Counter |
|------|-----|---------|
| Contract mismatch 02 vs 03 | M/M | step 1 first; fix in glue only |
| Flaky scroll E2E | M/M | `--repeat-each=2`; fix the spy lock, not the assertion |
| Homepage regression | L/H | full homepage specs + visual compare |

## Rollback
Revert 04 -> 03 -> 02 commits (see plan.md). No data/env change.

## MoMorph refs:
- Hệ thống giải: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/zFYDgyj_pD
- Clarifications: plans/261013-1554-awards-information/clarifications.md
- testPolicy: e2e-red-first

## Completion notes (2026-10-13)
- Gates: lint 0, tsc 0, vitest 153/153, build 0, full E2E 118/118 (59 x2).
- Contract fix: top-talent quantity `10 Đơn vị` -> `10 Cá nhân` (Figma wins, logged). Controller fix: `lg:self-start` on award-tile (ID-7).
- Review pass 1 SEALED 8, 0 critical. Fix round 1: chip bar keeps active chip visible below lg (RED-proven E2E); Homepage card soft-nav E2E added. "Re-measure on settle" fix reverted (made ID-9 flaky), deferred.
- Visual check: `reports/visual-check.md` (1440 matches Figma; minor: hero crop; mobile header not sticky so chip bar docks at `top-0`, per plan).
- Open: scoped re-review running; not committed (awaiting user seal).
