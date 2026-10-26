# Review: Profile (`/profile`, `/profile/<id>`), branch `feature.new.profiles` vs `main`

Date: 2026-10-22. Reviewer: strong, read-only. Plan: `plans/261021-profile/plan.md` + `clarifications.md` (Session 2 wins).

## Review Summary

### Scope
- **SQL:** `supabase/migrations/20261022100000_create_profile_rpcs.sql`, `supabase/rollbacks/..._down.sql`, `supabase/verify/..._verify.sql`. I read all three line by line against `20261015100000_create_kudos.sql` (`kudos_rows`, `kudos_person_json`, `kudos_feed`, `kudos_my_stats`) and `20261012133000_create_profiles.sql` (`is_allowed_account`, sign-in triggers).
- **Routes:** `app/[locale]/profile/page.tsx`, `app/[locale]/profile/[id]/page.tsx`.
- **Data:** `lib/profiles/{get-profile-page-data,fetch-profile-kudos,load-more-profile-kudos-action,profile-types}.ts`, `lib/validation/profile.ts`, `lib/kudos/get-kudos-board-data.ts` (`readBlock` export), `lib/navigation/routes.ts`.
- **UI:** `components/profile/*` (9 files), `components/kudos/{kudo-person,kudos-feed-list,kudos-compose-trigger}.tsx`, `components/kudos-compose/{kudos-composer-provider,write-kudo-dialog,write-kudo-form,use-write-kudo-form,recipient-picker,normalize-composer-options}`.
- **i18n:** `messages/{vi,en}/profile.ts` + `index.ts`.
- **Tests:** `tests/unit/{get-profile-page-data,load-more-profile-kudos-action,normalize-composer-options}.test.ts`, `tests/e2e/profile.spec.ts`, `support/profile-{contract.ts,fixtures.mjs}`, and the shared fixture diffs.
- **Not reviewed:** the merge content from main.
- **Size:** about 2,100 lines (app/lib/components about 880, SQL about 470, tests about 750).
- **Depth:** full on SQL, routes, data layer and client state; skim on visual classes (the visual tester covers those).

### Assessment
I found nothing Critical or High. The anonymity model holds in the SQL I read:
- `sent` is gated on `p_profile = auth.uid()` and filters on `v_uid`, never on `p_profile` alone.
- `received` goes through `kudos_rows`, so an anonymous sender comes back null.
- `profile_card` is `kudos_person_json`, which has exactly six keys and whose `distinct_senders` skips anonymous senders.

The app side follows the same rules as the board: zod first, `getClaims`, `notFound()` and `redirect()` before render, generic errors only, and `cache()` sharing one pass between metadata and page.

Two claims are still open, and neither needs a code fix:
1. Real-Postgres behaviour. It is proven only when the user runs the verify file.
2. The 1440 Figma match. The parallel visual tester owns it.

One Medium DRY fix is worth doing (the key-visual band is now copied three times). Decision is **REWORK**, driven by the open claims plus that fix.

### Critical
None.

### High
None.

### Medium
1. **DRY: third copy of the Kudos key-visual band and of the page frame**
   - **Where:** `components/profile/profile-page-layout.tsx:11-13,34-44`. Same in `components/kudos/kudo-detail-layout.tsx:10-12,30-39` and `components/kudos/kudos-kv-banner.tsx:14-25`.
   - **What is copied:**
     - the band markup (image, `432/512` heights, `object-[75%_50%]`, the 957px Cover gradient), now in 3 places;
     - the `ALERT_CARD` class string, verbatim in 2 places;
     - the `SiteHeader` + `Suspense(HeaderSessionControls)` block, in 2 places.
   - **Why it matters:** CLAUDE.md says to extract on the second repetition. The next Figma tweak to the band needs three edits, and they will drift.
   - **Fix:**
     - Add `components/kudos/kudos-kv-backdrop.tsx` (`export function KudosKvBackdrop({ dimmed = false, preload = false })`) that renders the absolute `-z-10` band, the gradient, and the optional 80% overlay. Use it in all three files.
     - Move `ALERT_CARD` next to it, or into `components/site-shell/shell-class-names.ts`.
   - **Alternative:** one `KudosPageFrame({ dimmed, footer, children })` that both layouts become thin wrappers of. More reuse, but a bigger diff.

### Low
1. **Feed index (Defer).**
   - **Where:** `supabase/migrations/20261022100000_create_profile_rpcs.sql:63-88`.
   - **What:** `received` and `sent` filter on `kudos_recipient_id_idx` / `kudos_sender_id_idx`, then sort all of that person's rows before `limit`. That is fine at this event's scale (hundreds of Kudos per person at most).
   - **If it ever grows:** add `kudos (recipient_id, created_at desc, id desc)` and `kudos (sender_id, created_at desc, id desc)` in a later migration so a keyset page becomes a range scan.
2. **Verify P1 is weaker than P2 (Defer).**
   - **Where:** `supabase/verify/20261022100000_create_profile_rpcs_verify.sql:96`.
   - **What:** P1 only checks that `public.is_allowed_account(` is present in `profile_card`. P2 (line 125-126) also checks it comes first. `profile_card` is a two-statement body, so the risk is nil today.
   - **To match P2:** compare `strpos(... 'is_allowed_account(')` with `strpos(... 'kudos_person_json(')`.
3. **Listbox stays open on Tab-out (Defer).**
   - **Where:** `components/profile/profile-direction-dropdown.tsx:48`.
   - **What:** `useDismissable` closes only on outside pointerdown or Escape. Tabbing out of the open listbox leaves it open. This is the same as the board's `KudosFilterDropdown`, so it is consistent.
   - **Fix (both dropdowns):** an `onBlur` on the root that closes when `relatedTarget` is outside it.
4. **E2E spec size (Defer).**
   - **Where:** `tests/e2e/profile.spec.ts:1-380`, which is 380 lines against the ~200 guide.
   - **Precedent:** `write-kudo.spec.ts` is 821 lines.
   - **Possible split:** `profile-self.spec.ts` / `profile-other.spec.ts`.
5. **Log prefix (Reject).**
   - **Where:** `lib/kudos/get-kudos-board-data.ts:49`.
   - **What:** `readBlock` logs with a `[kudos]` prefix for `kudos_profile_feed`. Cosmetic only; the RPC name is in the message.

### Edge Cases Turned Up (scouting pass)
- **Own id in another case:** `/profile/<SUB uppercased>` → `redirect_self` (`get-profile-page-data.ts:39`; unit test covers it). Another Sunner's id in upper case renders under the non-canonical URL. The card id is used downstream, so it is harmless.
- **Race between a slow page and a direction switch:**
  - A switch sets the slot to `loading`, which unmounts the `KudosFeedList` that owns any in-flight `fetchMore`, so its late `setItems` lands on an unmounted instance and is dropped.
  - Two quick switches are ordered by the `latest` counter (`profile-kudos-section.tsx:58-71`).
  - After the new first page loads, the list is keyed by `direction` (`profile-kudos-body.tsx:84`).
  - No stale page can enter the new list.
- **Re-pick and dedupe:** re-picking the current option is a no-op (`profile-direction-dropdown.tsx:65-68`). Dedupe by id is in `KudosFeedList.fetchMore`.
- **Refresh after sending from the write bar:** `router.refresh()` changes `feed.items[0].id`, so the section key changes and the section restarts on page 1 (`profile-view.tsx:56`). On a refresh that does not change the top item, the chosen direction is kept, which is correct.
- **Refused or unknown callers:** a caller without a `profiles` row, or one refused by `is_allowed_account`, gets a null card and then 404. Without claims, the proxy has already sent them to `/login`; the loader also returns `not_found`.
- **`openComposer` called with an event:** `getInitialRecipient` treats anything that is not `{recipient:{id:string,name:string}}` as empty. The widget calls `onWriteKudo()` with no args (`widget-button.tsx:80-83`), the trigger and rules dialog wrap it, and the guest redirect (`kudos-composer-provider.tsx:71-73`) runs before any prefill.
- **Prefill:** prefill is per open (`setInitialRecipient` on every open, and the form is mounted only while open), so a later empty open from another trigger starts empty.
- **Tampered server action:** a client can call `loadMoreProfileKudos({direction:"sent", profileId:<other>})`. zod accepts it on purpose; the RPC answers 0 rows (`migration:76`, verify SEC_003). `.strict()` rejects extra keys such as `limit` (unit test).

### SQL / anonymity checklist (from the dispatch)
1. Both RPCs meet the security baseline:
   - `security definer`, `set search_path = ''`, `stable`;
   - `is_allowed_account` is the first statement;
   - `revoke ... from public, anon`, `grant ... to authenticated`;
   - a refused caller gets `null` / `return;` (0 rows), never a raise. ✔
2. 'sent' is reachable only for the caller, and 'received' does not re-expose anonymous senders. ✔
   - **'sent':** the guard is `p_direction = 'sent' and v_uid is not null and p_profile = v_uid`, with the filter on `k.sender_id = v_uid`. Everything else returns 0 rows: no sub, another profile, unknown direction (case-sensitive), null profile.
   - **'received':** rows come from `kudos_rows`, so `sender` is null when `is_anonymous`.
   - **Nothing else re-exposes the sender:**
     - `is_mine` is true only for the viewer's own Kudos;
     - `anonymous_name` is the sender's chosen alias, shown on the board already;
     - images and hashtags carry no person;
     - ordering is `created_at, id`, the same as the public board feed;
     - the card counts (`kudos_received` counts all Kudos, `distinct_senders` counts named senders only) are the ones the board already embeds.
   - **Net new exposure vs the board:** none. Every received Kudo is already on the board feed.
3. `profile_card` = `kudos_person_json(p_id)`: exactly 6 keys, no email or auth field, and `distinct_senders` filters `not k.is_anonymous`. Null or unknown id → no row → null. ✔
4. Keyset, clamp and null arrays match `kudos_feed`. ✔
   - Keyset `(created_at, id) < (cursor)` applies only when both halves are present.
   - The clamp `least(greatest(coalesce(p_limit,10),1),20)` is identical to `kudos_feed`.
   - `array_agg` over no rows gives null, and `unnest(null)` gives 0 rows.
5. The verify file proves each claim. ✔ (reading only)
   - **P1/P2:** catalog checks, `aclexplode` (no PUBLIC EXECUTE), and `has_function_privilege` for authenticated and anon.
   - **C1:** exactly 6 keys, 22 received, 1 distinct (anonymous excluded).
   - **C2:** own card; unknown and null id → null.
   - **C3:** wrong domain, non-Google and no claims → null / `[]`.
   - **R1-R5:** order, keyset across a deliberate tie at the page boundary, half cursor, clamp 0/-5/null/21/100, bad direction or profile.
   - **SEC_002:** own anonymous Kudo in Sent with `sender` null, alias kept, `is_mine` true.
   - **SEC_003:** A and B Sent lists are disjoint; the other user's Sent → `[]` with any limit or cursor and with a sub-less allowed JWT.
   - **SEC_004:** no `@`, `email`, `provider`, `app_metadata`, `aud` or `sub` in any payload; the anonymous sender's id is absent from C's received pages as read by B and by A.
   - **anon:** 42501 on both RPCs.
   - **Rollback and re-runs:** every write sits inside a sub-block that ends in `raise exception 'verify-profile-rpcs-rollback'`. Only `pg_temp` helpers remain, so the file is safe to re-run. The impersonation pattern matches `20261021120000_create_kudo_detail_rpc_verify.sql`, which has already been run.
   - **Rollback file:** drops exactly the two functions it adds, and is idempotent.
   - **Not proven until run:** none of this executed here (no psql). It is proven only when the user runs the verify file and every row is PASS.

### App-side checklist
- **ID validation:** `z.guid()` before any query or client creation (`get-profile-page-data.ts:29`).
- **Own-id redirect:** case-insensitive, `redirect(PROFILE_PATH)` outside try/catch (`[id]/page.tsx:35`).
- **404:** `notFound()` runs before render, and E2E confirms a real 404 for 5 malformed ids and an unknown guid.
- **Auth:** `getClaims()` only, no `getSession()`.
- **Server action:** strict zod, nothing queried on failure, `{error:"generic"}` only, full detail in `console.error`. It does not rely on the client for the sent rule.
- **Metadata and page:** `cache()` shares one pass between `generateMetadata` and the page in `[id]`. `/profile` metadata is static.
- **`await connection()`:** placed before the loader in both pages and in the `[id]` metadata, which matches the PPR lesson.
- **Route imports:** no `next/headers` in route files. The route imports the `"use server"` action module, which statically imports `@/lib/supabase/server`. That is the same shape the board page already has (`sun-kudos/page.tsx:18,22`). Worker gzip was not measured here (see Still Unresolved).
- **`openComposer(options?)`:** backward compatible for the board pill, widget, rules dialog and guest redirect (see Edge Cases).
- **Prefill path:** provider → dialog → form → hook (`recipient` initial state) → picker (`initialText`, no search effect, list closed).
- **"Đã gửi"/"Sent" on another profile:**
  - `self=false` renders a static `<p>` with no dropdown;
  - `kudos_my_stats` is not called;
  - the slot direction stays `received`;
  - E2E asserts the word is absent in VI and EN.
- **Dropdown a11y:**
  - listbox and option roles, `aria-selected`, roving tabindex;
  - Arrow keys, Home and End;
  - Escape and choosing return focus to the trigger;
  - outside clicks keep the new focus;
  - Tab-out stays open (Low #3).
- **i18n:** `en` is typed `Dictionary["profile"]`, so a missing key is a compile error. No hard-coded user-facing strings were found in the new components.
- **File sizes:** every app, lib and component file is under 200 lines (largest new file 134). Only the E2E spec is over (Low #4).

### Done Well
- **Sent guard:** keyed on the verified `auth.uid()`, with a comment saying why. The verify file attacks it from four angles, including a sub-less but allowed JWT.
- **Verify fixture design:** a created_at tie sits exactly on the page 1/2 boundary to prove the `(created_at, id)` keyset, and the payload-wide grep for auth fields and the anonymous id goes beyond a per-field check.
- **Loader statuses:** an injectable client, a lazy `next/headers` import, and four distinct statuses mapped to 404, 307, alert and page. A failed block (stats or feed) degrades only that block.
- **Client race:** handled with a request counter rather than an AbortController, which is the simplest thing that works with Server Actions.
- **Defensive composer API:** `getInitialRecipient` keeps every existing direct handler wiring safe.
- **Tests:** they target the real risks: redirect case, malformed ids with no RPC, a "secret" DB message never reaching the result, strict extra key, and sent pass-through.

### Actions In Order
1. **User:** run `supabase/migrations/20261022100000_create_profile_rpcs.sql`, then `supabase/verify/20261022100000_create_profile_rpcs_verify.sql`. Every row must be PASS (P1, P2, C1-C3, R1-R5, SEC_002, SEC_003, SEC_004, P1b/P2b). Then try it for real: own profile Sent with one anonymous Kudo, and another person's profile.
2. **Visual tester:** finish the 1440 Figma comparison. Any fix gets a scoped re-review.
3. **Medium #1:** extract `KudosKvBackdrop` (+ `ALERT_CARD`) and use it in the three layouts. Re-run `kudo-detail`, `kudos` board and `profile` E2E plus a visual spot check.
4. **Before sealing:** measure Worker gzip (`opennextjs-cloudflare build` + `wrangler deploy --dry-run`) against main, because two new routes plus a new server action module were added.
5. **Human riskGate sign-off:** after steps 1-2. This covers security-definer RPCs, a DB migration, and new auth-gated routes.
6. **Later:** the Low items (index, verify P1 ordering, Tab-out close, spec split).

### Numbers
- **Types:** `tsc --noEmit` exit 0 (temper). No `any` in the new code.
- **Lint:** 0 findings (temper).
- **Unit:** 826/826 (temper). I re-ran the 3 new files here: 48/48 pass.
- **E2E:** 297/297, including profile 30/30 (temper, against the fake Supabase).
- **Coverage %:** not measured. Statement coverage is not part of this repo's gate.

### Still Unresolved
- **Real SQL:** behaviour on real Postgres is unproven until the verify file runs (no psql here). The E2E fake (`tests/e2e/support/profile-fixtures.mjs`) mirrors the rules but cannot catch SQL bugs.
- **Figma match at 1440:** pending the parallel visual validation.
- **Worker bundle size:** not measured, because builds are off-limits during this review.
- **riskGate:** the dispatch asked for an `areas` key, but the validator (`.claude/hooks/lib/verdict-risk-gate.cjs:22`) rejects anything outside `touchesSensitiveArea` / `signoffRequired` / `humanSignedOff`. The areas are listed here instead:
  - security-definer RPCs;
  - DB migration (+ rollback);
  - new auth-gated routes;
  - anonymity rule for Sent.

**Status:** DONE_WITH_CONCERNS
**Summary:** No Critical or High findings. The SQL anonymity model, the auth gating and the client state are sound. The verdict is REWORK because real-SQL behaviour (the verify run) and the 1440 visual match are not yet demonstrated, and one Medium DRY extraction is accepted.
**Concerns/Blockers:** the user must run the verify SQL, the visual result is pending, and a human must sign off the riskGate.

```json
{
  "score": 8,
  "criticalCount": 0,
  "decision": "REWORK",
  "acceptanceCovered": [
    "a guest opening /profile or /profile/<id> is sent to /login and sees no profile data — proxy default-deny (lib/auth/resolve-auth-redirect.ts:19, /profile not in PUBLIC_PATHS); E2E 'guest on /profile or /profile/<id> lands on /login with no next, and no profile renders' passes",
    "/profile shows the signed-in Sunner's avatar, name, department, Hero badge and stars, six grey icon slots under 'Bộ sưu tập icon của tôi', the statistics card with the Secret Box button, and the KUDOS section with Received selected — profile-view.tsx:42-71, profile-hero.tsx, profile-icons.tsx, KudosStatsPanel reuse; E2E 'Profile: my own page' hero/icons/statistics/KUDOS cases pass (against the fake RPCs)",
    "/profile/<id> shows that Sunner's hero, the 'Bộ sưu tập icon của {tên}' heading, a write-Kudo bar that opens Write Kudo with that Sunner pre-selected, and the static 'Đã nhận: N Kudos' count; their sent count and sent Kudos never appear — self=false renders a static count, no dropdown, no kudos_my_stats call (profile-kudos-section.tsx:85-95, get-profile-page-data.ts:55-60); prefill path provider->dialog->form->hook->picker reviewed; E2E write-bar and 'Đã gửi is nowhere' cases pass in VI and EN; the server-side backstop (RPC sent = 0 rows for others) is correct on reading but proven on real Postgres only by the verify run",
    "/profile/<own id> lands on the self view; a malformed or unknown id returns HTTP 404 — z.guid() before any query, case-insensitive redirect_self, notFound() before render ([id]/page.tsx:33-35); E2E redirect, unknown-guid 404 and 5 malformed-id 404 cases pass; unit test covers the upper-case own id",
    "switching Received/Sent loads page 1 of that list, infinite scroll loads further pages without duplicates, each direction has its own empty message, and hearts, hashtags and Copy Link behave as on the board — cursor:null first page per switch with request-counter race guard (profile-kudos-section.tsx:58-71), KudosFeedList keyed by direction with id dedupe, emptySent vs board empty; E2E switch, re-pick, infinite scroll 13 in order, empty lines VI/EN, card links, Copy Link and heart cases pass against the fake; real keyset proven only by verify R2"
  ],
  "regressionChecked": [
    "openComposer(options?) callers: board pill kudos-compose-trigger.tsx:25 wraps to openComposer(); widget-button.tsx:80-83 calls onWriteKudo() with no args; rules dialog kudos-composer-provider.tsx:85 wraps; guest redirect kudos-composer-provider.tsx:71-73 runs before setInitialRecipient; getInitialRecipient rejects events/non-objects",
    "WriteKudoDialog/Form/useWriteKudoForm/RecipientPicker: new props optional with null/'' defaults, form mounted per open so no stale prefill",
    "KudosFeedList loadMore type widened to KudosFeedLoadMore; board still passes loadMoreKudos (tsc 0)",
    "kudo-person.tsx HeroTitle/Stars exported, align union widened with center; board cards still pass start/end (kudo-post-card.tsx:51-54, kudo-highlight-card.tsx, kudo-detail-card.tsx)",
    "readBlock exported from get-kudos-board-data.ts with unchanged behaviour",
    "Dictionary type gains profile; en typed so missing keys fail tsc (tsc 0)",
    "shared E2E fixtures: kudos-fixtures.mjs only adds exports; applyKudoHearts list adds kudos_profile_feed; fake server routes profileRpc before board RPCs; full E2E 297/297",
    "SQL: no change to existing functions, tables, grants or indexes; rollback drops exactly the two new functions"
  ],
  "contractStatus": "CHANGED",
  "refuted": [],
  "unproven": [
    "the page matches the Figma export at 1440 wide and has no horizontal scroll at 375; every string switches between VI and EN; the existing unit and E2E suites stay green — 375 no-scroll (E2E both faces), VI/EN (E2E + typed Dictionary) and green suites (vitest 826/826, E2E 297/297, lint 0, tsc 0) are proven; the 1440 Figma match depends on the parallel visual validation, not provable from code",
    "Real-Postgres behaviour of profile_card and kudos_profile_feed (P1/P2 grants and definer settings, C1-C3, R1-R5 keyset and clamp, SEC_002 own anonymous Kudo in Sent with sender null and is_mine, SEC_003 Sent never crosses users, SEC_004 no email/auth/anonymous-sender id, anon 42501): judged correct by line-by-line reading, but proven only when the user runs supabase/verify/20261022100000_create_profile_rpcs_verify.sql and every row is PASS; the E2E runs against a hand-written fake"
  ],
  "reachableRegressions": [],
  "findings": [
    { "severity": "Medium", "category": "Maintainability", "location": "components/profile/profile-page-layout.tsx:11-44", "summary": "Third copy of the Kudos key-visual band (also kudos-kv-banner.tsx, kudo-detail-layout.tsx) and second verbatim copy of ALERT_CARD; extract KudosKvBackdrop({ dimmed, preload }) + shared ALERT_CARD per the CLAUDE.md reuse rule", "disposition": "Accept" },
    { "severity": "Low", "category": "Performance", "location": "supabase/migrations/20261022100000_create_profile_rpcs.sql:63-88", "summary": "Profile feed filters on single-column recipient/sender indexes then sorts all of that person's rows; composite (recipient_id|sender_id, created_at desc, id desc) indexes would make keyset pages range scans if volume grows", "disposition": "Defer" },
    { "severity": "Low", "category": "Verification", "location": "supabase/verify/20261022100000_create_profile_rpcs_verify.sql:96", "summary": "P1 checks profile_card contains is_allowed_account but not that it precedes kudos_person_json (P2 checks ordering for the feed)", "disposition": "Defer" },
    { "severity": "Low", "category": "Accessibility", "location": "components/profile/profile-direction-dropdown.tsx:48", "summary": "Listbox stays open when Tab moves focus out (useDismissable handles only outside pointerdown and Escape); same as the board dropdown", "disposition": "Defer" },
    { "severity": "Low", "category": "Maintainability", "location": "tests/e2e/profile.spec.ts:1-380", "summary": "Spec is 380 lines vs the ~200-line guide; could split into self/other specs (precedent: write-kudo.spec.ts 821)", "disposition": "Defer" },
    { "severity": "Low", "category": "Style", "location": "lib/kudos/get-kudos-board-data.ts:49", "summary": "readBlock logs profile RPC failures under a [kudos] prefix; cosmetic, the RPC name is in the message", "disposition": "Reject" }
  ],
  "riskGate": { "touchesSensitiveArea": true, "signoffRequired": true, "humanSignedOff": false }
}
```
