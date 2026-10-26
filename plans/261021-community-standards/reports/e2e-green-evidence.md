# E2E GREEN evidence: /tieu-chuan-chung (phase 03, fix-round-1)

**Status: GREEN** for the automated gate (lint, typecheck, unit, full E2E, repeat-each=3). The visual check still has open items, listed in `reports/visual-check.md` → "Fix round 1 verification". Raw facts: `evidence/raw-temper-runs.json`. Validated artifact: `evidence/temper-results.json` (built by `buildTemperResults` from the final runs only).

## Commands (real exit codes, fix-round-1 tree)

| Command | Exit | Result |
|---|---|---|
| `npm run lint` | 0 | eslint clean |
| `npx tsc --noEmit` | 0 | no type errors |
| `npx vitest run` | 0 | 40 files, 562 passed, 0 failed |
| `npm run test:e2e` | 0 | next build OK; Playwright 218 passed, 0 failed, 0 flaky (326s) |
| `npx playwright test tests/e2e/standards.spec.ts --repeat-each=3` | 0 | 30 passed (10 cases x 3), 0 failed, 0 flaky (58s) |

## What changed since the first run

- Spec: `tests/e2e/standards.spec.ts:44` `pageHeading(page, name = PAGE_TITLE)`. The EN case (line 138) now asserts `pageHeading(page, EN_PAGE_TITLE)` has count 1. This was the cause of the earlier single failure: the helper matched the VI name only. No assertion was weakened.
- Product fixes (controller/implementer): hero artwork and Cover re-tuned, content wrapper `relative`, intro `max-w-[1092px]`, footer `xl:gap-x-0`.

## Ports and cleanup

Ports 3100-3103 and 54398/54399 were free before the runs. The visual server on 3101 was stopped afterwards (PID 24320). The ports are released. Nothing was committed.
