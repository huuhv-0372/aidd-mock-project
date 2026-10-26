# Phase 01 — E2E RED (tester hand-back, persisted by controller 2026-10-23)

**Status:** DONE_WITH_CONCERNS

## Files
- Contract: `tests/e2e/support/admin-users-contract.ts` (143) — testids, columns, URL params, vi/en copy (Figma text plain, the rest marked "not from Figma").
- Fake: `admin-users-dataset.mjs` (94; 44 people + caller = 45 rows → pages 20/20/5, fake emails, non-v4 ids), `admin-users-fake.mjs` (160; `adminRpc` is_admin / admin_list_users / admin_set_user_role; `adminControl` `/__admin-mode`, `/__admin-role-fail`, `/__admin-role-log`, `/__admin-list-fail`; one world per caller sub), `admin-users-helpers.ts` (93).
- Specs: `admin-users.spec.ts` (ca 1-3 + list-read failure, 142), `-sort` (ca 4, 69), `-filter` (ca 5, 86), `-pagination` (ca 6, 52), `-actions` (ca 7, 93), `-export` (ca 8, 59), `-shell` (ca 9-11, 78).
- Modified: `fake-supabase-server.mjs` +5 lines (import + RPC dispatch + control dispatch). Controller verified the diff.

## Testids
`admin-header`, `admin-header-label`, `admin-tab-{overview|review|user|settings}`, `admin-title`, `admin-export`, `admin-filter-{unit|level|role}`, `admin-filter-{name}-listbox`, `admin-filter-{name}-option-{value|all}`, `admin-search`, `admin-search-submit`, `admin-table-scroll`, `admin-table`, `admin-th-{col}`, `admin-sort-{col}`, `admin-sum-{sent|received}`, `admin-row` (+`data-user-id`), `admin-cell-{col}` (+`-date`/`-time` for time6 and last-login), `admin-row-actions`, `admin-role-menu`, `admin-role-item`, `admin-role-dialog`, `admin-role-confirm`, `admin-role-cancel`, `admin-role-error`, `admin-status-toast`, `admin-error`, `admin-pagination`, `admin-total`, `admin-page-prev|next|{n}`, `admin-empty`, `admin-empty-reset`, `admin-empty-first-page`, `admin-footer`, `admin-account-dashboard`.

## Runs
- `npm run build` → exit 1: compile, TypeScript and static generation passed; stopped on the Next 16.4.0 `SecurityFatalError` advisory (known; a retry passes — see edit-kudo). RED used that `.next`.
- **RED:** `npx playwright test tests/e2e/admin-users` → **exit 1, 37 failed / 2 passed / 39** (11.4 min).
  - The 2 passes are the guest → `/login` cases (existing default-deny gate), not RED assertions.
  - Samples: ca 1 `Expected: 403, Received: 404`; ca 7 timeout waiting for `admin-row-actions`; ca 8 no download event; ca 4 precondition "some rows have no date" (0 rows); ca 3 `element(s) not found`.
- **Regression:** `npx playwright test tests/e2e/homepage-account-menu.spec.ts tests/e2e/error-pages.spec.ts tests/e2e/profile.spec.ts` → 49 passed, 0 failed (exit line lost; inferred).
- Ports 3100-3103 and 54398 free afterwards (controller re-checked).

## Concerns
1. Build advisory gate (Next 16.4.0) — owner decision, retry passes.
2. Out-of-range `page` returns no rows, so no `total_count`/sums: ca 6 asserts only the empty state + link to page 1. Accepted by controller.
3. Not expressible here: `self` refusal from the RPC (UI hides it → unit + SQL), 5000-row 413 (unit/route), departments GET shape (fake reuses DEPARTMENTS; 02b must read `code`).
4. Extra test: list-read failure alert (`admin-error`, `COPY.listFailed`).
5. Fixture facts hard-wired: unit count 15 (`unitCevc2`), level-4 count 4, admin count 2.
