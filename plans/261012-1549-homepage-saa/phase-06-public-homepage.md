---
phase: 06
title: "Public homepage per spec (guest header with login button)"
status: completed
owner: tester (RED) -> implementer (Track B) || momorph-ui-implementer (Track A) -> integration
test_policy: e2e-red-first
blocked_by: [05]
---

# Phase 06 - Public homepage

## Goal
`/` is public (spec ID-0). Guests see all public content and, at the header's right: language selector + "Đăng nhập" link to /login. Signed-in users see bell + account menu (unchanged). Other non-public paths stay default-deny. Clarifications 2026-10-13 "public homepage per spec".

## Design
- Proxy: `PUBLIC_PATHS` gains `HOME_PATH` "/" (exact match). Proxy order unchanged (gate -> getClaims -> auth redirect); authed `/login` -> `/` unchanged.
- Session state for the header is read on the SERVER per request, inside `<Suspense>` so `/` keeps its static PPR shell:
  - `lib/auth/get-is-authenticated.ts`: `getIsAuthenticated(client?)` -> `Promise<boolean>` via `supabase.auth.getClaims()` (never getSession); errors -> console.error + false; unit-tested with an injected fake client (same pattern as lib/profiles/get-current-profile.ts).
  - `components/home/header-session-controls.tsx` (async server component): **DEVIATION:** `await connection()` WAS required (plan said not needed). Without it, the try/catch in `getIsAuthenticated` swallowed the cookies() prerender bailout and logged "[auth] unexpected failure" during build. `connection()` now runs before `getIsAuthenticated`. Renders `<SignedInControls signOutSlot>` (bell + account menu) or `<GuestControls>` (login link).
  - Suspense fallback = a neutral fixed-size placeholder (no flash of the wrong controls, no layout shift).
- Track A (UI, momorph-ui-implementer): refactor `HomeHeader` to take a `controls: ReactNode` slot (language selector stays always visible, static); create `components/home/login-link.tsx` ("Đăng nhập", href LOGIN_PATH from lib/auth/constants, styled with existing Homepage tokens — Figma has no design: reuse the header control visual language, 44px target, focus-visible); create `components/home/signed-in-controls.tsx` (NotificationButton + AccountMenu with signOutSlot) and `components/home/header-controls-placeholder.tsx`. Keep all existing testids/roles.
- Integration: `app/page.tsx` passes `controls={<Suspense fallback={<HeaderControlsPlaceholder/>}><HeaderSessionControls/></Suspense>}`.

## Selector contract additions
- Guest: `getByRole('banner').getByRole('link', { name: 'Đăng nhập' })` href `/login`; `notification-button`, `account-menu-button` have count 0.
- Signed in: login link count 0; bell + account button visible (existing contract).

## E2E (tester, RED first)
- tests/e2e/homepage.spec.ts: replace "anonymous / -> /login" with: guest on PAST server opens `/` (stays on `/`, banner + hero + awards + footer visible, ID-0), guest header shows language selector + "Đăng nhập" (click -> /login), no bell/account; unknown path `/does-not-exist` still -> /login; forged-key cookie on `/` -> renders as guest (no redirect, login link visible).
- tests/e2e/countdown-prelaunch-gate.spec.ts test-8: anonymous `/` on the invalid-date server is NOT redirected (stays `/`), /countdown still ends at /login.
- Signed-in cases unchanged (authed server).

## Owned files
- tester: tests/e2e/homepage.spec.ts (<=200 lines; split into homepage-guest.spec.ts if needed), tests/e2e/countdown-prelaunch-gate.spec.ts (test-8 only), reports/e2e-green-evidence.md.
- implementer (Track B): lib/auth/constants.ts (PUBLIC_PATHS), tests/unit/resolve-auth-redirect.test.ts, lib/auth/get-is-authenticated.ts, tests/unit/get-is-authenticated.test.ts.
- momorph-ui-implementer (Track A): components/home/home-header.tsx, login-link.tsx, signed-in-controls.tsx, header-controls-placeholder.tsx.
- integration (implementer, after A+B): components/home/header-session-controls.tsx, app/page.tsx.

## Success
lint, tsc, full unit, build (`/` still ◐), full e2e incl. --repeat-each=2; guest and signed-in header verified; no getSession.

## Todo List (reconciled 2026-10-13)
- [x] `/` in `PUBLIC_PATHS` (`lib/auth/constants.ts`); `resolveAuthRedirect` unit test updated
- [x] `lib/auth/get-is-authenticated.ts` (getClaims only, errors -> log + false) with unit tests
- [x] `components/home/{login-link,signed-in-controls,header-controls-placeholder,header-session-controls}.tsx`
- [x] `home-header.tsx` takes `controls` slot; language selector stays visible
- [x] `app/page.tsx` wraps `HeaderSessionControls` in `<Suspense fallback={<HeaderControlsPlaceholder/>}>`
- [x] `await connection()` added before `getIsAuthenticated` (deviation, see Design)
- [x] E2E guest cases (`tests/e2e/homepage-guest.spec.ts`, `homepage.spec.ts`) and countdown test-8 updated
- [x] `tests/e2e/homepage-account-menu.spec.ts` sign-out end state: `/` renders guest header, `/does-not-exist` -> `/login` (extra change, not in original owned files)
- [x] Docs: README, `docs/system/permissions.md`, `docs/codebase-summary.md`, F001 functional/technical spec, new `docs/project-changelog.md` (doc-writer)
- [x] Gates: lint 0, tsc 0, vitest 141/141, build ok (`/` ◐, no prerender errors), Playwright 66/66 with `--repeat-each=2`
- [x] Review: SEALED 9, 0 critical
- [ ] Human sign-off on the auth change (riskGate). Owner: hoang.van.huu
- [ ] Commit on `main` after sign-off. Owner: hoang.van.huu. Not committed yet.
- [ ] Deferred Low follow-ups (below) tracked in plan.md

## Scope drift log
- `await connection()` added: required to avoid build-time auth log noise and prerender bailout swallowing. Cost: one line, no behavior change for users.
- `tests/e2e/homepage-account-menu.spec.ts` changed: sign-out end state now expects `/` guest header. Reason: `/` is now public, so the old end state no longer holds. Cost: one spec file outside the owned list.
- New file `tests/e2e/homepage-guest.spec.ts`: the planned split from `homepage.spec.ts` (planned, not drift).

## Deferred follow-ups (Low, from review)
1. Signed-in header layout shift when the Suspense fallback resolves. Owner: momorph-ui-implementer. Done: no shift measured at 1440 and 375.
2. Invalid token logged twice (proxy + RSC). Owner: implementer. Done: one log line per invalid token.
3. `claims.sub` in the header vs proxy any-claims check. Owner: implementer. Done: identity check aligned and documented.
4. This phase file's status. Done (reconciled 2026-10-13).
5. No 375px guest E2E case. Owner: tester. Done: one guest case at 375px in `tests/e2e/homepage-guest.spec.ts` passes.

## MoMorph refs:
- Homepage SAA: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM
- Clarifications: plans/261012-1549-homepage-saa/clarifications.md
- testPolicy: e2e-red-first
