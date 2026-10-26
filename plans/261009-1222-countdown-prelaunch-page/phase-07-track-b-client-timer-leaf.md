---
phase: 07
title: "Track B4 — client timer leaf"
status: completed
feature: F001
owner: implementer
test_policy: e2e-red-first
blocked_by: [04, 03]
---

# Phase 07 — Client timer leaf

## Context Links
- `technical-spec.md` § 3.1 A3, § 5.3 items 1-2; `SCR-countdown/spec.md` § 5 (no `00` flash), § 9
- phase-03 integration contract (`CountdownUnit` props)

## Overview
Priority P1 · pending. The only `"use client"` file: ticks every 1000ms, renders 3 `CountdownUnit`s, `router.replace('/login')` once at zero.

## Key Insights
- Initial state computed from props `serverNow` (not `Date.now()`) → identical SSR and hydration output, correct first paint, no `00` flash, no hydration mismatch.
- Offset measured at mount (`serverNow - Date.now()`); includes response latency (sub-second), acceptable for minute display and narrows the D001 loop to that latency.
- Behavior is proven by E2E tests 3, 5, 6 (RED from phase 02). No jsdom/RTL added (YAGNI); math is unit-tested in 04.
- Blocked by 03 only for the `CountdownUnit` import to compile.

## Requirements
`components/countdown/countdown-timer.tsx`:
- Props `{ target: number; serverNow: number }` (epoch ms).
- `useState(() => splitRemainingTime(target, serverNow))`.
- `useEffect`: `offset = getClockOffsetMs(serverNow, Date.now())`; `setInterval(1000)` → `next = splitRemainingTime(target, getCorrectedNowMs(offset, Date.now()))`; set state; if `next.isComplete` → clear interval, `router.replace('/login')` (guard with a ref so it fires once). Run one tick immediately on mount. Cleanup clears interval.
- Renders a row of `CountdownUnit` with `label`/`value`/`testId` = `countdown-days|hours|minutes`.

## Related Code Files
- Create: `components/countdown/countdown-timer.tsx` (< 80 lines)

## Implementation Steps
1. Implement against phase 03/04 contracts.
2. `npm run lint`, `npm run build`.
3. Run `npm run test:e2e` to observe; tests 3-6 need page wiring (08), so RED is expected here.

## Todo List
- [ ] leaf component
- [ ] once-only redirect guard
- [ ] lint + build

## Success Criteria
- `npm run lint` 0; `npm run build` 0.
- Scope Contract: Changed = one client leaf; Impacted = bundle size (tiny); Verify = E2E in 08; Skipped = unit tests for the leaf (logic lives in tested libs).

## Risk Assessment
| Risk | L | I | Mitigation |
|------|---|---|-----------|
| Repeated `replace` while proxy bounces back | M | M | ref guard + interval cleared; remount after bounce re-evaluates with fresh serverNow |
| Interval leak on unmount | L | L | cleanup in effect |

## Security Considerations
Receives only two numbers; no env values or secrets in client bundle.

## Next Steps
Feeds 08. Rollback: delete file.

## Delivery Notes
✓ Completed. Client-side timer leaf `countdown-timer.tsx` implemented with 1s interval tick, offset sampling at mount, redirect guard with ref. Review found issue: redirected ref survives proxy bounce (same component reconciled with new serverNow); fixed via key={serverNow} on CountdownTimer in integration (phase 08 / M2 fix).
