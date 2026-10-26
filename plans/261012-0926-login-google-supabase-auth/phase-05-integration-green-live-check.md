---
phase: 05
title: "Integration + GREEN + live check"
status: completed
owner: implementer (wiring), tester (GREEN), user (live)
test_policy: e2e-red-first
blocked_by: [03, 04]
notes: "All steps completed: wiring, E2E GREEN 15/15 x 2 (30/30), unit 104/104, lint/tsc/build green. Live check passed (commit 68eb213). Domain restriction (@sun-asterisk.com + Google provider) added later by plan 261012-1330 (callback + hd param + account rule gate)."
---

# Phase 05 - Integration, GREEN, live check

## Owned files
- Create: `app/login/page.tsx` (server; static shell; `<Suspense>` around a small async part reading `searchParams.error` -> `LoginErrorBanner message={LOGIN_ERROR_MESSAGE}` when present, any value, never reflected), `components/login/google-login-form.tsx` (`"use client"` leaf: `<form action={signInWithGoogle}>` + inner child using `useFormStatus` -> `<GoogleLoginButton pending={pending} />`).
- Why here, not 04: the leaf imports both tracks' files (03 button, 04 action), so it can only exist after both land. 03/04 files are not edited here; contract bugs go back to their owner.
- Reports: `reports/e2e-green-evidence.md`, `reports/visual-diff.md`.

## Steps
1. Wire page + leaf; page composes `LoginHeader`, `LoginHero` (children = form leaf), `LoginFooter`.
2. Tester reruns the SAME command as 02: `npm run test:e2e -- tests/e2e/login.spec.ts` -> all GREEN; also full `npm run test:e2e` (countdown spec untouched), `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Spec edits only for selector-contract bugs, logged.
3. Visual check vs MoMorph frame at 1440 and 375 (Playwright screenshot + frame image); record deltas in `reports/visual-diff.md`; fix in the owning component.
4. Live check (user, below). Then update parent plan statuses.

## Live checklist (needs real `.env.local`; gate open: `EVENT_START_AT` in the past)
1. Supabase dashboard: Authentication -> Providers -> enable Google (Client ID/Secret from Google Cloud). Authentication -> URL Configuration: add `http://localhost:3000/auth/callback` to Redirect URLs.
2. Google Cloud console: OAuth client authorized redirect URI = `https://<project-ref>.supabase.co/auth/v1/callback` (Supabase's, not the app's).
3. Dashboard: confirm key names `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (fall back to legacy anon key name if the project still issues it); fill `.env.local`.
4. `npm run dev`; open `/login`: click button -> loader -> Google consent -> back on `/` signed in (cookies `sb-*` present).
5. Revisit `/login` while signed in -> redirected to `/`. Reload `/` -> session persists (refresh works).
6. Cancel at Google consent -> back on `/login` with the error message, button usable again.
7. Redirect URL not allowlisted (temporarily remove) -> generic error, no stack/provider text on screen.
8. Production redirect URL / Site URL is a foundation-deploy concern; note in its phase 01.

## Success
E2E GREEN with same command; lint/tsc/unit/build green; live items 4-7 pass; no `getSession`, no secret in repo (`git grep -n "getSession\|SUPABASE_SECRET"` empty besides docs).

## Risks
| Risk | L/I | Counter |
|------|-----|---------|
| Button re-enables between action end and navigation (flicker) | M/L | if E2E case 4 flakes, keep a local `submitted` state in the leaf |
| `/login` forced dynamic by `searchParams` under `cacheComponents` | M/M | Suspense around the banner part; confirm `next build` route table |
| Live flow works on 3000 but countdown gate hides it | M/L | checklist header: past `EVENT_START_AT` |
| Redirect-URL mismatch (trailing slash, port) | M/M | exact `http://localhost:3000/auth/callback` |
