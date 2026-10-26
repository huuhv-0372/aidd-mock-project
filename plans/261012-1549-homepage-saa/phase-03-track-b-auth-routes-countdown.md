---
phase: 03
title: "Track B: login protection, sign-out, routes, countdown logic"
status: completed
owner: implementer (Track B)
test_policy: e2e-red-first
blocked_by: [01]
---

# Phase 03 - Behavior and backend

## Goal
Pure, unit-tested logic and one server action. No UI files. Safety-critical (auth/proxy): run full unit + full E2E at the end.

## Data flow
1. **Protection:** request -> `proxy.ts` (unchanged order) gate -> `updateSession` (`getClaims()`) -> `resolveAuthRedirect(pathname, isAuthenticated)`:
   - normalise trailing slashes (existing);
   - authenticated + `/login` -> `POST_LOGIN_PATH` (existing);
   - unauthenticated + path not in `PUBLIC_PATHS` -> `LOGIN_PATH`; else null.
   - `PUBLIC_PATHS = ["/login", "/auth/callback", "/countdown"]` exact match (no prefix match: `/login/x`, `/loginx` are protected). `/countdown` must stay public: pre-launch the gate sends every visitor there, and anonymous users must see it. Post-launch the gate already bounces it to `/login`. Return type widens to `"/" | "/login" | null`; `proxy.ts` already calls it with this signature, so only verify (no edit expected). Redirect still goes through `redirectWithSession` (keeps refreshed cookies, no-store).
   - Loop check: `/login` is public, so unauth -> `/login` never loops; authed `/login` -> `/` and `/` is allowed for authed.
2. **Sign out:** `<form action={signOut}>` POST -> `lib/auth/sign-out.ts` (`"use server"`): `createSupabaseServerClient()` -> `supabase.auth.signOut({ scope: "local" })`; any error or throw -> `console.error("[sign-out] ...", err)` (never returned to client); then `redirect(LOGIN_PATH)` OUTSIDE the try/catch. Next's automatic Origin/Host check covers CSRF for actions. Returns `Promise<never>`.
3. **Routes:** `lib/navigation/routes.ts` exports `HOME_PATH="/"`, `AWARDS_INFORMATION_PATH="/awards-information"`, `SUN_KUDOS_PATH="/sun-kudos"`, `STANDARDS_PATH="/tieu-chuan-chung"`, `PROFILE_PATH="/profile"`, `AWARD_SLUGS` (`as const`: `top-talent, top-project, top-project-leader, best-manager, signature-2025-creator, mvp`), `type AwardSlug`, `awardHref(slug) => \`${AWARDS_INFORMATION_PATH}#${slug}\``. **Land this file first (step 1)**: phase 02 imports it.
4. **Countdown:** `lib/countdown/get-home-countdown.ts`: `getHomeCountdown(startMs: number | null, nowMs: number) => { days, hours, minutes, showComingSoon }`. `startMs === null` or non-finite or `nowMs >= startMs` -> `00/00/00`, `showComingSoon=false`; else `splitRemainingTime` values with `showComingSoon=true`. Reuses `splitRemainingTime`; no redirect, no side effects. Invalid env is logged once by `getEventStartAt` (already), not here.

## Owned files
- Create: `lib/navigation/routes.ts`, `lib/countdown/get-home-countdown.ts`, `lib/auth/sign-out.ts`, `tests/unit/routes.test.ts`, `tests/unit/get-home-countdown.test.ts`
- Edit: `lib/auth/resolve-auth-redirect.ts`, `lib/auth/constants.ts` (add `PUBLIC_PATHS` only), `tests/unit/resolve-auth-redirect.test.ts`
- Not touched: `proxy.ts` (verify only), `components/**`, `app/**`, `tests/e2e/**`.

## Steps (RED-first for logic)
1. Create `routes.ts` + `routes.test.ts` (6 distinct slugs, kebab-case, `awardHref` format, constants start with `/`).
2. Rewrite `resolve-auth-redirect.test.ts` first: the old case "`/` is never redirected for anonymous" becomes the deliberate contract change. Table: anonymous `/`, `/x`, `/awards-information`, `/login/x`, `/loginx`, `//` -> `/login`; anonymous `/login`, `/login/`, `/auth/callback`, `/countdown`, `/countdown/` -> null; authenticated `/login`, `/login/`, `/login//` -> `/`; authenticated `/`, `/awards-information`, `/countdown`, `/auth/callback` -> null. See it fail, then implement.
3. `get-home-countdown.test.ts` first: 2d3h4m before start; 1 minute later the minutes drop by 1 (ID-39); single digits padded `05/09` (ID-40); `nowMs === startMs` and after -> 00 + hidden (ID-41/42); before start -> label shown (ID-13/43); `null`, `NaN` -> 00 + hidden, no throw (ID-60); >99 days clamps to 99 (existing behaviour). Implement.
4. `sign-out.ts` (exercised by E2E case 7 in 04; no mocking harness for `next/navigation` exists, so the error-logging branch is covered by review + live check, stated honestly).
5. `npm run lint`, `npx tsc --noEmit`, `npm test` (full), `npm run build`; E2E protection cases of `homepage.spec.ts` (case 1) now pass; countdown + login specs still pass.

## Success
Unit green; E2E case 1 (anonymous `/` -> `/login`, `/login` + callback reachable) green; `git grep -n "getSession"` empty; proxy order unchanged.

## Risks
| Risk | L/I | Counter |
|------|-----|---------|
| `/countdown` blocked pre-launch (redirect loop to `/login`) | M/H | in `PUBLIC_PATHS` + unit rows + existing countdown E2E on the future server |
| New public route later forgotten (default-deny blocks it) | M/L | single `PUBLIC_PATHS` constant, documented in `constants.ts`; failure mode is safe (login wall), not a leak |
| Transient `getClaims()` failure logs user out of UX | L/M | falls to `/login` (no loop); already logged by `updateSession` |
| Sign out network failure leaves cookies set | L/M | logged; user lands on `/login` then bounces to `/` while authed; accepted, noted in open questions |
| `redirect()` swallowed by try/catch | M/M | redirect after the try block |

## MoMorph refs:
- Homepage SAA: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM
- Clarifications: plans/261012-1549-homepage-saa/clarifications.md
- testPolicy: e2e-red-first
