---
phase: 04
title: "Integration + GREEN + live check"
status: completed
owner: implementer (wiring), tester (GREEN), user (live)
test_policy: e2e-red-first
blocked_by: [02, 03]
---

# Phase 04 - Integration, GREEN, live check

## Owned files
- Edit: `app/page.tsx` (replace the create-next-app placeholder; delete its leftover imports). Server Component with `metadata.title` "SAA 2025".
- Create: `components/home/home-countdown-ticker.tsx` (`"use client"` leaf), `components/home/sign-out-form.tsx` (server component), `reports/e2e-green-evidence.md`, `reports/visual-diff.md`.
- Why here: the leaves import both tracks' files (02 components, 03 helpers/action). 02/03 files are not edited here; contract bugs go back to their owner.

## Wiring
1. `app/page.tsx` composes `HomeHeader signOutSlot={<SignOutForm />}`, `HomeHero countdown={<Suspense fallback={<HomeCountdown days="00" hours="00" minutes="00" showComingSoon={false} />}><HomeCountdownLive /></Suspense>}`, `RootFurtherContent`, `AwardsSection`, `KudosSection`, `WidgetButton`, `HomeFooter`. Page shell stays static under `cacheComponents`.
2. `HomeCountdownLive` (async server part, same file as page or `home-countdown-live.tsx` if page nears 200 lines): `await connection()` (request-time `Date.now()` is not allowed in the static shell), `const startMs = getEventStartAt()`, `serverNow = Date.now()`, renders `<HomeCountdownTicker startMs serverNow />`.
3. `HomeCountdownTicker({ startMs, serverNow })`: `useState(() => getHomeCountdown(startMs, serverNow))`; effect uses `getClockOffsetMs` / `getCorrectedNowMs` (existing), interval <= 1s recomputing from absolute times (setState only when a value changed); renders `<HomeCountdown {...state} />`. NO `router.replace` on completion (unlike `CountdownTimer`).
4. `SignOutForm`: `<form action={signOut}><SignOutButton /></form>`; no client JS.

## Steps
1. Wire as above; `npx tsc --noEmit`, `npm run lint`, `npm run build` (route table: `/` is a partial-prerender/static shell + dynamic hole, no dynamic-API error; `/login`, `/auth/callback` unchanged).
2. Tester reruns the SAME command as 01: `npm run test:e2e -- tests/e2e/homepage.spec.ts` -> all GREEN; then full `npm run test:e2e` (login + countdown specs), `npm test`. Spec edits only for selector-contract bugs, logged in `reports/e2e-green-evidence.md`.
3. Visual check vs MoMorph frame at 1440 and 375 (Playwright MCP screenshot + frame image): header, hero, Root Further, awards grid (3 / 2 cols), kudos, widget, footer; record deltas + hover states (ID-23, 46, 51) in `reports/visual-diff.md`; bounded fixes go back to `momorph-ui-implementer` without weakening tests.
4. Live check (user, below). Then mark phase + plan statuses.

## Live checklist (needs real `.env.local`; gate open: `EVENT_START_AT` in the past)
PASSED, user-confirmed 2026-10-13 with `AWARDS_CEREMONY_AT` set in `.env.local`. Evidence gate SEALED (hard stage, exit 0).

- [x] 0. User sets `AWARDS_CEREMONY_AT` in `.env.local` (and production vars) — countdown target since phase 05. Unset → `00` hidden, no "Coming soon".
- [x] 1. `npm run dev`; open `/` signed out -> redirected to `/login` (also `/awards-information` -> `/login`).
- [x] 2. Sign in with a `@sun-asterisk.com` Google account -> lands on `/` Homepage; session survives reload.
- [x] 3. Countdown shows `00 00 00`, no "Coming soon" when `AWARDS_CEREMONY_AT` is past. Optional: set it future, expect "Coming soon" + live 2-digit countdown; set `EVENT_START_AT` future, expect `/countdown` gate for everything (existing behaviour).
- [x] 4. Account menu: Profile link present (404 until built), Sign out -> `/login`; browser Back then `/` -> `/login`; `sb-*` cookies gone.
- [x] 5. Visit `/login` while signed in -> `/`.
- [x] 6. Header/footer/CTA/card links navigate to the constant routes (404 pages expected until their plans land); award card click ends at `/awards-information#<slug>`.
- [x] 7. Mobile (375) via devtools: 2-column award grid, header controls usable, 44px targets.

## Visual check result (polish pass, 2026-10-13)
- Strict Figma check (frame 1512x4480, 1440/768/375): 78 probes, 0 typography/colour deltas. 8 layout/asset deltas fixed (hero WebP, CTA height, Root Further alignment, event-info labels, Kudos logo).
- Remaining Low items and open decisions are listed in plan.md Follow-ups; details in `reports/polish-audit.md`.
- Tests after polish: e2e 62/62, repeated x2 (no spec edits).
- Decisions 2026-10-13 (user): keep corrected spelling ("Awards Information", "Coming soon"); widget button stays `bottom-6`; shared `CountdownUnit` aligned to Figma via CSS vars, `/countdown` unchanged (verified by measurement).

## Scope contract
Changed: `app/page.tsx`, two `components/home` leaves. Impacted: `/` for every visitor, proxy auth rule, Login selector move. Will verify: homepage E2E + full E2E + full unit (safety-critical auth path runs in full). Skipped: none beyond ID list deferred in phase 01.

## Success
E2E GREEN with the same command as 01; lint/tsc/unit/build green; live items 1-5 pass; no `getSession`, no secret in repo (`git grep -n "getSession\|SUPABASE_SECRET"` empty besides docs); no files > 200 lines.

## Risks
| Risk | L/I | Counter |
|------|-----|---------|
| `/` forced fully dynamic or build error from `Date.now()` under `cacheComponents` | M/M | `connection()` inside Suspense; confirm route table |
| Ticker hydration mismatch / "00" flash | M/L | same initial state on server and client from `serverNow`, as `CountdownTimer` does |
| Authed E2E fixture drift (supabase-js changes JWKS path) | L/M | fixture lives in `tests/`; failure is loud (authed cases fail), not silent |
| Live Sign out leaves session when Supabase unreachable | L/M | logged; retry; open question 2 |

## MoMorph refs:
- Homepage SAA: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM
- Clarifications: plans/261012-1549-homepage-saa/clarifications.md
- testPolicy: e2e-red-first
