---
phase: 01
title: "Deps + Supabase foundation + proxy session refresh"
status: completed
owner: implementer (Track B)
test_policy: e2e-red-first (unit TDD for pure helpers; E2E gate is phase 02)
blocked_by: []
---

# Phase 01 - Supabase foundation

## Goal
Install deps, add server-side Supabase plumbing, compose session refresh + authenticated redirect into `proxy.ts` after the gate.

## Data flow
request -> gate (`resolveGateRedirect`, early return) -> `updateSession(request)`: server client over request cookies, `getClaims()` (refreshes + rewrites cookies on response) -> `{response, isAuthenticated}` -> `resolveAuthRedirect(path, isAuthenticated)` -> redirect `/` (copy refreshed cookies onto redirect) or pass through.
Supabase env missing/invalid: `console.error`, skip refresh, treat as unauthenticated (never crash every route).

## Owned files
- Create: `lib/supabase/env.ts` (zod-validated URL + publishable key, throws with generic message), `lib/supabase/server.ts` (`createServerClient` over `cookies()`), `lib/supabase/update-session.ts` (proxy helper), `lib/auth/constants.ts` (`LOGIN_PATH`, `CALLBACK_PATH`, `POST_LOGIN_PATH="/"`, `LOGIN_ERROR_PARAM`, `LOGIN_ERROR_MESSAGE`), `lib/auth/resolve-auth-redirect.ts`, `tests/unit/resolve-auth-redirect.test.ts`, `tests/unit/supabase-env.test.ts`
- Edit: `proxy.ts`, `package.json`, `package-lock.json`, `.env.example`
- Not touched: `playwright.config.ts` (02), UI (03), `app/auth/*` + `lib/auth/sign-in-with-google.ts` (04).

## Steps
1. `npm i @supabase/ssr @supabase/supabase-js zod` (check current docs via `tkm:search-docs`; confirm `auth.getClaims()` exists in installed version).
2. Unit tests first: `resolveAuthRedirect` (`/login` + authed -> `/`; `/login` + anon -> null; other paths -> null; trailing slash `/login/`), env schema (missing, non-URL, empty key).
3. Implement helpers, then `update-session.ts` following the `@supabase/ssr` Next.js pattern (setAll writes request + response cookies; return the response object).
4. Make `proxy` async; keep the gate block and matcher untouched; add refresh + auth redirect after it. Web APIs only.
5. `.env.example`: add the two keys with comments (public by design; verify names on dashboard).

## Success
- `npm run lint`, `npx tsc --noEmit`, `npm test` green; `npm run build` green (no env needed at build).
- Existing `countdown-prelaunch-gate.spec.ts` still green (gate behaviour unchanged).

## Risks
| Risk | L/I | Counter |
|------|-----|---------|
| Refresh cookies lost on redirect response | M/H | copy `response.cookies` onto the redirect; covered by live check (05) |
| Proxy crash when env absent (e.g. foundation servers) | M/M | try/catch -> log + pass through |
| `getSession()` creeping in | L/H | grep gate in review: no `getSession` in repo |
| New dep bloats Worker bundle | L/L | 3 small deps; foundation deploy phase measures size |

## Security
No secrets in repo; only publishable key, never `SUPABASE_SECRET_KEY` here. Errors logged server-side, never returned.
