---
phase: 04
title: "Track B1 — countdown math lib (ALG-001 + D001 offset)"
status: completed
feature: F001
owner: implementer
test_policy: e2e-red-first
blocked_by: [02]
---

# Phase 04 — Countdown math lib

## Context Links
- `spec/countdown-prelaunch-gate/technical-spec.md` § 4.5 (ALG-001), § 4.4 (BR-001), § 5.3 item 1 (D001)
- `functional-spec.md` FR-203, FR-204, FR-205, BR-003; `test-cases.csv` GUI/FUNCTION rows

## Overview
Priority P1 · pending. Pure, framework-free functions; RED-first with Vitest.

## Key Insights
- Recompute from absolute time every tick (no decrementing counter) → background-tab throttling is harmless.
- `formatUnit` must handle out-of-range inputs itself so the CSV value tables (Hours -1/25, Minutes -1/60, Days 31) are directly testable.

## Requirements
`lib/countdown/split-remaining-time.ts`:
- `formatUnit(value: number, max: number, clampOverflow: boolean): string` — non-finite or < 0 → `"00"`; > max → `clampOverflow ? pad2(max) : "00"`; else `pad2(floor(value))`.
- `splitRemainingTime(targetMs: number, nowMs: number): { days: string; hours: string; minutes: string; isComplete: boolean }` — `remaining = max(0, target - now)`; days via `formatUnit(d, 99, true)`, hours `(h, 23, false)`, minutes `(m, 59, false)`; `isComplete = nowMs >= targetMs` (BR-001).

`lib/countdown/server-clock-offset.ts`:
- `getClockOffsetMs(serverNowMs: number, clientNowMs: number): number` = `serverNowMs - clientNowMs`.
- `getCorrectedNowMs(offsetMs: number, clientNowMs: number): number` = `clientNowMs + offsetMs`.
(Two one-liners kept separate from ALG-001 for single responsibility; merge into the split file only if lint/size argues otherwise.)

## Architecture
Pure inputs → strings. Consumed by phase 07 (client) only; server never formats.

## Related Code Files
- Create: `lib/countdown/split-remaining-time.ts`, `lib/countdown/server-clock-offset.ts`, `tests/unit/split-remaining-time.test.ts`, `tests/unit/server-clock-offset.test.ts`

## Implementation Steps
1. Write tests first (RED, `npm test` non-zero): Days 0/9/10/31 → `00/09/10/31`; Days 150 → `99`; Hours 0/9/10/12/23 → as-is padded, -1/25 → `00`; Minutes 0/9/10/30/59 → padded, -1/60 → `00`; `splitRemainingTime` for 2d3h4m30s → `02/03/04`; 23h59m → days `00`; target == now and target < now → all `00`, `isComplete` true; target - now = 1ms → `isComplete` false; offset round-trip.
2. Implement until GREEN.

## Todo List
- [ ] RED unit tests
- [ ] implement formatUnit / splitRemainingTime
- [ ] implement offset helpers
- [ ] GREEN

## Success Criteria
- `npm test` exits 0 with the cases above; RED run recorded (non-zero) before implementation.
- `npm run lint` exits 0. Each file < 200 lines.
- Scope Contract: Changed = 2 pure modules; Impacted = phase 07 consumer; Verify = unit layer (sufficient: no I/O); Skipped = E2E (still RED until 08).

## Risk Assessment
| Risk | L | I | Mitigation |
|------|---|---|-----------|
| Float/ms rounding shows minute one early | M | L | floor on whole minutes from integer ms; test boundary at exactly 60000ms |
| Days > 99 semantics misread | L | L | BR-003: clamp 99, covered by test |

## Security Considerations
None (pure functions).

## Next Steps
Unblocks 05 and 07. Rollback: delete the two modules.

## Delivery Notes
✓ Completed. Unit tests green (48 total across all phases). Math lib implements `splitRemainingTime` and offset helpers per spec, tested with boundary cases (Days > 99, Hours -1/25, Minutes -1/60, zero time). Used by phase 07 consumer.
