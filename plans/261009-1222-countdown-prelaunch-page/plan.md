---
title: "SAA 2025 countdown prelaunch gate"
description: "Time gate in proxy.ts + /countdown page (Days/Hours/Minutes LED) that hands off to /login at zero."
status: completed
priority: P1
effort: 9.5h
branch: main
tags: [feature, momorph, countdown, proxy, e2e-red-first]
created: 2026-10-09
spec: docs/features/F001_CountdownPrelaunchGate/
system_doc_drafts: [plans/261009-1222-countdown-prelaunch-page/spec/system/permissions.md]
work_type: feature
test_policy: e2e-red-first
---

# SAA 2025 Countdown Prelaunch Gate (F001)

Before `EVENT_START_AT`, every non-static route redirects to `/countdown` (DEC-001); after it, `/countdown` redirects to `/login` (DEC-002). The page shows Days/Hours/Minutes (ALG-001, BR-003), ticks every 1s using server-clock correction (D001), and calls `router.replace('/login')` at zero (FR-103).
MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/8PJQswPZmU · Decisions: `clarifications.md` (closed).

## Phases

| # | Phase | Track / owner | Blocked by | Effort | Status |
|---|-------|---------------|------------|--------|--------|
| 01 | [Test runner setup](phase-01-test-runner-setup.md) | gate / implementer | - | 1h | completed |
| 02 | [E2E RED gate](phase-02-e2e-red-gate.md) | gate / tester | 01 | 1.5h | completed |
| 03 | [SCR-countdown UI](phase-03-track-a-scr-countdown-ui.md) | A / momorph-ui-implementer | 02 | 2h | completed |
| 04 | [Countdown math lib](phase-04-track-b-countdown-math-lib.md) | B / implementer | 02 | 1h | completed |
| 05 | [Event-start config reader](phase-05-track-b-event-start-config-reader.md) | B / implementer | 04 | 0.5h | completed |
| 06 | [proxy.ts gate](phase-06-track-b-proxy-gate.md) | B / implementer | 05 | 1h | completed |
| 07 | [Client timer leaf](phase-07-track-b-client-timer-leaf.md) | B / implementer | 04, 03 (unit contract) | 1h | completed |
| 08 | [Integration + GREEN](phase-08-integration-and-green-verification.md) | integration / implementer + tester | 03, 06, 07 | 1.5h | completed |

Track A (03) and Track B (04→05→06, 04→07) run concurrently after the RED gate. 07 only needs 03's `CountdownUnit` file to compile.

## File ownership (no overlap between parallel phases)

| Owner phase | Files |
|-------------|-------|
| 01 | `package.json`, `package-lock.json`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore` (test artifacts) |
| 02 | `tests/e2e/countdown-prelaunch-gate.spec.ts` (read-only for everyone after) |
| 03 (A) | `components/countdown/countdown-screen.tsx`, `components/countdown/countdown-unit.tsx`, `public/images/countdown/*`, `app/globals.css` |
| 04 (B) | `lib/countdown/split-remaining-time.ts`, `lib/countdown/server-clock-offset.ts`, `tests/unit/split-remaining-time.test.ts`, `tests/unit/server-clock-offset.test.ts` |
| 05 (B) | `lib/event/get-event-start-at.ts`, `tests/unit/get-event-start-at.test.ts` |
| 06 (B) | `proxy.ts`, `lib/countdown/resolve-gate-redirect.ts`, `tests/unit/resolve-gate-redirect.test.ts` |
| 07 (B) | `components/countdown/countdown-timer.tsx` |
| 08 | `app/countdown/page.tsx`, `app/layout.tsx`, `.env.example`, `.gitignore` (`!.env.example`) |

Test layout (chosen): Vitest unit tests in `tests/unit/*.test.ts`; Playwright in `tests/e2e/*.spec.ts`. No colocated tests.

## Key decisions (from spec, not re-opened)

- Config: `EVENT_START_AT` ISO 8601 with `+07:00`, server-only; missing/invalid → launched + `console.error` (BR-002, fail-open).
- Compare in epoch ms only (BR-001, FR-001). Client offset = `serverNow - Date.now()` at mount (D001).
- One row, scale down on small screens (D002). Vietnamese title only; no i18n, no Supabase, no seconds display.
- `app/page.tsx` stays untouched: gate redirects `/` before launch; after launch it is out of scope.
- Config path keeps spec's `lib/event/get-event-start-at.ts` (technical-spec 4.1) over the brief's `lib/countdown/` proposal.

## Data flow

`request → proxy.ts → isEventLaunched(getEventStartAt(), now) → resolveGateRedirect(path, launched) → 307 | next`
`/countdown page (dynamic slot) → {target, serverNow} → CountdownTimer → splitRemainingTime → CountdownUnit x3 → replace('/login') at 0`

## Done (observable)

**Delivered:** all phases completed. Temper results: `npx tsc` 0 · `npm run lint` 0 · `npm test` 48/48 ✓ · `npm run test:e2e` 8/8 ✓ (same spec as RED run; test-1,2,7,8 green early, 3–6 red until UI landed, then all green) · `npm run build` 0, /countdown partial prerender · review 8/10, 0 critical · visual render-asserted at 1512/768/375px.

## Unresolved

1. `/login` 404s until the Login feature ships (RISK-02) — E2E asserts URL only, not page content.
2. OpenNext/wrangler not installed yet; Workers env readout (tech-spec 5.3 item 4) verified in a later deploy task, not here.
3. Proxy ordering with future CSP nonce / Supabase `getClaims()` (5.3 item 3): gate runs first and returns early; composition decided when those land.
4. app/fonts/digital-numbers-font-provenance.md recorded; upstream LICENSE cross-check pending.

## Validation
Cleared during implementation: E2E value expectations computed at assert time (not hard-coded); CLAUDE.md proxy.ts runtime claim corrected (Node.js by default per Next 16.4); Login 404 accepted as RISK-02 (no stub pages). All changes applied and verified.
