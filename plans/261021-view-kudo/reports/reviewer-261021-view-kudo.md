# Reviewer — View Kudo (/sun-kudos/{id}), first pass

## Review Summary

**Scope:** the uncommitted tree against HEAD: the View Kudo route and its components, the rich content parser and renderer, the `kudo_detail` RPC (migration, rollback and verify), the post-login `next` return (proxy, resolveAuthRedirect, login page and form, sign-in action, callback), the All Kudos card link, and the vi/en messages. I read every changed and new source file plus `kudos_rows`/`kudos_person_json` (20261015100000) and the image-path rules (20261019110000).

**Assessment:** solid and security-tight. I found nothing Critical or High. The `next` allow-list cannot be bypassed. The SQL contract matches the other read RPCs. The parser is linear and builds no raw HTML. One **Medium** behaviour bug: the Close button can send a user who just signed in back to `/login`. Criterion 6 still needs evidence: the full E2E run is pending and nobody has compared the page with the 1440 Figma image. So the verdict is REWORK. The code fix is small.

### Critical
None.

### High
None.

### Medium
1. **Close after OAuth goes back to /login** (`components/kudos/kudo-detail-close-button.tsx:14`). A guest's history is `/login?next=…` (a pushed entry), then the server action calls `location.assign` to Supabase. The browser then follows Google, Supabase, `/auth/callback` and `/sun-kudos/{id}`. If Google redirects at once (one signed-in Google account that already gave consent, which is common at Sun*), that whole chain is one history entry. It sits right after the same-origin `/login?next=…` entry, so `navigation.canGoBack` is **true**. Close then calls `router.back()` and lands on `/login?next=…`. That page either comes from bfcache, showing the login screen to a signed-in user, or the proxy sends the user straight back to the same Kudo. Either way Close looks broken on the main shared-link path. The referrer fallback is no help either: across cross-origin redirects the referrer is cut down to our origin.
   *Fix:* use the previous entry, not only `canGoBack`. For example: `const prev = navigation.entries()[navigation.currentEntry.index - 1]; return !!prev?.url && new URL(prev.url).pathname !== LOGIN_PATH;`. `entries()` is already same-origin and contiguous. Add an E2E test: a guest opens `/login?next=/sun-kudos/{id}`, signs in, then `page.goto` the Kudo, clicks Close, and expects `/sun-kudos`. Confidence: INFERRED, 0.7. It depends on Google skipping its account-chooser page, which E2E cannot reproduce.

### Low
2. `kudo-detail-close-button.tsx:16`: without the Navigation API, a Kudo opened in a new tab (middle-click from the board) keeps a same-origin `document.referrer`. Close then runs `router.back()` with no history, so nothing happens. Guard with `history.length > 1`.
3. `components/kudos/kudo-post-card.tsx:78`: the new feed-card `<Link>` uses the default prefetch. Every card that scrolls into view can fire an RSC prefetch request, which runs the proxy and `getClaims` on the Worker. `spotlight-node.tsx` already uses `prefetch={false}`. Consider the same here. (INFERRED)
4. `lib/kudos/kudo-content-blocks.ts:40`: the serializer never escapes markers at the start of a line. A paragraph pasted as `2025. Năm mới` renders as `<ol start=2025>`, and `>.<` renders as a quote. It is cosmetic and matches `kudoPlainText`. The fix belongs in the serializer: escape `^\d+\.` and `^>`.
5. `lib/navigation/routes.ts:24`: the comment on `kudoDetailHref` still says "route not built yet: resolves to 404". It is now out of date.
6. `supabase/verify/20261021120000_create_kudo_detail_rpc_verify.sql:135`: the anonymous fixture has no image or hashtag, so D3's "sender id nowhere in the row" never checks `images`. It is safe today because `create_kudo` only accepts flat `{uuid}.{ext}` names. Adding one image row would make the check cover that too.
7. `kudo-post-card.tsx:78`: the link's accessible name is the whole content text, and the line clamp is only visual. The plan's `allKudos.card.openDetail` key was dropped on purpose (UI report, deviation 3). Fine for now. A short `aria-label` or `aria-describedby` would keep long Kudos shorter for screen readers.

### Edge Cases Turned Up
- `next` hostile forms all give null: `//evil`, `/\evil`, `%2F…` in the path (proxy uses the raw pathname), a trailing `\n` (`$` without the `m` flag), fullwidth or Unicode digits (ASCII class), uppercase GUIDs (canonicalised to lowercase), arrays (`?next=a&next=b`), more than 64 chars, query or hash suffixes. The redirect base is always `request.url` or `origin` plus a path that starts with `/sun-kudos/`.
- Cookie: httpOnly, SameSite=Lax (sent on the cross-site top-level GET from Supabase), Secure in production, path `/`, 600 s, cleared with the same attributes on all 5 callback exits. It is written only after the authorize URL resolves. A missing Origin header leaves it untouched, and the callback clears it anyway.
- After a failed callback the target is gone (cleared), so a retry lands on `/`. This matches the "cleared on every exit" decision.
- ReDoS probe (node, scratchpad copy of the parser): 160–240k-char inputs of `[a](`×n, `@[a](`×n, `**_~~[`×n, `_a`×n, `***a`×n, `>`×200k, and 3000-deep indented lists each took 10–185 ms. Linear.
- `notFound()` runs before any Suspense on the page, and there is no `loading.tsx` anywhere under `app/[locale]`. So the 404 is a real status code (E2E tests 61 and 67).

### Done Well
- The allow-list is an exact match with a canonical return, checked again at each of the 4 hops (proxy, login page, action, callback). `next` is never interpolated into Supabase's `redirectTo`. The callback ignores query params.
- `kudo_detail` is a thin definer wrapper over `kudos_rows`, so the anonymity rule lives in one place. The account rule comes first, refused and unknown ids give the same 0 rows, and execute is revoked from public and anon. The verify script checks prosecdef, search_path, volatility, signature, return type, ACL and owner BYPASSRLS. It tests named, anonymous (strpos of the sender id), unknown, null and refused callers, and rolls everything back.
- The parser uses indexOf and patterns that exclude their own delimiters. First-closer-wins makes same-mark nesting impossible, blocks are capped at depth 8, there is no `dangerouslySetInnerHTML`, and links must pass `new URL` + protocol checks with `noopener noreferrer`. Strong unit tests: round trip through the real serializer, XSS and escapes, a 50k-repeat timing test.
- `getKudoDetail` validates the id with zod before any query, never throws, logs everything server-side and returns a generic error state.

### Actions In Order
1. Fix Medium #1 (previous-entry check) and add its E2E test. Optionally also #2.
2. Controller: attach the full E2E result and a 1440×1521 / 680-frame screenshot compared with `figma/` (criterion 6).
3. User runs the migration and verify in the Supabase SQL Editor (all rows PASS), then signs the riskGate.
4. Lows 3–7 when convenient. Docs are still pending (phase 03).

### Numbers
Re-ran the 7 new or changed unit files: 187/187 pass. Controller evidence: tsc 0, eslint 0, vitest 46 files / 725 tests, kudo-detail E2E 15/15. All touched files are under 200 lines (largest new: `kudo-content-blocks.ts`, 151).

### Still Unresolved
- Full E2E result and the Figma visual comparison: not in the evidence dir yet.
- Real SQL has not been run (the fake Supabase cannot prove it).
- Whether Google skips the chooser for this tenant (it decides how often Medium #1 hits).
- Docs (system-architecture, changelog) are not updated in this diff.
