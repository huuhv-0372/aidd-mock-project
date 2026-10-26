# E2E GREEN evidence: Homepage SAA (phase 04)

Date: 2026-10-12 · testPolicy: e2e-red-first · MoMorph i87tDx10uM
redCommand (unchanged): `npm run test:e2e -- tests/e2e/homepage.spec.ts tests/e2e/homepage-account-menu.spec.ts`

## Verdict: NOT GREEN — 15/16 pass; 1 deterministic failure is an APP defect (not edited by tester)

| Run | Command | Exit | Result |
|-----|---------|------|--------|
| 1 | redCommand (after copy edits 1-2) | 1 | 14 passed, 2 failed (54.6s) |
| diag | `npx playwright test tests/e2e/homepage.spec.ts -g "award cards\|scrolled"` | 1 | 1 passed, 1 failed |
| 2 | redCommand (after spec edit 3) | 1 | 15 passed, 1 failed (53.3s) |
| full | `npm run test:e2e` | 1 | 30 passed, 1 failed (1.2m) — login + countdown specs all pass |
| flake | `npx playwright test <both homepage specs> --repeat-each=2` | 1 | 30 passed, 2 failed (same test both repeats) |
| unit | `npm test` | 0 | 12 files, 125 tests passed |
| lint | `npm run lint` | 0 | clean |
| types | `npx tsc --noEmit` | 0 | clean |

Build (inside test:e2e): `/` = Partial Prerender (◐), `/login` ◐, `/countdown` ◐, `/auth/callback` ƒ, Proxy ƒ. No build warnings.
Flakiness: sign-out, account menu, hover (ID-23/46/51) tests passed 2/2 repeats — no demotion needed.
Server log `getClaims failed: AuthInvalidJwtError: Invalid JWT signature` = the forged-cookie test (expected).

## Spec edits (tests/e2e/homepage.spec.ts)

| # | Before | After | Reason |
|---|--------|-------|--------|
| 1 | header comment + L119 `"Bản quyền thuộc vè Sun* © 2025"` | `"Bản quyền thuộc về Sun* © 2025"` | Pre-approved. Spec prose typo leaked into spec; Figma frame image footer reads "về". |
| 2 | L104-105 `"18h30"`, `"Nhà hát nghệ thuật quân đội"`, `"Tường thuật trực tiếp tại Group Facebook Sun* Family"` | `"26/12/2025"`, `"Âu Cơ Art Center"`, `"Tường thuật trực tiếp qua sóng Livestream"` (labels "Thời gian:", "Địa điểm:" kept) | Pre-approved. Hard-coded strings. Independently confirmed from the MoMorph frame image (node 2167:9026 PNG, hero crop) — not just mirrored from home-copy.ts. MoMorph MCP node-tree tools were not available in the tester session, so the frame raster was the independent source. |
| 3 | award-card loop checked `cards.nth(i)` on whatever page the previous iteration left | added `await page.goto(`${AUTHED}/`)` at the top of each card iteration | Test-flow defect, not a weakening: card 0's last `clickTo` leaves the page on the `/awards-information` 404, so card 1's `toHaveCount(1)` resolved 0 elements (error-context snapshot = 404 page). All assertions unchanged. Side effect: spec is 201 lines. |

"Awards Information" / "Coming soon" assertions kept (edit 3 of the brief: no change needed).

## Remaining failure — APP defect (route to momorph-ui-implementer)

Test: `homepage.spec.ts:143` "logo, footer logo, About SAA from a scrolled position -> / at scrollY 0 (ID-2..4,18..20)".
Error: `expect.poll(scrollY).toBe(0)` — Expected 0, Received 3581 (1440x900), first target (header logo).

Probe (authed server, scroll to bottom, click, wait 1.5s):

| Viewport | header logo | footer logo | header About | footer About |
|----------|-------------|-------------|--------------|--------------|
| 1440 | 3581 -> 3581 | 3581 -> 3581 | 3581 -> 3581 | 3581 -> 3581 |
| 1280 | 3846 -> 3846 | 3846 -> 3846 | 3846 -> 3846 | 3846 -> 3846 |
| 375 | 4599 -> 0* | 4599 -> 4599 | 4599 -> 0* | 4599 -> 4599 |

*375 header "0" is Playwright scrolling the non-sticky header into view before clicking, not app behaviour.

Root cause: all four are plain `next/link` `<Link href="/">` while already on `/`. An App Router same-URL soft navigation does not scroll to top (no segment change; at lg+ the sticky header — first element of the page segment — is already in the viewport, so Next's scroll-into-view is skipped). No click handler scrolls to top.
- `components/home/home-header.tsx:23` (logo Link), `:30-37` (nav Link for `HOME_PATH`)
- `components/home/home-footer.tsx:24` (logo Link), `:31` (footer link `HOME_PATH`)
Contract: clarifications "Logo (header + footer) → `/` and scroll to top"; "About SAA 2025 ... click scrolls to top". Spec is correct; not weakened.
Suggested fix (owner decides): a small `"use client"` leaf for home links whose onClick calls `window.scrollTo({ top: 0 })` when `pathname === "/"` (keep the Link/href for other pages and no-JS).

Not tested here: live Google OAuth (user checklist).

## Phase 05 (2026-10-13) - AWARDS_CEREMONY_AT countdown, RED step

Reason: clarifications 2026-10-13 supersede "reuse EVENT_START_AT"; Homepage countdown now reads server-only `AWARDS_CEREMONY_AT`, so ID-12/13/43 become reachable in E2E on the authed server (ID-41/42/60 stay unit-only).

| # | File | Before | After | Reason |
|---|------|--------|-------|--------|
| 1 | `playwright.config.ts` | authed server env: `EVENT_START_AT` (past) only | + `AWARDS_CEREMONY_AT = toIctIso(now + 2d 3h 4m 30s)` (explicit `+07:00`), computed once and re-exported as `E2E_AWARDS_CEREMONY_AT_MS` (same worker-sync pattern as `E2E_FUTURE_TARGET_MS`). Other servers untouched. | Gives the spec a deterministic future ceremony target. |
| 2 | `tests/e2e/homepage.spec.ts` countdown assertion | `countdown-*` each `toHaveText("00")`; `"Coming soon"` `toHaveCount(0)` | `"Coming soon"` visible; `countdown-days\|hours\|minutes` each match `/^\d{2}$/`; displayed total minutes within 1 minute of `floor((E2E_AWARDS_CEREMONY_AT_MS - now)/60000)`; labels DAYS/HOURS/MINUTES still visible. Test title ID list: 12,13,14,17,43 (41,42 removed). | Launched/00 state is now unit-only; ceremony is future on the authed server. Not a weakening: asserts stricter (real value + visible text). |
| 3 | spec header comment | "'Coming soon' absent after start"; "Not E2E: unit-only ID-13/43 ..." | "'Coming soon' visible while AWARDS_CEREMONY_AT is future"; "ID-12/13/43 now E2E; unit-only ID-41/42/60, 39, 40, 56, 57" | Keep contract in sync. Comment lines reflowed to hold the file at 200 lines. |

RED run (before lib/component change): see the phase 05 RED report from the tester run; component still reads `EVENT_START_AT` (past on authed server) -> `00` and no "Coming soon".

### Phase 05 GREEN follow-up (2026-10-13) - two spec-side fixes

| # | Spec line | Before | After | Reason |
|---|-----------|--------|-------|--------|
| 4 | countdown read (~L100) | `Number(await cell.innerText())` -> NaN | `Number(await cell.textContent())` | `CountdownUnit` renders each digit in its own `aria-hidden` flex span (`components/countdown/countdown-unit.tsx`), so `innerText` is "0\n2". `textContent` is exactly the 2-char value (as the component comment states). `/^\d{2}$/` and the 1-minute tolerance are unchanged. |
| 5 | scroll-to-top test (L141-156) | `expect.poll(scrollY).toBe(0)` default 5s; default 30s test timeout | `expect.poll(..., { timeout: 20_000 })`; `test.setTimeout(120_000)` | See flake diagnosis. Assertion unchanged: scrollY must still end at exactly 0. Smooth-scroll path still exercised (no reducedMotion emulation). |

Flake diagnosis (scroll-to-top, ~3/30 failures under 2 workers; failed with Received 12, 284, 4 = a stale mid-scroll read):
- NOT app scroll logic. `home-link.tsx` scrollTo({top:0, behavior:"smooth"}) worked every time: scrollY animated 3629 -> 0 in ~1s and `scrollend` fired at 0 (scroll/scrollend event log, 5 failing runs).
- Root cause: a ~6s main-thread LONGTASK (PerformanceObserver `longtask` 5807-6064ms) starting right when the scroll reaches the top. The next `page.evaluate` blocks 4.0-5.9s (`eval 4665ms`, `5865ms`), so `expect.poll` hits its 5s timeout and reports the last stale value. After the freeze the value read is 0.
- Trigger is INFERRED, not proven: the hero backdrop (`components/home/home-hero.tsx`, `/images/home/keyvisual-bg.png`, 4.47 MB source, h-[1480px] gradient layers) coming back into view in software-rendered headless Chromium with 2 browsers in parallel. Initial load also shows 100-260ms long tasks. Real GPU browsers are unlikely to freeze like this; worth a perf look (smaller source image) but not a functional defect.
- Repro: 3 failures in 30 and 2 in 40 runs of a probe copy of the test (temp spec, deleted); `--repeat-each=10` of the real test showed 1 failure (Received 284) before the fix.

Runs after the fix (both specs, `npm run test:e2e`, build inside): single run 16 passed; `--repeat-each=3` 48 passed, 0 failed, 0 flaky.

## Phase 06 (2026-10-13) - public homepage per spec, RED step

Reason: clarifications 2026-10-13 "public homepage per spec" supersede "Require login" for `/` (spec ID-0: guest sees the homepage). Guest header = language selector + "Đăng nhập" link -> /login; signed-in = bell + account menu. Other non-public paths stay default-deny.

| # | File | Before | After | Reason |
|---|------|--------|-------|--------|
| 1 | `tests/e2e/homepage.spec.ts` | "Homepage: protection" describe (anonymous `/` and `/does-not-exist` -> /login; /login + /auth/callback reachable; forged cookie `/` -> /login; authed /login -> /) | describe removed from this file (moved, see #2). Header test adds: `account-menu-button` visible; banner link "Đăng nhập" count 0. `PAST` const, `forged` param of `signIn` and ID-0 "superseded" comment removed/updated. 177 lines. | File was at exactly 200 lines; guest/protection cases split out per ownership note. Signed-in assertions otherwise unchanged and as strict. |
| 2 | `tests/e2e/homepage-guest.spec.ts` (new, 79 lines) | - | (a) PAST `/` stays on `/`: banner, h1 "ROOT FURTHER", awards-section, contentinfo visible; banner has `language-selector` and link "Đăng nhập" href `/login`; `notification-button` + `account-menu-button` count 0. (b) click "Đăng nhập" -> /login. (c) PAST `/does-not-exist` -> /login; `/login` h1 visible; `/auth/callback?error=x` -> `/login?error=auth_failed` (kept). (d) forged-key cookie on AUTHED `/` stays on `/` and renders as guest; forged cookie on `/does-not-exist` -> /login (verification-not-weakened still proven). (e) authed `/login` -> `/` (kept). | Spec ID-0 + clarification. (d) replaces old "forged -> /login" for `/`; protected-path check keeps forged-key verification strict. |
| 3 | `tests/e2e/countdown-prelaunch-gate.spec.ts` test-8 | anonymous `/` on invalid-date server -> `/login` (comment: phase 03 login-protected) | anonymous `/` stays `/` (comment: phase 06 contract, `/` public again); `/countdown` still ends at `/login` and body never contains "not-a-date" (unchanged) | Same contract change; never /countdown, never /login for `/`. |

RED run (before any app change; build of current code):
- `npm run test:e2e -- tests/e2e/homepage.spec.ts tests/e2e/homepage-account-menu.spec.ts tests/e2e/homepage-guest.spec.ts` -> exit 1; 18 tests: 15 passed, 3 failed. Failures: guest `/` (x2: anonymous stays on `/`; "Đăng nhập" link) and forged-key `/` as guest, all `expect(path).toBe("/")` Received "/login" (proxy still redirects anonymous `/`). The "no login link when signed in" assertion passes trivially (link does not exist yet).
- `npx playwright test tests/e2e/countdown-prelaunch-gate.spec.ts` -> exit 1; 8 tests: 7 passed, 1 failed (test-8, line 150: Expected "/" Received "/login").
