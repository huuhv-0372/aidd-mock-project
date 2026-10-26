---
title: "Login screen: Google sign-in via Supabase Auth"
description: "SAA 2025 Login (MoMorph GzbNeVGJHz): Figma-exact UI, Google OAuth (PKCE) via Supabase, session refresh in proxy, E2E red-first."
status: completed
priority: P1
effort: 4h
branch: main
tags: [feature, auth, ui, momorph]
blockedBy: []
blocks: [261012-1330-user-profiles-supabase]
work_type: feature
test_policy: e2e-red-first
spec_waived: "SDD mode disabled (takumi.sddMode: off)"
created: 2026-10-12
---

# Login: Google via Supabase Auth

MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/GzbNeVGJHz (fileKey `9ypp4enmFmdK3YAFJLIu6C`, screenId `GzbNeVGJHz`).
Inputs: `clarifications.md` (authoritative), `plans/momorph-specs/login-GzbNeVGJHz/{specs,test-cases}.csv`.
Foundation phase 03 (email/password) is SUPERSEDED by this plan.

## Phases

| # | Phase | Owner | Effort | Blocked by | Status |
|---|-------|-------|--------|-----------|--------|
| 01 | [Deps + Supabase foundation + proxy session refresh](phase-01-supabase-foundation.md) | implementer (Track B) | 1h | - | completed |
| 02 | [E2E RED gate](phase-02-e2e-red-gate.md) | tester | 0.5h | 01 | completed |
| 03 | [Track A: Login UI](phase-03-track-a-login-ui.md) | momorph-ui-implementer | 1h | 02 | completed |
| 04 | [Track B: Google auth flow](phase-04-track-b-google-auth-flow.md) | implementer | 0.75h | 02 | completed |
| 05 | [Integration + GREEN + live check](phase-05-integration-green-live-check.md) | implementer + tester + user | 0.75h | 03, 04 | completed |

Order: `01 -> 02 -> (03 || 04) -> 05`. 03 and 04 own disjoint files (see each phase).

## Key decisions

- **Server action, not browser client.** `signInWithGoogle` runs `signInWithOAuth` on the server via `@supabase/ssr` server client: PKCE verifier lands in cookies, no `NEXT_PUBLIC_*` build-time inlining (E2E + Workers read runtime env), `redirectTo` origin comes from the Origin header Next already CSRF-checks. Hence no `lib/supabase/client.ts` yet (YAGNI; add when a client component needs it). No `admin.ts` (nothing needs service role).
- **No `next` param.** Post-login target is one constant (`POST_LOGIN_PATH = "/"`) in `lib/auth/constants.ts`; callback accepts only `code`/`error`, so no open-redirect surface.
- **Authenticated -> /login redirect lives in proxy** (claims already fetched there); pure decision helper `resolveAuthRedirect`, unit-tested like `resolveGateRedirect`. Keeps `/login` statically shellable under `cacheComponents` (only the `?error` banner is Suspense-wrapped).
- **Gate first**: `proxy.ts` order = countdown gate (early return) -> Supabase `getClaims()` refresh -> auth redirect. Never `getSession()`.
- **Errors**: client only ever sees "Đăng nhập không thành công. Vui lòng thử lại." (via `/login?error=auth_failed`); details `console.error` server-side.
- **Language selector**: UI + dropdown (VN/EN) only; real switching belongs to the i18n item.
- Google flow = full-page redirect (not popup); E2E asserts the Supabase authorize URL.

## Env (names verified against dashboard in phase 05)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public by design). No secret needed. E2E servers get fake values via `playwright.config.ts` (process env beats `.env.local`, so real creds never reach tests).

## Verification commands (every phase that touches code)

`npm run lint` · `npx tsc --noEmit` · `npm test` · `npm run build` · `npm run test:e2e -- tests/e2e/login.spec.ts`

## Rollback

Per phase: revert the phase commit. No DB schema/migrations; Supabase dashboard settings are additive (remove redirect URL / disable Google provider to undo). Foundation plan only gets a frontmatter + one-line note.

## Open questions

1. Skip `lib/supabase/client.ts` for now (CLAUDE.md lists three factories)? Plan says yes (YAGNI).
2. `/` is still the create-next-app placeholder; post-login lands there until the Homepage plan. OK?
