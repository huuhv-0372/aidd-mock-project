---
phase: 04
title: "Track B: Google auth flow (action + callback)"
status: completed
owner: implementer (Track B)
test_policy: e2e-red-first
blocked_by: [02]
---

# Phase 04 - Google auth flow

## Goal
Server action starts Google OAuth (PKCE); callback route exchanges the code and redirects. No UI files.

## Choice: server action (not browser `signInWithOAuth`)
Server action keeps the PKCE verifier in `@supabase/ssr` cookies, needs no build-time `NEXT_PUBLIC_*` inlining (E2E uses fake runtime env; Workers use runtime vars), and gets `redirectTo` from the Origin header that Next already validates for actions. Cost: one redirect hop vs client call; irrelevant here.

## Data flow
1. `<form action={signInWithGoogle}>` POST -> `lib/auth/sign-in-with-google.ts` (`"use server"`): origin from `headers().get('origin')`; `supabase.auth.signInWithOAuth({provider:'google', options:{redirectTo: origin + CALLBACK_PATH}})` -> `data.url` -> `redirect(data.url)` (external; verifier cookie set before redirect).
2. Any failure (no origin, env invalid, SDK error, no url): `console.error(detail)`, `redirect(LOGIN_PATH?error=auth_failed)`. Call `redirect` outside try/catch (it throws).
3. Google -> Supabase -> `GET /auth/callback?code=...` (or `?error=...` on cancel/deny) -> `app/auth/callback/route.ts`: zod-parse query (`code` string 1..512 optional, `error` optional); `error` or no code -> `/login?error=auth_failed`; else `exchangeCodeForSession(code)`; fail -> same error redirect (log detail); success -> `POST_LOGIN_PATH`.
4. All redirects built as `new URL(path, request.nextUrl.origin)` with constant paths only; `next` and any other param ignored.

## Owned files
- Create: `lib/auth/sign-in-with-google.ts`, `lib/validation/auth-callback.ts`, `app/auth/callback/route.ts`
- Not touched: `proxy.ts`/`lib/supabase/*`/`lib/auth/constants.ts` (01), `components/login/*` (03), `app/login/page.tsx` + form leaf (05). Callback is a GET driven by Supabase's cross-site redirect (no Origin header), so `verify-origin` does not apply; the PKCE verifier cookie is the CSRF binding.

## Steps
1. Callback: unit-test the query parser (`tests/unit/auth-callback-query.test.ts`: valid code, missing, oversize, error present, extra `next` stripped); implement.
2. Action: implement; exercised by E2E case 4 (phase 02) in 05 since it needs the UI.
3. Verify `/auth/callback` is dynamic in `next build` output (reads cookies/query).

## Success
`npm run lint`, `npm test`, `npx tsc --noEmit`, `npm run build` green. Phase-02 cases 6 (callback redirects) pass once run against a build; case 4 completes in 05.

## Risks
| Risk | L/I | Counter |
|------|-----|---------|
| Open redirect via `next`/`redirect_to` | L/H | no such param is read; constant targets; case 6 asserts it |
| Verifier cookie missing at callback (domain/SameSite mismatch, or user opens callback in another browser) | M/M | generic error redirect; live check (05) on real flow |
| Origin header absent (old client) | L/L | falls to generic error; no Host-header fallback (spoofable) |
| Raw provider error leaks | L/M | only constant message reaches the client |
| `redirect()` swallowed by try/catch | M/M | structure code so redirects are outside try |
