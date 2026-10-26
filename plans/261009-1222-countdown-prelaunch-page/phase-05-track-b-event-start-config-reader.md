---
phase: 05
title: "Track B2 — event-start config reader"
status: completed
feature: F001
owner: implementer
test_policy: e2e-red-first
blocked_by: [04]
---

# Phase 05 — Event-start config reader

## Context Links
- `technical-spec.md` § 4.1 (`getEventStartAt`), § 4.4 (BR-002), § 4.6; `functional-spec.md` FR-001, FR-002

## Overview
Priority P1 · pending. Single function that turns `EVENT_START_AT` into epoch ms or `null`. The only place to change when the source moves to Supabase.

## Key Insights
- Must run in proxy (Node.js runtime by default in Next 16.4; keep Web-API-only for Workers portability) and in Server Components: Web APIs only, no `fs`/`path`, no `server-only` import (proxy bundle).
- `Date.parse` accepts many formats; require an explicit offset (`Z` or `±HH:MM`) so a value without timezone is rejected instead of being read in server-local time (FR-001).
- Blocked by 04 only for sequencing in Track B (shared test conventions); no code dependency.

## Requirements
`lib/event/get-event-start-at.ts`:
- `getEventStartAt(raw: string | undefined = process.env.EVENT_START_AT): number | null`.
- Valid: matches ISO 8601 date-time with offset (`/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/`) and `Date.parse` is finite → ms.
- Missing/empty/invalid → `console.error('[countdown-gate] EVENT_START_AT missing or invalid')` (no raw value echoed) → `null`.
- `isEventLaunched(startMs: number | null, nowMs: number): boolean` = `startMs === null || nowMs >= startMs` (BR-001 + BR-002), exported from the same file so proxy and page share one rule (DRY).

## Related Code Files
- Create: `lib/event/get-event-start-at.ts`, `tests/unit/get-event-start-at.test.ts`

## Implementation Steps
1. RED tests: `2026-11-01T09:00:00+07:00` → `Date.UTC(2026,10,1,2,0,0)`; `...Z` ok; undefined/`""`/`not-a-date`/`2026-11-01T09:00:00` (no offset) → `null` and `console.error` called once (spy) without the raw value; `isEventLaunched` for null / before / equal / after.
2. Implement → GREEN.

## Todo List
- [ ] RED tests
- [ ] implement reader + isEventLaunched
- [ ] GREEN

## Success Criteria
- `npm test` exits 0; `npm run lint` exits 0.
- Scope Contract: Changed = config reader (config → safety-critical: run full `npm test`); Impacted = phases 06, 08; Verify = unit; Skipped = Workers runtime env readout (no OpenNext yet, plan.md Unresolved 2).

## Risk Assessment
| Risk | L | I | Mitigation |
|------|---|---|-----------|
| Misconfig silently unlocks site (fail-open, RISK-03) | M | M | error log with stable prefix for alerting; documented in `.env.example` (phase 08) |
| `console.error` per request floods logs | M | L | accepted: only on misconfig; prefix makes it filterable |

## Security Considerations
Server-only env (no `NEXT_PUBLIC_`). Never return or log the raw value.

## Next Steps
Unblocks 06; consumed by 08. Rollback: delete file.

## Delivery Notes
✓ Completed. Config reader `getEventStartAt` implemented; parses `EVENT_START_AT` with explicit offset validation (ISO 8601 + Z or ±HH:MM). Missing/invalid logs console.error once per isolate (defer memo per isolation for production; see inspection-verdict.json M3). Used by proxy.ts gate (phase 06) and /countdown page (phase 08).
