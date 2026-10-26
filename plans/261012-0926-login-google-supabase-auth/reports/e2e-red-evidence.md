# E2E RED Gate Evidence — Phase 02 (Revised)

**Date:** 2026-10-12  
**Executor:** tester (haiku)  
**Status:** RED + GREEN (6 RED for missing /login UI; 1 GREEN for working /auth/callback)

## Scope Contract

- **Changed:** `tests/e2e/login.spec.ts` (195 lines, <200 limit), `playwright.config.ts` (env only)
- **Impacted:** countdown e2e (shares webServers/config)
- **Will verify:** login spec RED (right reason); countdown spec GREEN; tsc; lint
- **Deliberately skipped:** unit tests (no lib/ code changed in phase 02)

## Test Execution

### Command
```bash
npm run test:e2e -- tests/e2e/login.spec.ts
```

### Exit Code
`1` (failure — expected due to missing /login page)

### Test Results Summary
- **Total tests:** 7
- **Failed:** 6 (missing /login UI — expected RED)
- **Passed:** 1 (test-6: /auth/callback route works — implemented in phase 01)

### Individual Test Status

| Test ID | Test Name | Result | Reason |
|---------|-----------|--------|--------|
| 1 | test-1: anon /login renders all regions; logo/language positions; non-interactive | **RED** | Page /login does not exist (404) → banner/logo/button elements not found |
| 2 | test-2: language default VN + flag + chevron; click opens listbox | **RED** | Page /login does not exist (404) → language-selector element not found |
| 3 | test-3: footer stays in viewport after scroll; hero visible; button shadow changes | **RED** | Page /login does not exist (404) → contentinfo element not found |
| 4 | test-4: click login routes to auth/v1/authorize with correct params | **RED** | Page /login does not exist (404) → button element not found |
| 5 | test-5: /login?error shows alert; plain /login shows none | **RED** | Page /login does not exist (404) → no error alert found on 404 page (toHaveCount(0) now correct; plain /login shows 0 alerts ✓) |
| 6 | test-6: /auth/callback redirects to /login?error with same-origin check | **GREEN** | `/auth/callback` route handler implemented in phase 01 (app/auth/callback/route.ts); correctly redirects to `/login?error=auth_failed` (endpoint working, just needs /login UI to display) |
| 7 | test-7: garbage sb-*-auth-token cookie does not crash /login | **RED** | Page /login does not exist (404) → heading element not found |

## Fixes Applied (per coordinator feedback)

1. ✅ **Error alert selector:** Changed from `getByRole('alert')` to `getByRole('alert').filter({hasText: LOGIN_ERROR_MESSAGE})` to filter out Next.js built-in route announcer. Now test-5 correctly passes the "plain /login shows 0 alerts" assertion.

2. ✅ **Case 4 async/await:** Removed arbitrary `waitForTimeout(100)`, registered `waitForRequest` before click, and added proper async/await with auto-retrying assertions.

3. ✅ **Case 1 completeness:** Added assertions for h1 "ROOT FURTHER", both description texts, button + google-icon, x-position checks (logo x < language-selector x) using boundingBox, and non-interactivity checks (`toHaveCount(0)` for ancestor link/button).

4. ✅ **Case 3 viewport check:** Changed from bounding-box delta logic to `toBeInViewport()` after `window.scrollTo(0, document.body.scrollHeight)`.

5. ✅ **File size:** Reduced from 271 lines to 195 lines by extracting `gotoLogin()` helper function.

6. ✅ **waitUntil:** Changed from `networkidle` to `load` (less flaky).

7. ✅ **Type safety:** Added proper `Page` type import and removed `any` type annotation (lint passes).

## Verification Checklist

| Item | Status | Evidence |
|------|--------|----------|
| Login spec RED (right reason) | ✓ PASS | 6 of 7 tests RED due to missing /login page (element not found); failures caused by 404, not config/syntax/env errors |
| Test-6 GREEN | ✓ PASS | /auth/callback route handler works (implemented phase 01); correctly redirects per test assertions |
| Alert selector fix | ✓ PASS | test-5 now correctly handles Next.js route announcer; plain /login assertion passes (0 elements) |
| Countdown spec GREEN | ✓ PASS | 8 tests passed; config change (Supabase env vars) is non-breaking |
| TypeScript typecheck | ✓ PASS | `npx tsc --noEmit` (no errors) |
| ESLint | ✓ PASS | `npm run lint` (no errors after typing helper function) |
| File line count | ✓ PASS | 195 lines (under 200-line limit) |

## Selector Contract Status

All 7 tests implement the selector contract from phase-02:
- Header: `getByRole('banner')`
- Logo: `getByRole('img', {name: 'Sun* Annual Awards 2025'})`, no ancestor link
- Language: `getByTestId('language-selector')` with flag/chevron children, listbox menu
- Hero: `getByTestId('hero-key-visual')`, h1 'ROOT FURTHER', description texts
- Button: `getByRole('button', {name: 'LOGIN With Google'})` with google-icon
- Loading: `getByTestId('login-loader')` + button.toBeDisabled()
- Footer: `getByRole('contentinfo')`, no ancestor link, copyright text
- Error: `getByRole('alert').filter({hasText: LOGIN_ERROR_MESSAGE})`

## Next Steps

1. **Phase 03 (Track A, momorph-ui-implementer):** Implement `/login` page matching selector contract (will turn tests 1-5 GREEN)
2. **Phase 04 (Track B, implementer):** Implement `signInWithGoogle` server action and auth flow (will turn test 4 GREEN with real Supabase auth)
3. **Phase 05 (implementer + tester + user):** Re-run this spec; expect all 7 tests GREEN. Live Google login check with user's Supabase credentials.

---

**Red* values for orchestration:**

```
redTestFiles: ["tests/e2e/login.spec.ts"]
redCommand: "npm run test:e2e -- tests/e2e/login.spec.ts"
redExitCode: 1
redFailure: "6 of 7 tests RED: missing /login page UI (expected for phase 02). Test-6 GREEN: /auth/callback route works (phase 01). Failures are element-not-found (404 page), not config/syntax errors."
```
