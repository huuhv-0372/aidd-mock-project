## Task: 02b — profile RPCs, data layer, routes
**Status**: completed (DONE_WITH_CONCERNS: SQL not executed; no Postgres on this machine)

### Files Touched
- `supabase/migrations/20261022100000_create_profile_rpcs.sql` (+108, new)
- `supabase/rollbacks/20261022100000_create_profile_rpcs_down.sql` (+13, new)
- `supabase/verify/20261022100000_create_profile_rpcs_verify.sql` (+346, new; single paste-and-run script like the other verify files, so not split at 200)
- `lib/profiles/get-profile-page-data.ts` (+72, new)
- `lib/profiles/load-more-profile-kudos-action.ts` (+31, new)
- `lib/profiles/fetch-profile-kudos.ts` (+36, new; shared RPC call + parse for loader and action)
- `lib/validation/profile.ts` (+22: `profileIdSchema` = `z.guid()`, `profileKudosDirectionSchema`, strict `loadMoreProfileKudosInputSchema`)
- `lib/kudos/get-kudos-board-data.ts` (1 line: `readBlock` exported; board behaviour and tests unchanged)
- `app/[locale]/profile/page.tsx` (+36, new)
- `app/[locale]/profile/[id]/page.tsx` (+44, new)
- `tests/unit/get-profile-page-data.test.ts` (+178, new; 29 cases)
- `tests/unit/load-more-profile-kudos-action.test.ts` (+87, new; 11 cases)

### Checks
- Typecheck `npx tsc --noEmit -p .`: clean (02a's `profile-view`, `profile-page-layout`, `fill-template` and `dict.profile` had landed by then, so the expected cross-phase errors are gone).
- Unit: new files 40/40 RED first (modules missing), then green. Full suite 826/826 passed. One earlier full run had 1 failure in `kudo-content-blocks.test.ts > stays linear on hostile delimiter runs`, a timing assertion in code this task does not touch; it passed alone and on the re-run (CPU shared with the parallel agents).
- ESLint on all owned files: exit 0.
- Not run (as instructed): `next build`, E2E, real SQL.

### Acceptance Criteria
- [x] `profile_card(p_id)`: account rule first; returns `kudos_person_json(p_id)` (6 keys, no email); refused caller / null / unknown id give `null`.
- [x] `kudos_profile_feed(...)`: account rule first; null profile gives 0 rows; `received` = `recipient_id = p_profile`; `sent` only when `p_profile = auth.uid()` (filter on `v_uid`, the caller's own anonymous Kudos included; `kudos_rows` still nulls the sender and keeps `is_mine`); any other direction gives 0 rows; same keyset/order/clamp as `kudos_feed`; no new index.
- [x] Both RPCs: `security definer`, `set search_path = ''`, `stable`, revoked from public/anon, granted to authenticated; one transaction, idempotent.
- [x] Rollback drops both functions.
- [x] Verify: one PASS/FAIL row per check, all writes rolled back. P1/P2 (definer, search_path, stable, account rule first, signature, grants), C1 (exactly 6 keys, counts), C2 (own card; unknown/null id → null), C3 (wrong domain / non-Google / no claims → null + 0 rows), R1 (page 1 order, all to C), R2 (pages 2–3 keyset, no overlap/gap, tie on the page boundary), R3 (half cursor ignored), R4 (clamp 0/-5/null/21/100 → 1/1/10/20/20), R5 (unknown direction / null / unknown profile → 0 rows), SEC_002, SEC_003 (incl. claims without `sub`), SEC_004 (no `@`/email/provider/app_metadata/aud/sub; anonymous sender id absent from C's received list), P1b/P2b (anon → 42501).
- [x] `getProfilePageData(id, client?)`: `cache()`-wrapped; malformed id → `not_found` before any client/RPC; `getClaims()` (never `getSession`); no claims → `not_found`; own id in any case → `redirect_self`; card RPC error / schema failure → `error`; null → `not_found`; then stats (self only) and the first received page in parallel, each `null` on failure; never throws; `console.error` only server-side.
- [x] `loadMoreProfileKudos(input)`: `"use server"`, strict zod, `KUDOS_PAGE_SIZE`, invalid → `{ error: "generic" }` with no client/RPC, RPC error / bad rows / client failure → generic.
- [x] Routes: `connection()` before the loader (the loader catches the `cookies()` bailout; without it `/profile` would be prerendered per locale at build); `notFound()` / `redirect(PROFILE_PATH)` before any render; error → `ProfilePageLayout` + `<p role="alert">{dict.profile.loadError}</p>`; ok → `ProfileView`. `/profile` title = `metaTitleSelf`; `/profile/{id}` title = `metaTitleOther` filled with the name (`unknownName` when null); any non-ok status returns `{}` (the layout's "SAA 2025"; the 404 page has its own). Route imports: only `next`, `next/navigation`, `next/server`, and app modules (no `next/headers`).

### Decisions / deviations
- `getClaims()` returning an error → `error` (logged), not `not_found`: by page time the proxy has already refreshed and verified the session, so what is left is an infrastructure failure (e.g. JWKS fetch). The contract only defined "no claims → not_found".
- Card first, then stats + feed in parallel (as specified): one extra round trip, but no wasted queries on a 404.
- The `[id]` title uses 02a's `fill()` (`components/profile/fill-template.ts`) and `dict.profile.unknownName`, so the title and the hero agree on a nameless profile.
- `readBlock` exported from the board loader for the stats block and the feed helper (DRY with the board's logging); no behaviour change.

### Issues Encountered
- SQL not executed: no psql/Postgres here (Docker has no images; I did not pull one). The verify file was desk-checked: an error result (jsonb string) gives a FAIL row, never an abort, except inside the `X behaviour block aborted` path.
- Out of scope, not edited: `lib/navigation/routes.ts:29` still says "route not built yet" on `profileHref`, which is now stale.
- Bundle size not measured (no build). The routes add `next/server` (`connection`), which the countdown page already imports.
