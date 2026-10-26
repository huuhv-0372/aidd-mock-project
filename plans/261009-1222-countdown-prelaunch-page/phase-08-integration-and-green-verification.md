---
phase: 08
title: "Integration — /countdown page wiring + GREEN + visual validation"
status: completed
feature: F001
owner: implementer (wiring) + tester (GREEN, visual)
test_policy: e2e-red-first
blocked_by: [03, 06, 07]
---

# Phase 08 — Integration and GREEN

## Context Links
- `technical-spec.md` § 3.1 A2, § 5.3 item 2 (cacheComponents dynamic boundary); phase-02 `## RED Evidence`
- MoMorph frame: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/8PJQswPZmU

## Overview
Priority P1 · pending. Wire the route, document config, then tester reruns the exact RED command GREEN and compares against the frame.

## Key Insights
- `cacheComponents` forbids `Date.now()`/env reads in the static shell → keep `CountdownScreen` + title static and put the data read in an async child that `await connection()` inside `<Suspense>`. The shell prerenders; only the timer row is dynamic.
- Suspense fallback = empty row with the same reserved height (no `00` flash, no CLS).
- `null` start (BR-002) → `redirect('/login')`; normally unreachable because proxy already redirected.
- `app/page.tsx` not touched: gate covers `/` before launch; after launch it is out of scope.
- `.gitignore` has `.env*` → add `!.env.example` or the file never gets committed.

## Requirements
`app/countdown/page.tsx` (< 60 lines):
```tsx
export default function CountdownPage() {
  return (
    <CountdownScreen>
      <Suspense fallback={<div className="<reserved row height>" aria-hidden />}>
        <CountdownTimerSlot />
      </Suspense>
    </CountdownScreen>
  );
}
async function CountdownTimerSlot() {
  await connection();
  const target = getEventStartAt();
  if (target === null) redirect('/login');
  return <CountdownTimer target={target} serverNow={Date.now()} />;
}
```
`export const metadata = { title: 'SAA 2025 — Sự kiện sẽ bắt đầu sau' }`.
`app/layout.tsx`: `lang="vi"`, apply Vietnamese font subset / design font if phase 03 reported one; nothing else.
`.env.example`: `EVENT_START_AT=2025-12-01T09:00:00+07:00` with comment: server-only, ISO 8601 with offset, missing/invalid = gate open + error log; production via wrangler `vars` (not secret).

## Related Code Files
- Create: `app/countdown/page.tsx`, `.env.example`
- Modify: `app/layout.tsx`, `.gitignore`
- Read-only: `tests/e2e/countdown-prelaunch-gate.spec.ts`, all Track A/B files

## Implementation Steps
1. Implement page + layout + env example + gitignore.
2. `npm run lint`, `npm run build` (confirm `/countdown` is partially prerendered, no "uncached data outside Suspense" error).
3. `npm test`.
4. tester: rerun `npm run test:e2e` unchanged → GREEN; record `greenExitCode: 0`.
5. tester: visual validation vs frame at 1440 and 375 widths (one row, D002); mismatches → bounded fix back to `momorph-ui-implementer` (phase 03 files), never edit the test.
6. Handoff to reviewer; docs impact: minor (`.env.example`, future `docs/` changelog).

## Todo List
- [ ] page wiring with Suspense + connection()
- [ ] layout lang/font
- [ ] .env.example + gitignore exception
- [ ] lint/build/unit green
- [ ] E2E GREEN (same command)
- [ ] visual validation

## Success Criteria
- `npm run lint` 0, `npm run build` 0, `npm test` 0, `npm run test:e2e` 0 with the phase-02 spec byte-identical.
- Visual: no material mismatch vs MoMorph frame (background cover + overlay, title, 3 LED units, white uppercase labels).
- Scope Contract: Changed = route + layout + env docs; Impacted = all routes via proxy; Verify = full unit + full E2E (config/routing safety-critical); Skipped = Workers deploy (no OpenNext yet).

## Risk Assessment
| Risk | L | I | Mitigation |
|------|---|---|-----------|
| Build fails on dynamic access outside Suspense | M | H | pattern above; `connection()` before any read |
| Hydration mismatch | L | M | timer initial state from props only (phase 07) |
| `lang="vi"` affects other pages | L | L | only scaffold page exists |

## Security Considerations
Only `target`/`serverNow` numbers cross to client. `.env.example` holds a placeholder date, no secrets.

## Next Steps
Login feature (RISK-02), OpenNext/wrangler setup and Workers env check, ADR for time-gate fail-open (permissions.md). Rollback: delete `app/countdown/` + revert layout; proxy rollback per phase 06.

## Delivery Notes
✓ Completed. Phases 07+08 dispatched together. Integration wired: `app/countdown/page.tsx` with Suspense + `connection()` for dynamic slot; layout updated to `lang="vi"`, fonts added (Montserrat + local Digital Numbers). All 8 E2E tests green; npm test 48/48; build 0 (/countdown partial prerender). Visual validation: render-asserted at 1512/768/375px, text x-positions match Figma. Review applied fixes: key={serverNow} on CountdownTimer (M2), Suspense fallback height (L1), next/image preload (L2), aria-hidden digit spans + lang="en" labels (L3). Deferred: M3 per-isolate memo of env parse, M4 strengthen E2E coverage (307 status assert, single /login request, hydration-error guard), L6 /api exclusion when first route handler lands.
