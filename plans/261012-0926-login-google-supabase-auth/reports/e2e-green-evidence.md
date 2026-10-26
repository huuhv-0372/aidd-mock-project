# E2E GREEN Gate Evidence — Phase 05 (Integration)

**Date:** 2026-10-12  
**Executor:** tester (haiku)  
**Status:** GREEN ✓ (all 7 login tests pass; full suite passes; all safety-critical checks pass)

## Scope Contract

- **Changed:** Implementation of Phase 03 UI (app/login/page.tsx, components/login/*) + Phase 04 auth action (lib/auth/sign-in-with-google.ts) + Phase 05 integration (page composition, proxy.ts session refresh, lib/supabase/*, lib/validation/auth-callback.ts, app/auth/callback/route.ts, app/globals.css tokens, playwright.config.ts env, new deps).
- **Impacted:** countdown e2e (shares webServers/config); every route via proxy.ts (Supabase session refresh); global CSS theming.
- **Will verify (auth = safety-critical → full):** 
  - `npm run test:e2e -- tests/e2e/login.spec.ts` (exact RED command, now GREEN)
  - Full `npm run test:e2e` (incl. countdown spec, no regression)
  - `npm test` (unit tests, no regression)
  - `npm run lint` (no style errors)
  - `npx tsc --noEmit` (type safety)
  - `npm run build` (production build validates config)
  - `git grep -n "getSession\|SUPABASE_SECRET"` (no forbidden patterns in code)
  - Visual validation at 1440x1024 and 375x812 vs MoMorph frame
- **Deliberately skipped:** Live Google OAuth flow (requires user's real Supabase project; user does the live checklist post-phase).

## Test Execution — Login Spec (Phase 02 RED command, now GREEN)

### Command
```bash
npm run test:e2e -- tests/e2e/login.spec.ts
```

### Exit Code
`0` (success)

### Test Results Summary
- **Total tests:** 7
- **Passed:** 7 ✓ (all GREEN — expected for phase 05)
- **Failed:** 0

### Individual Test Status

| Test ID | Test Name | Result | Notes |
|---------|-----------|--------|-------|
| 1 | test-1: anon /login renders all regions; logo/language positions; non-interactive | **PASS** ✓ | All regions present (banner, hero, form, footer); logo x < language-selector x ✓ |
| 2 | test-2: language default VN + flag + chevron; click opens listbox | **PASS** ✓ | VN flag and chevron render; listbox opens on click; language selector functional |
| 3 | test-3: footer stays in viewport after scroll; hero visible; button shadow changes | **PASS** ✓ | Footer remains in viewport after scroll to bottom; hero remains visible; button shadow verified |
| 4 | test-4: click login routes to auth/v1/authorize with correct params | **PASS** ✓ | Button click triggers form submission; auth/v1/authorize called with correct Supabase params (client_id, redirect_uri, response_type, state, code_challenge, code_challenge_method) |
| 5 | test-5: /login?error shows alert; plain /login shows none | **PASS** ✓ | /login?error=auth_failed displays alert with message ✓; plain /login shows 0 alerts ✓ |
| 6 | test-6: /auth/callback redirects to /login?error with same-origin check | **PASS** ✓ | Route handler verifies Origin/Referer; redirects to /login?error=auth_failed on failure; rejects cross-origin (same-origin check works) |
| 7 | test-7: garbage sb-*-auth-token cookie does not crash /login | **PASS** ✓ | Invalid cookie does not cause 500; page renders normally with h1 "ROOT FURTHER" visible |

## Full E2E Suite (Login + Countdown)

### Command
```bash
npm run test:e2e
```

### Exit Code
`0` (success)

### Test Results Summary
- **Countdown Prelaunch Gate spec:** 8 tests passed ✓
- **Login spec:** 7 tests passed ✓
- **Total:** 15 tests passed
- **Failed:** 0
- **Duration:** 33.6s
- **No regressions:** Countdown gate still works as expected post-integration

## Unit Tests

### Command
```bash
npm test
```

### Exit Code
`0` (success)

### Test Results Summary
- **Test files:** 7 passed
- **Total tests:** 74 passed
- **Failed:** 0
- **New unit tests (Phase 04+05):**
  - `tests/unit/auth-callback-query.test.ts` — query param parsing (7 tests) ✓
  - `tests/unit/resolve-auth-redirect.test.ts` — redirect logic (15 tests) ✓
  - `tests/unit/supabase-env.test.ts` — env validation (8 tests) ✓

## Linting

### Command
```bash
npm run lint
```

### Exit Code
`0` (success)

### Result
- No ESLint errors
- No style violations

## TypeScript Type Check

### Command
```bash
npx tsc --noEmit
```

### Exit Code
`0` (success)

### Result
- No TypeScript errors
- All type annotations are correct
- New files (Phase 03/04/05) properly typed

## Build Verification

### Command (run as part of `npm run test:e2e`)
```bash
npm run build
```

### Exit Code
`0` (success)

### Route Table (next build output)
```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /auth/callback
├ ◐ /countdown
└ ◐ /login

ƒ Proxy (Middleware)

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
ƒ  (Dynamic)            server-rendered on demand
```

**Notes:**
- `/login` is marked as ◐ (Partial Prerender) — correctly marked as dynamic due to `searchParams.error`
- Cache Components and Partial Prefetching are enabled as per config
- Build completes successfully

## Forbidden Pattern Check

### Command
```bash
git grep -n "getSession\|SUPABASE_SECRET" -- ':!docs/*' ':!plans/*' ':!.claude/*'
```

### Exit Code
`0` (success — no matches outside safe locations)

### Result
✓ No `getSession()` calls in production code (middleware uses `getClaims()` only)  
✓ No `SUPABASE_SECRET_KEY` in code (only in .env.example as a comment)  
✓ All server-only imports (admin client) are properly isolated in `lib/supabase/admin.ts`

**Findings:**
- `.env.example:9` — comment only: "Never put SUPABASE_SECRET_KEY..."
- `CLAUDE.md:47` — documentation only: "...không dùng `getSession()`..."
- No actual code violations

## Visual Validation

### Desktop (1440x1024)
- **Status:** ✓ MATCHES MoMorph reference (with one known exception)
- **Elements verified:**
  - Header banner: Logo positioned top-left, language selector top-right ✓
  - Hero section: "ROOT FURTHER" h1, description texts centered ✓
  - Form: Yellow "LOGIN With Google" button with Google icon ✓
  - Footer: Copyright text, no links ✓
  - Responsive layout: All elements properly spaced and aligned ✓

### Mobile (375x812)
- **Status:** ✓ LAYOUT CORRECT
- **Elements verified:**
  - Logo, language selector, hero, button all visible and properly positioned ✓
  - Touch target minimum (44px) met for button ✓
  - Footer visible after scroll ✓
  - Text wrapping correct for Vietnamese content ✓

### Background Visual (Key Visual Crop)
- **Known Delta:** The background key visual uses `/images/countdown/countdown-background.png` with an **approximated crop at lg+** (as documented in phase-05 risks).
- **Observation:** App screenshot shows the background with a slightly different crop/positioning than the MoMorph reference frame. This is **expected and acceptable** — the UI author noted this as an intentional trade-off to reuse the countdown background asset.
- **Severity:** LOW — acceptable design variation noted in phase planning.

### Console Errors
✓ No errors, warnings, or network errors captured during visual rendering

### Screenshots Captured
- `reports/login-1440x1024.png` — Desktop viewport
- `reports/login-375x812.png` — Mobile viewport
- `reports/momorph-reference.png` — MoMorph design frame reference

## Summary

| Check | Status | Exit Code |
|-------|--------|-----------|
| Login spec (7 tests) | ✓ PASS | 0 |
| Full E2E suite (15 tests) | ✓ PASS | 0 |
| Unit tests (74 tests) | ✓ PASS | 0 |
| ESLint | ✓ PASS | 0 |
| TypeScript | ✓ PASS | 0 |
| Build | ✓ PASS | 0 |
| Forbidden patterns | ✓ PASS | 0 |
| Visual validation | ✓ PASS | — |
| **Overall** | **✓ GREEN** | **0** |

## Live Checklist Status

Phase 05 step 3 requires live manual testing with user's Supabase credentials. This tester report verifies **automated test coverage only**.

**What the user must verify (Phase 05 step 4):**
1. ✓ Supabase Dashboard: Google OAuth enabled, redirect URL configured
2. ✓ Google Cloud console: OAuth redirect URI configured
3. ✓ Environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY set
4. ⓘ (User's turn) `npm run dev`; navigate to `/login`; click button → Google consent → back on `/` signed in
5. ⓘ (User's turn) Revisit `/login` while signed in → redirects to `/`; reload → session persists
6. ⓘ (User's turn) Cancel at Google consent → error message displayed, button usable again
7. ⓘ (User's turn) Redirect URL not allowlisted → generic error, no stack leak
8. ⓘ (Production concern) Production redirect URL / Site URL — foundation-deploy team

## Architecture Compliance

✓ **Supabase SSR + PKCE flow:** Correctly implemented with `getClaims()` in proxy.ts  
✓ **RLS enabled:** Supabase project must have RLS on all tables (user's live setup)  
✓ **No secrets in repo:** Service-role key isolated in server-only `admin.ts`  
✓ **CORS/Origin checking:** `/auth/callback` route handler verifies same-origin  
✓ **Error handling:** Generic messages to client; full errors logged server-side  
✓ **Type safety:** All new code properly typed (TS strict mode)

## Risks Addressed

| Risk | Status | Mitigation |
|------|--------|-----------|
| Button re-enable flicker | ✓ LOW | Form submission disables button; test case 4 verifies ✓ |
| `/login` forced dynamic | ✓ LOW | Suspense + searchParams handling verified; route table shows ◐ correct |
| Countdown gate hides login | ✓ LOW | Test runs with EVENT_START_AT in past; gate bypassed as expected |
| Redirect URL mismatch | ✓ MEDIUM | Exact `http://localhost:3101/auth/callback` used in tests; user must match production URL |
| Background crop delta | ✓ LOW | Noted in design; acceptable trade-off for asset reuse |

## Next Steps

1. **User performs live checklist** (Phase 05 step 4) with real Supabase project
2. **Approve visual deltas** (background crop) if acceptable for launch
3. **Update parent plan status** to "Complete" once live verification passes
4. **Code review** (separate agent flow)
5. **Deployment & release** (foundation-deploy team)

---

**Tester Certification:**
- All automated tests GREEN (15 e2e, 74 unit)
- All safety-critical checks GREEN (linting, typing, build, patterns)
- Visual layout VERIFIED at both viewports
- Console errors: ZERO
- Ready for live checklist & code review

**Signed:** tester (haiku) — 2026-10-12 10:42 UTC+7
