## Task: polish 1 — data
**Status**: partial (DONE_WITH_CONCERNS): H1, M1, L2, L4 and L5 are fixed. L1 was tried, then reverted on evidence; it needs a controller call.

### Files Touched
- `lib/admin/fetch-admin-users-for-export.ts` (new, 51 lines): reads the export in chunks
- `app/[locale]/admin/users/export/route.ts` (50 lines, about +5/-5): now uses the helper
- `tests/unit/admin-users-export-route.test.ts` (106 -> 163 lines)
- `lib/admin/users-csv.ts` (57 lines, 1 line changed: BOM)
- `tests/unit/users-csv.test.ts` (82 lines, 1 line changed: BOM)
- `supabase/migrations/20261024100000_create_admin_users.sql` (248 -> 251 lines): hearts_agg filter and header comment
- `supabase/verify/20261024100000_create_admin_users_verify.sql` (620 -> 637 lines): fixture, V6a, new V6a2, V8c
- `components/site-shell/header-session-controls.tsx` (25 lines): comment only, see L1
- `.gitignore` (+3/-0)

### Checks
- Typecheck: clean (`npx tsc --noEmit`, exit 0). The UI agent's in-progress files caused no errors.
- Lint: `npx eslint` on all touched TS/TSX files, exit 0
- Unit tests: full suite 63 files, 1053 passing, 0 failing
- TDD: I rewrote the route tests first. Before the helper existed, 8 of them failed (multi-chunk, exact cap in 5 chunks, 413 after one call, and the 5 short/failed-chunk cases). They pass after the change.
- Not run, as instructed: build, E2E, any SQL. The verify changes are reviewed by hand only.

### Findings
- [x] **H1**: `fetchAdminUsersForExport(filters, client)` reads `{ limit: 1000, offset }` chunks until `rows.length === total`. `total` comes from the first chunk.
  - If `total` is above 5000, it returns `too_many` right after the first call, and the route answers 413.
  - Each chunk must have exactly `min(1000, total - read)` rows and the same `total`. Otherwise it returns `error` and the route answers a generic 500. That covers a server cap below 1000, an empty or short chunk, data that changed between chunks, and a failed chunk.
  - The mismatch log carries counts only (`offset/expected/received/total/chunkTotal`). The route never sends a partial CSV.
  - Tests cover:
    - total 2,300 -> 3 calls `[1000,0] [1000,1000] [1000,2000]`, IDs 1..2300 in order
    - 5,000 -> 5 calls and 5,000 lines
    - 5,001 -> 413 after exactly 1 call
    - 500 for: a 500-row cap with 2,300 rows; a 500-row cap with 800 rows; an empty later chunk; a total that changes; a later chunk that errors. The body is exactly "Export failed" and no `@` or name appears in the logs.
  - The first test now expects `p_limit: 1000`.
- [x] **M1**: `hearts_agg` now has `where not k.is_anonymous`. The migration's column-definition comment says this deliberately differs from kudos_my_stats, and why (an admin could subtract the public per-Kudo heart counts and unmask an anonymous sender).
  - Verify fixture: adm's anonymous Kudo is now captured as `v_k4` and gets a heart from `v_l[2]`. The own-Kudo trigger allows this because the sender is adm.
  - **V6a** still checks sent/received against kudos_my_stats for all 36 temp users. Hearts are now checked against an independent sum: `sum(hearts_awarded)` over that user's sent Kudos where `not is_anonymous`.
  - **V6a2** (new) checks four things:
    - adm `hearts` = hearts on k1 + k2 only, and those hearts are at least 3
    - k4 has at least 1 heart and it is not counted
    - adm `sent` = 3 (the anonymous Kudo still counts)
    - kudos_my_stats `hearts_received` = named + anonymous hearts, which proves the divergence is intended
  - It also keeps the usr received = 3 assertion that V6a used to hold. The my_stats JSON cast is guarded with `case when v_txt like '{%'`, so an error code cannot abort the run.
  - No unit test, contract file or fake mentions the old definition. The E2E fakes store precomputed `hearts`.
- [x] **L2**: V8c's comment and name now say what the check proves: "99999 -> clamped, returns all 36". The comment adds that proving the 5000 bound itself would need more than 5000 rows.
- [x] **L4**: `users-csv.ts` uses `"\uFEFF"`, and the test's empty-CSV expectation uses `` `\uFEFF${HEADER}\r\n` ``. Grep finds no raw EF BB BF bytes left in either file. The existing test already asserts `csv.charCodeAt(0) === 0xfeff`, and the route test checks the first body bytes are `EF BB BF`.
- [x] **L5**: `.gitignore` now has `.playwright-mcp/`. `git check-ignore -v .playwright-mcp/` matches it at `.gitignore:137`.
- [ ] **L1: not applied (reverted), needs a controller decision.** The finding assumes "is_admin already answers false without a session". That holds only for the `authenticated` role.
  - The migration runs `revoke execute on function public.is_admin() from public, anon` (line 239), and V4 expects anon -> 42501.
  - A guest's server client calls PostgREST as `anon`. `/` is in PUBLIC_PATHS and renders `HeaderSessionControls`.
  - So `Promise.all` would make every guest view of `/` do an extra RPC that fails with 42501, and `getIsAdmin` would log `[admin] is_admin failed` each time. Guests would also get a slower page, not a faster one.
  - I restored the sequential order. `connection()` still comes first, then getIsAuthenticated, then getIsAdmin only when signed in. I added a comment explaining why, so a later review does not flag it again.
  - Options for the controller:
    - (a) Keep it sequential (recommended): signed-in users pay one extra round trip, and there is no guest noise.
    - (b) `grant execute on function public.is_admin() to anon` (it returns false when `auth.uid()` is null), change V4 to expect anon `false`, then use Promise.all. This widens the grant surface for a few ms.

### Issues Encountered
- The Write/Edit/Bash tool inputs here decode a JSON-style `\uFEFF` into a real BOM character. My first edits put raw BOMs or the bare text "FEFF" back into the files. I fixed it with a node script that builds the backslash from `String.fromCharCode(92)` and checked the result with `od`/grep. Anyone editing these lines with the same tools should check the bytes afterwards.
- `Response.text()` strips the BOM, so the route test's header assertion stays `"ID,Name,..."`. The BOM is asserted through `arrayBuffer()`.

**Status:** DONE_WITH_CONCERNS
**Summary:** The export now reads 1000-row chunks all-or-nothing; Total Heart leaves out anonymous Kudos and the verify checks it independently; L2, L4 and L5 are done. 1053/1053 unit tests pass, tsc and eslint are clean.
**Concerns:** L1 is deliberately not applied. Promise.all would call the anon-revoked is_admin on every guest view of `/` (42501 plus an error log each time). The controller should pick option (a) or (b) above. The SQL (M1 and the verify changes) has not been run.
