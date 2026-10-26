# Review pass 1 — Like Kudos (#13)

## Review Summary
Small, well-scoped change, and it is sound. The security-definer RPC follows the #12 conventions exactly. The Server Action validates input, maps errors and leaks nothing. The store's per-Kudo in-flight guard makes double clicks across both cards safe, and rollback restores the correct previous value. One real a11y defect (Medium): the heart is `disabled` while pending, so keyboard focus drops on every toggle, and the E2E works around it. No Critical or High findings.

## Scope
Working tree vs 8bf957b: 11 modified + 10 new files (store, toast, action, migration/rollback/verify, E2E + fake, unit). Read against 20261015100000_create_kudos.sql (kudo_hearts, triggers, RLS/revoke, kudos_my_stats) and 20261019110000_create_kudo_write.sql (22023 codes, grants). Tester evidence: lint 0, tsc 0, vitest 559, E2E 204/204, kudo-hearts x5 45/45, OpenNext build 0, gzip 2221.89 KiB.

## Assessment
- **Concurrency:** `inFlight` ref is keyed by kudoId and checked synchronously, so a second click on either card (Highlight or feed) is dropped before any render. Both copies read the same override, and `pending` locks both. `current` is captured from the render snapshot when clicked; with one call in flight per Kudo, rollback always restores that snapshot. On success the state and count come from the database (not the guess). `.catch(rollBack)` covers a rejected action; `.finally` clears the lock.
- **RPC security:** `security definer`, `search_path = ''`, every name schema-qualified. The account rule is checked first. `not_found` covers null id or null `p_liked`. `own_kudo` is checked before any write, and the trigger also refuses it. No client count or award is accepted. `on conflict do nothing` + set semantics are idempotent. `heart_count` is re-read after the triggers. Execute is revoked from public/anon and granted to authenticated. `kudo_hearts` keeps no grants (H5 verify).
- **Fake parity:** order forbidden → not_found (incl. non-boolean liked) → own_kudo; PostgREST 400 shape `{code:"22023", message}` matches.
- **Action:** zod `.strict()` refuses extra count/award fields. `own` is returned only on 22023 plus an exact message; everything else is `generic`. Logs go to the server only, and the unit test asserts no "secret" leaks.
- **Toast extraction:** Copy Link behaviour is identical (3 s, replace, portal, role=status, silent on clipboard failure).
- **i18n:** VI/EN `hearts.error` are both present and marked not-from-Figma.
- **Sizes:** every new code file is under 80 lines. The verify SQL (240) matches the size of earlier verify scripts.

## Critical
None.

## High
None.

## Medium
1. **Keyboard focus is lost on every toggle** — `components/kudos/kudo-hearts.tsx:49` (`disabled={own || pending}`). When the focused button becomes `disabled`, the browser resets focus to the document. A keyboard or screen-reader user loses their place, and the `aria-pressed` change is never announced on the control. The E2E confirms it (`tests/e2e/kudo-hearts.spec.ts:166`, "a disabled button drops focus while it waits, so take it back"). Fix: keep `disabled={own}`, use `aria-disabled={pending || undefined}` for the pending lock (the store's `inFlight` guard already ignores clicks), keep the cursor style via `aria-disabled:cursor-not-allowed`, and change the E2E pending assertion to `aria-disabled="true"`. Then drop the re-focus workaround so the test proves focus is kept.

## Low
2. **Overrides outlive server refreshes** — `components/kudos/kudo-hearts-store.tsx:68-69`. The provider sits in page.tsx, so its state survives filter changes (searchParams) and `router.refresh()`. Fresh server `heart_count` / `liked_by_me` for any Kudo clicked earlier is ignored until a full reload. The override is the last confirmed DB state, so the only drift is other users' hearts in the meantime, which is acceptable for a board without realtime. Fix if wanted: store the server snapshot with the override and drop the override when the incoming server props differ from that snapshot.
3. **Two toasts can stack** — `components/kudos/kudo-hearts-store.tsx:26` + `copy-kudo-link-button.tsx:14`. The heart error toast and a Copy Link toast are separate hook instances at the same fixed position. They overlap if both fire within 3 s. Rare; accept or share one provider-level toast later.
4. **Stale header comment** — `tests/e2e/kudo-hearts.spec.ts:5` still says "Expected RED now". Already noted by the tester.

## Edge Cases Turned Up
- Double click across the two cards of one Kudo: covered by the in-flight guard (same Set, same key).
- Server answers `liked=false` to a like (row gone): the UI takes the DB answer (unit test covers it).
- Failure on unlike: rollback restores liked plus the old count (same code path as like).
- Concurrent likes by other users: the RPC returns the real `heart_count` after triggers, so the count can jump by more than 1, which is correct.
- Same user in two tabs liking at once: PK + `on conflict do nothing`; AFTER INSERT does not fire on the conflict, so the count cannot drift.
- Own anonymous Kudo: `is_mine` makes the button disabled; the server refuses with own_kudo as well.

## Done Well
- Set-not-toggle RPC contract: overlapping requests cannot flip each other.
- The award and the count stay entirely in DB triggers, and the zod `.strict()` input makes client-supplied numbers impossible.
- The verify script exercises definer/search_path/grants, idempotency, every error code, x1/x2 award plus give-back, and direct-table 42501, all rolled back.
- The fake is keyed per JWT sub, so specs stay isolated; there is a one-shot failure injection; the call log proves "exactly one RPC".
- The Server Action is injected into the client store, so no server code is imported in the client.

## Actions In Order
1. Fix Medium #1 (aria-disabled for pending, keep focus) and update the two E2E assertions.
2. Owner: run the migration plus verify on real Supabase (all rows PASS), then try it live.
3. Optional: Low #2, #3. Fix the comment in Low #4.

## Numbers
Files reviewed: 21 · Critical 0 · High 0 · Medium 1 · Low 3 · Largest new code file 72 lines.

## Still Unresolved
- Real-DB execution of the migration and verify is pending owner evidence. By inspection there is no doubt: the conventions match #11/#12 and `is_allowed_account(text, jsonb)` exists.
