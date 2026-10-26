## Task: 02b — data layer
**Status**: completed (DONE_WITH_CONCERNS: SQL not executed, no DB reachable by design; owner runs it in phase 03)

### Files Touched (all new, line counts)
- `supabase/migrations/20261024100000_create_admin_users.sql` (248)
- `supabase/rollbacks/20261024100000_create_admin_users_down.sql` (21)
- `supabase/verify/20261024100000_create_admin_users_verify.sql` (620; SQL verify files are not held to 200, like the earlier ones at 300-430)
- `lib/validation/admin-users.ts` (77)
- `lib/admin/admin-users-href.ts` (62), `parse-admin-user-filters.ts` (25), `get-is-admin.ts` (27), `require-admin.ts` (14), `get-admin-users.ts` (96), `get-admin-department-codes.ts` (27), `format-admin-datetime.ts` (31), `users-csv.ts` (57), `set-user-role-action.ts` (50)
- `app/[locale]/admin/users/export/route.ts` (50)
- Tests: `tests/unit/parse-admin-user-filters.test.ts` (85), `admin-users-href.test.ts` (75), `format-admin-datetime.test.ts` (24), `users-csv.test.ts` (82), `admin-users-validation.test.ts` (47), `get-admin-users.test.ts` (140), `get-is-admin.test.ts` (103, includes requireAdmin + getAdminDepartmentCodes), `set-user-role-action.test.ts` (66), `admin-users-export-route.test.ts` (106), `support/admin-user-rpc-row.ts` (19, shared RPC row fixture)
- Not touched: `admin-user-types.ts`, `routes.ts`, components/**, messages/**, admin layout/pages, proxy.ts, tests/e2e/**.

### Checks
- Typecheck: clean (`npx tsc --noEmit` exit 0, which includes the UI agent's files as they stood)
- Lint: `npx eslint` on all owned TS files exit 0
- Unit tests: 9 new files, 125 passing, 0 failing. Full suite: 63 files, 1047 passing.
- TDD: all 9 files RED first (modules missing), then GREEN. Mutation check: removing the CSV formula guard fails 8/13 CSV tests.
- Not run (per dispatch): build, E2E, any SQL.

### Acceptance Criteria
- [x] Migration: `role text not null default 'user'` + `profiles_role_known` check; `is_admin()`; `admin_list_users(8 args)` returning the 16 contract columns; `admin_set_user_role` with lock -> forbidden -> self -> invalid -> not_found -> ok; revoke public/anon, grant authenticated. One transaction, idempotent, header like the earlier migrations, first-admin SQL in the header.
- [x] Rollback: drops the 3 functions, the constraint and the column, idempotent, with a data-loss warning.
- [x] Verify: one PASS/FAIL row per check; S1-S4 structural + V1-V10 behaviour (list below); every write rolled back in a sub-block; first-admin command in the header.
- [x] zod: `adminUserRowSchema` (RPC columns), `adminUserFiltersSchema` (each field falls back on its own; page clamped to 100000), `setUserRoleInputSchema` (strict, `z.guid()`), plus `setUserRoleAnswerSchema`.
- [x] Signatures exactly as dispatched: `requireAdmin()`, `getIsAdmin(client?)`, `parseAdminUserFilters(raw)`, `getAdminUsers(filters)` (an optional `client?` second param was added, so existing calls are unaffected), `fetchAdminUsers(filters, { limit, offset }, client?)`, `getAdminDepartmentCodes()` (reads `code`), `adminUsersHref(partial)`, `adminExportHref(filters)`, `formatAdminDateTime(iso)`, `setUserRole(input)`. Checked against the UI files: they call all of them with matching shapes.
- [x] `admin-users-href.ts` is client-safe: it imports only `admin-user-types` and `routes`, and a unit test enforces that.
- [x] Route: 403 non-admin (and is_admin failure), 413 when total > 5000, 500 generic, 200 `text/csv; charset=utf-8` + `attachment; filename="users-YYYYMMDD.csv"` (Vietnam date) + `no-store` + `nosniff`. Unit-tested by calling `GET` directly.
- [x] No `err.message` reaches a client. Logs carry error objects, codes and zod field paths only, never row values (a unit test checks this). No `any`. No TODO.

### SQL self-review checklist
- search_path: `set search_path = ''` on all 3 functions. S1 checks `proconfig`.
- Schema-qualified: every table (`public.*`, `auth.users`) and every function call (`pg_catalog.*`, `public.is_admin`, `public.is_allowed_account`, `auth.uid/jwt`). Only the `extract(...)` syntax and operators are unqualified.
- No dynamic SQL: sorting is a `CASE p_sort` numeric `sort_key` plus two `CASE v_dir` order columns. S3 asserts there is no `execute`/`format(` in any body.
- Check order: list function: `is_admin()` is the first statement (0 rows, no error). Then out-of-range level or an unknown role returns 0 rows. In set_role: `pg_advisory_xact_lock(hashtext('admin_set_user_role'))` -> forbidden -> self -> invalid -> not_found -> ok. S3 checks the textual order and V9 checks the behaviour.
- Race: the lock comes before `is_admin()`. In READ COMMITTED the next statement takes a fresh snapshot after the lock, so a demotion committed by the other admin is seen and the second caller gets `forbidden`.
- Grants: `revoke execute ... from public, anon` and `grant execute ... to authenticated` for all 3. No write policy or UPDATE grant on profiles was added (V3 proves `update ... set role` and `insert` -> 42501).
- Trigger safety: the new column has a constant default that always satisfies the check. Both sign-in triggers insert only (id, email[, full_name, avatar_url]) and update only email/full_name/avatar_url/updated_at, so they never touch role. V2 runs the real trigger path (auth.users insert, google identity insert, email change) and expects role 'user' and no error. S4 confirms the 3 sign-in triggers are still enabled. CAUTION in the header: brief ACCESS EXCLUSIVE lock on profiles, so run off-peak and do one real Google sign-in afterwards.
- Definitions match clarifications: hearts = sum(hearts_awarded) on Kudos SENT; level CASE 21/10/5/1 (one place, comment points to hero-title.ts); distinct_senders excludes anonymous Kudos; badges = count of distinct opened badges; time_to_6 = max(min(opened_at)) only when the count is 6; last_sign_in_at from auth.users; row_no via row_number() before limit/offset; total/sum via `over ()`; limit clamped to 1..5000, offset >= 0; NULLs last in both directions; ties broken by created_at, id; unknown sort/dir falls back to the default order.
- Verify coverage: S1 definer/search_path/volatility/signature/grants · S2 the 16 contract columns and types · S3 check order + no dynamic SQL · S4 sign-in triggers · V1a/V1b column, default, check ('root' -> 23514, null -> 23502) · V2 trigger path · V3 writes denied · V4 is_admin (admin, user, wrong domain, non-Google, no sub, no claims, anon) · V5 list refusals + anon · V6a sent/received/hearts = kudos_my_stats for all 36 temp users · V6b level at boundaries 0/1/4/5/9/10/20/21 with anonymous Kudos not counted · V6c duplicate badges not counted, time_to_6 = max(min) (a duplicate opened after the 6th badge makes `max(opened_at)` fail) · V6d last_sign_in_at · V7a-d department/level/role filters and search (`100%_`, `VFYADM_U`, `k\s`, email, >100 chars, blank) · V8a 7 keys x asc/desc ordering, NULLs last, ties · V8b pages of 7 = full read, row_no continuous, totals fixed, past the end = 0 rows · V8c limit 0/-5/null/99999 and offset -3 · V9 every set_role answer plus immediate demotion, anon 42501 · V10 unknown sort/dir. List checks are scoped by the search `vfyadm`, so real profiles cannot change a result.

### Issues Encountered / Deviations
1. **Export href always ends in `?`.** E2E `admin-users.spec.ts:63` asserts `href` matches `/^\/admin\/users\/export\?/` even with default filters. So `adminExportHref` returns `/admin/users/export?` when there are no filters, which contradicts "omit defaults" only cosmetically. The UI renders it in a plain `<a download>` (checked), so the URL is not normalised.
2. **Default `dir` is `desc`** (first click sorts descending). `dir` is written to the URL whenever `sort` is set, including `desc`, because the E2E expects `sort=sent&dir=desc`. With no sort key, `dir` is dropped.
3. **`ADMIN_DEFAULT_FILTERS` and `normalizeAdminSearch`** are exported from `admin-users-href.ts`. They are the single source of defaults and search trimming for both the parser and the hrefs; the UI uses them too.
4. **Fake vs SQL, one harmless difference:** the fake treats any `p_dir` other than `asc` as `desc`, while the SQL treats an unknown dir as the default order. The TS always sends `asc|desc`, so the app never hits this.
5. **Empty-string filters:** the SQL treats `p_department = ''` / `p_role = ''` as "no filter" (`nullif`), the same as the fake's falsy check. A role like `root` gives 0 rows.
6. **Server Action does not pre-check `getIsAdmin()`:** `admin_set_user_role` checks it inside the DB under the lock, so an extra round trip would add nothing. `forbidden` comes back as `{ ok:false, error:"forbidden" }`.
7. **Unverified on a real DB:** the `auth.identities` insert in V2 assumes the current GoTrue schema (`id` default, `provider_id` not null). If it differs, only V2 FAILs and the detail shows the error. S2 compares `format_type` output text (for example `timestamp with time zone`). Both run in phase 03.
8. The phase file names the report `impl-261024-02b-data.md`; the dispatch path `impl-261023-02b-data.md` was used.

**Status:** DONE_WITH_CONCERNS
**Summary:** Migration/rollback/verify, zod, lib/admin, Server Action and CSV route delivered; 125 new unit tests green, tsc + eslint clean, full suite 1047 green.
**Concerns:** SQL is reviewed by hand only (no DB). Phase 03 must run the migration, the verify (all PASS) and one real Google sign-in. Items 1 and 7 are the points to watch.
