# Phase 01 — Implement Countdown UI

**Status: Complete** — all Todo List items satisfied, build passes, review findings fixed and re-verified.

## Context Links

- Functional spec: `spec/countdown-prelaunch-screen/functional-spec.md` (FR1–FR4, FR7)
- Technical spec: `spec/countdown-prelaunch-screen/technical-spec.md` (D1, D3, Component Plan)
- MoMorph source spec: `plans/momorph-specs/countdown-prelaunch-page-8PJQswPZmU/specs.csv`
- MoMorph test cases: `plans/momorph-specs/countdown-prelaunch-page-8PJQswPZmU/test-cases.csv`

## Overview

- **Priority**: High
- **Status**: Not started
- Build the static layout + live-updating countdown for the `/` route: background, title, 3
  countdown blocks (Days/Hours/Minutes), auto-updating client-side.

## Key Insights

- Target datetime comes from env var (`NEXT_PUBLIC_EVENT_START_AT`), not an API — see D1.
- Countdown must still show `00` once past target (FR5) — this phase renders that state; the
  navigation unlock itself is Phase 02 (middleware).

## Requirements

- FR1 (read target from env, Asia/Ho_Chi_Minh), FR2 (2-digit blocks, correct ranges), FR3
  (auto-update), FR4 (Days shows `00` when <1 day), FR7 (VI/EN title via `NEXT_LOCALE` cookie).

## Related Code Files

**Create:**
- `app/countdown/countdown-screen.tsx`
- `app/countdown/countdown-unit.tsx`

**Modify:**
- `app/page.tsx` — render `CountdownScreen` with env-derived `targetIso`.
- `.env.example` (create if absent) — document `NEXT_PUBLIC_EVENT_START_AT`.

## Implementation Steps

1. Add `NEXT_PUBLIC_EVENT_START_AT` to `.env.example` with a sample ISO-8601 value and a comment
   explaining the `Asia/Ho_Chi_Minh` (+07:00) assumption.
2. Build `countdown-unit.tsx`: props `{ value: number; label: string }`, renders 2-digit LED-style
   box + uppercase label, `value` padded via `String(value).padStart(2, '0')`.
3. Build `countdown-screen.tsx` (`"use client"`): prop `targetIso: string`. On mount, parse target
   once; `useEffect` with `setInterval(1000)` computing `{days, hours, minutes}` via
   `Math.max(0, ...)` from the millisecond diff; clear interval on unmount; stop recomputing once
   diff <= 0 (render fixed `00/00/00`).
4. Wire title text: read `NEXT_LOCALE` cookie (fallback `vi`) to pick "Sự kiện sẽ bắt đầu sau" vs
   "Event starts in" — no new i18n framework (YAGNI, per technical-spec).
5. Update `app/page.tsx` to a Server Component reading
   `process.env.NEXT_PUBLIC_EVENT_START_AT` and passing it to `<CountdownScreen targetIso={...} />`.
6. `npm run build` to catch compile errors (per development-rules.md).

## Todo List

- [x] `.env.example` documents the env var
- [x] `countdown-unit.tsx` renders padded 2-digit value + label
- [x] `countdown-screen.tsx` ticks every second, clamps at 0, clears interval on unmount
- [x] Title reads VI/EN from `NEXT_LOCALE` cookie (with allowlist fix applied post-review)
- [x] `app/page.tsx` wires the env var through
- [x] `npm run build` passes

## Implementation Notes

**Files Delivered:**
- `app/countdown/countdown-screen.tsx` — client countdown component with 1-second tick, clamps at 00:00:00
- `app/countdown/countdown-unit.tsx` — reusable 2-digit LED-style unit component
- `app/countdown/countdown-time.ts` — shared time-parsing helper extracted post-review to fix hydration mismatch between server and client rendering; ensures consistent target parsing across countdown-screen.tsx and phase 02 middleware
- `app/page.tsx` (modified) — root page wired with `CountdownScreen` component
- `.env.example` (created) — documents `NEXT_PUBLIC_EVENT_START_AT` with ISO-8601 sample
- `public/countdown/background.png` (added) — prelaunch background image

**Implementation Details:**
- `countdown-time.ts` extraction was a post-review correctness fix (hydration bug) and does not represent a scope change; it is an implementation detail ensuring server/client consistency as described in phase 01's "Next Steps" (see technical-spec D3).
- Title locale selection via `NEXT_LOCALE` cookie now includes an allowlist to block injection attacks.
- Countdown clamps at Days > 99 renders as `99` per the review feedback resolution.

## Success Criteria

- Visiting `/` with an env var set in the future shows correctly padded, decreasing D/H/M values.
- Past the target, all three blocks show `00` and stay static (no further decrement/negative values).

## Risk Assessment

- **Risk**: missing/malformed env var crashes the page at build or render time.
  **Mitigation**: parse defensively; invalid/missing value treated as "already past" (matches
  technical-spec fallback) rather than throwing.

## Security Considerations

- `NEXT_PUBLIC_*` env var is client-visible by design — do not reuse this variable name for
  anything secret later.

## Next Steps

- Phase 02 depends on the same env var (D1) to gate navigation — keep the parsing logic
  consistent between the page component and the middleware (consider extracting a small shared
  helper `lib/event-start.ts` if duplication becomes awkward).
