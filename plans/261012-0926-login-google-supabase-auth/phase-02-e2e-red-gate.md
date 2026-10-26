---
phase: 02
title: "E2E RED gate"
status: completed
owner: tester
test_policy: e2e-red-first
blocked_by: [01]
---

# Phase 02 - E2E RED gate

## Goal
One durable spec `tests/e2e/login.spec.ts` (from `test-cases.csv`) that FAILS now for the right reason (no `/login` page), then is the exact gate for 05. Runs on the PAST server (`E2E_PAST_URL`, gate open).

## Owned files
- Create: `tests/e2e/login.spec.ts` (<= 200 lines), `reports/e2e-red-evidence.md`
- Edit: `playwright.config.ts` only (add to every webServer `env`: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399` (unreachable on purpose), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_e2e_fake`; export `E2E_SUPABASE_URL` for the spec). No real secrets.

## Selector contract (03 and 04/05 must match; header comment in the spec repeats it)
- Header `getByRole('banner')`; logo `getByRole('img', {name: 'Sun* Annual Awards 2025'})`, no link ancestor.
- Language: `getByTestId('language-selector')` = button (`aria-haspopup="listbox"`, `aria-expanded`), text `VN`, children `getByTestId('language-flag')`, `getByTestId('language-chevron')`; menu `getByRole('listbox')` with `getByRole('option', {name: 'VN'|'EN'})`.
- Hero `getByTestId('hero-key-visual')`; `getByRole('heading', {level: 1, name: 'ROOT FURTHER'})`; texts "Bắt đầu hành trình của bạn cùng SAA 2025." and "Đăng nhập để khám phá!".
- Button `getByRole('button', {name: 'LOGIN With Google'})` with `getByTestId('google-icon')`; loading: `getByTestId('login-loader')` + `toBeDisabled()`.
- Footer `getByRole('contentinfo')` text "Bản quyền thuộc về Sun* © 2025".
- Error `getByRole('alert')` text "Đăng nhập không thành công. Vui lòng thử lại.".

## Cases
1. Anon `/login` renders all regions; logo left, language right (x-position) at 1440 and 375 viewports; logo/footer/description not interactive.
2. Language default VN + flag + chevron; click opens listbox with VN/EN; `cursor: pointer`.
3. Footer stays in viewport after scrolling; hero key visual visible; button hover changes `box-shadow`.
4. Click login: `page.route('**/auth/v1/authorize**')` delays 500ms then fulfills (never hits Google); during delay button disabled + loader; request URL starts with `E2E_SUPABASE_URL`, has `provider=google` and `redirect_to=<origin>/auth/callback`.
5. `/login?error=auth_failed` shows the alert; plain `/login` shows none.
6. `/auth/callback?error=access_denied`, `/auth/callback` (no code), and `/auth/callback?error=x&next=//evil.com` all land on same-origin `/login?error=auth_failed` (no open redirect).
7. Garbage `sb-*-auth-token` cookie -> `/login` still renders (unauthenticated, no loop/500).
8. **Authenticated -> `/`: NOT E2E-testable offline** (a valid signed Supabase session cannot be forged without a real project). Covered by the `resolveAuthRedirect` unit test (01) + live checklist (05). State this in the spec header.

## Steps / Success
1. Write the spec + config edit; `npm run test:e2e -- tests/e2e/login.spec.ts`.
2. RED evidence = failing assertions caused by missing `/login` UI (404), not config/syntax/timeouts. Save exit code + failing test names to `reports/e2e-red-evidence.md`.
3. `npx tsc --noEmit` and `npm run lint` pass; the countdown spec still passes (config change must not break it).

## Risks
| Risk | L/I | Counter |
|------|-----|---------|
| RED for wrong reason (env/startup error) | M/H | read first failure message before logging evidence |
| `box-shadow`/viewport assertions flaky | M/L | assert change vs baseline, not exact values; demote to visual check (05) if still flaky |
| Spec rewritten to turn green | M/H | 05 reruns the SAME command; spec is frozen except for selector-contract bugs agreed in writing |
