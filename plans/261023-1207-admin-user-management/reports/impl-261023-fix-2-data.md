# Impl report — fix round 2 (data): export chunk reorder

## Finding
- [x] Low (Accept, owner chose to fix): export chunks are separate snapshots; a reorder across a chunk boundary
  with constant total gave one duplicated + one missing row, unseen by total/length checks.
  Fix: `lib/admin/fetch-admin-users-for-export.ts:35` `seen` Set of userIds; `:49-55` a repeat -> log
  `{ offset, total }` only (no ids/names/emails) and return the same generic `error` -> route 500 "Export failed".
  No retry (KISS). Doc comment `:17-23` updated.

## Files touched
- `lib/admin/fetch-admin-users-for-export.ts` — +10 / -1 (now 61 lines)
- `tests/unit/admin-users-export-route.test.ts` — +7 / -0: new case in the "answers 500 and never a partial CSV"
  table (`:137-143`): 2300 rows, chunk at offset 1000 starts with user 1000 again (user 1001 never read), total unchanged.
  Reuses the existing assertions: 500, body "Export failed", error logged, log has no `@`/`Nguyễn`.

## TDD
- Red before fix: `expected 200 to be 500` (the route served a CSV with user 1000 twice). Green after.

## Checks
- `npx vitest run` (full): 63 files, 1054 tests passed.
- `npx tsc --noEmit`: exit 0.
- `npx eslint` on both files: exit 0.
- No build, E2E or SQL run (out of scope per dispatch).

## Issues
- None. components/** untouched.

**Status:** DONE
