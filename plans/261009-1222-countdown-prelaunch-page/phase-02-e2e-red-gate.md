---
phase: 02
title: "E2E RED gate (screen-level spec)"
status: completed
feature: F001
owner: tester
test_policy: e2e-red-first
blocked_by: [01]
---

# Phase 02 — E2E RED gate

## Context Links
- `plans/momorph-specs/countdown-prelaunch-page-8PJQswPZmU/test-cases.csv`, `specs.csv`
- `clarifications.md`; `spec/countdown-prelaunch-gate/technical-spec.md` § 3.2, § 5.1 (SC-001..004, US001..003)
- `spec/countdown-prelaunch-gate/screens/SCR-countdown/spec.md` § 3, § 9

## Overview
Priority P1 · pending. `tester` writes ONE durable screen-level spec and records valid RED evidence before Track A/B start.

## Key Insights
- ACCESSING rows in CSV say "Access control unspecified" → resolved by FR-601: page is public, gate ignores session. Translate those rows to "visitor (no session) sees /countdown before launch".
- Per-unit value tables (Days 0/9/10/31, Hours -1/25, Minutes -1/60) cannot be forced through a real server time → they are owned by Vitest (phase 04). E2E proves one realistic render + formatting + ticking.
- D001 offset means faking the client clock does not change the first render; `page.clock` fast-forward after load DOES advance the display. Use that for ticking and zero.

## Requirements
File: `tests/e2e/countdown-prelaunch-gate.spec.ts`. Stable selectors the UI must provide (communicated to Track A/B as contract): `getByRole('heading', { name: 'Sự kiện sẽ bắt đầu sau' })`, `getByTestId('countdown-days' | 'countdown-hours' | 'countdown-minutes')` each containing the 2-digit text, visible labels `DAYS`, `HOURS`, `MINUTES`.

| # | Server | Test | Covers |
|---|--------|------|--------|
| 1 | future | `/`, `/login`, `/does-not-exist` end at `/countdown` (assert response chain had 307) | DEC-001, FR-101, US001-1 |
| 2 | future | countdown page CSS/image requests return 200 (no redirect) | FR-101, US001-2 |
| 3 | future | title + 3 units visible, labels uppercase, values equal `splitRemainingTime`-style expectation computed at assert time from `E2E_FUTURE_TARGET_MS` and `Date.now()` (roughly `02`/`03`/`04`) <!-- Updated: Validation Session 1 - expected values computed at assert time --> | FR-201, FR-202, FR-203, US002-1 |
| 4 | future | with `timezoneId: 'America/New_York'` values identical | FR-001 |
| 5 | future | `page.clock.install` then `fastForward('01:00')` → minutes decrease by exactly one vs value read before fast-forward (computed, not literal) | FR-204, US002-2 |
| 6 | future | fast-forward past target → all `00` and a request to `/login` is issued (`waitForRequest`) | FR-103, FR-205, SC-004, US003-1 |
| 7 | past | `/countdown` → final URL `/login`, countdown heading never rendered | DEC-002, FR-102, US003-2 |
| 8 | invalid | `/` not redirected to `/countdown`; `/countdown` → `/login` | FR-002, BR-002, SC-002 |

Test 6 asserts the request, not the 404 page: the real server is still before target, so proxy sends it back (expected, D001 note).

## Architecture
Reads base URLs + `E2E_FUTURE_TARGET_MS` from env set by `playwright.config.ts`. Expected values derived from that target, not hard-coded to wall time.

## Related Code Files
- Create: `tests/e2e/countdown-prelaunch-gate.spec.ts` (< 200 lines)
- Modify/Delete: none

## Implementation Steps
1. Map CSV rows → table above; note dropped/merged rows in the report.
2. Write the spec.
3. Run `npm run test:e2e`; confirm `next build` succeeds and failure is an assertion (e.g. heading not found / URL not `/countdown`).
4. Record in this file under `## RED Evidence`: `redTestFiles`, `redCommand: npm run test:e2e`, `redExitCode`, `redFailure` (first assertion message per test).

## Todo List
- [ ] spec written from CSV + clarifications
- [ ] RED run, non-zero, assertion-caused
- [ ] RED evidence recorded

## Success Criteria
- `npm run test:e2e` exits non-zero; every failure is an assertion, none is build/config/browser-install/server-start.
- `npm run lint` exits 0 on the spec file.
- Scope Contract: Changed = one test file; Impacted = none; Verify = RED validity; Skipped = unit layer (phase 04+).

## Risk Assessment
| Risk | L | I | Mitigation |
|------|---|---|-----------|
| Test 1 accidentally "passes" because `/` already 200s | L | H | assert final URL path === `/countdown`, which the scaffold cannot satisfy |
| Flaky minute boundary in test 3 | M | M | expected values computed at assert time from `E2E_FUTURE_TARGET_MS` (Validation Session 1); retry assertion once if a minute boundary is crossed between compute and read |
| Spec weakened later to go GREEN | L | H | file is read-only after this phase; changes need tester sign-off |

## Security Considerations
Test 8 also asserts the response body does not contain the raw `EVENT_START_AT` value.

## Next Steps
Release phases 03, 04 in parallel; pass RED evidence read-only to `momorph-ui-implementer`.

## RED Evidence

**redTestFiles:** `tests/e2e/countdown-prelaunch-gate.spec.ts` (160 lines, TypeScript, no `any`)

**redCommand:** `npm run test:e2e` (runs `next build && playwright test`)

**redExitCode:** 1 (non-zero)

**Per-test Status (REVISED — Phase 06 proxy.ts now exists):**
- ✓ test-1 (PASS): routes before launch redirect to /countdown — loops `/`, `/login`, `/does-not-exist`; asserts exact pathname === '/countdown'; proxy.ts gate working
- ✓ test-2 (PASS): static assets on /countdown return 200 — collects responses, asserts ≥1 stylesheet status 200 (not redirected), fetches `/images/countdown/countdown-background.png` directly returns 200; assets not gated
- ✗ test-3 (FAIL): getByRole('heading', { name: 'Sự kiện sẽ bắt đầu sau' }) → element not found — /countdown page component not implemented
- ✗ test-4 (FAIL): assertUnitValue timeout 5000ms on countdown-days — countdown units not rendered (component missing)
- ✗ test-5 (FAIL): locator.textContent timeout 30s on countdown-minutes — countdown elements not found (component missing)
- ✗ test-6 (FAIL): assertUnitValue timeout 5000ms after page.clock.fastForward — countdown elements not rendering at 00 (component missing)
- ✓ test-7 (PASS): past server redirects /countdown to /login — final pathname === '/login'; countdown heading never rendered; proxy.ts gate working post-launch
- ✓ test-8 (PASS): invalid server root not redirected to /countdown; /countdown ends at /login with safe body — root stays at root (no redirect), /countdown redirects to /login; proxy handles invalid EVENT_START_AT gracefully

**Red Validity:** Valid. 4 failures are assertion-based (missing /countdown page UI component), not build/config/server errors. 4 tests pass (proxy.ts redirects and asset serving working). Build succeeded. Lint clean.

**Lint:** `npm run lint` exits 0 ✓

**Test Listing:** `npx playwright test --list` exits 0 ✓

## Delivery Notes
✓ Completed. Spec stable (read-only). Tester tightened tests 1/2/6/7/8 after orchestrator review. RED run verified (4 tests green on proxy + assets, 4 red on missing UI). Final GREEN run after phases 03–07: all 8/8 pass.
