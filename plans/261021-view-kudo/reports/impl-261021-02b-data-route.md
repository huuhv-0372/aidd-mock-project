# Phase 02b — data + route + rich content (View Kudo)

Status: DONE_WITH_CONCERNS (SQL not executed: no Postgres here; the user runs migration + verify in the Supabase SQL editor).

## Files (lines)
| File | Lines | |
|---|---|---|
| supabase/migrations/20261021120000_create_kudo_detail_rpc.sql | 39 | new |
| supabase/rollbacks/20261021120000_create_kudo_detail_rpc_down.sql | 11 | new |
| supabase/verify/20261021120000_create_kudo_detail_rpc_verify.sql | 162 | new |
| lib/kudos/get-kudo-detail.ts | 44 | new |
| lib/kudos/kudo-content-blocks.ts | 151 | new (pure parser) |
| components/kudos/kudo-rich-content.tsx | 55 | new (server component) |
| app/[locale]/sun-kudos/[id]/page.tsx | 47 | new |
| lib/validation/kudos.ts | +3 | `export const kudoIdSchema = pgUuid` (z.guid) |
| tests/unit/get-kudo-detail.test.ts | 74 | new, 13 tests |
| tests/unit/kudo-content-blocks.test.ts | 179 | new, 25 tests |
| tests/unit/kudo-rich-content.test.ts | 34 | new, 3 tests (renderToStaticMarkup) |

## Acceptance
- RPC `kudo_detail(p_id uuid) returns setof public.kudo_row`: plpgsql, stable, security definer, `set search_path = ''`, account rule first (refused → `return;` = 0 rows), then `kudos_rows(array[p_id], auth.uid())` (unknown/null id → 0 rows). `revoke ... from public, anon; grant ... to authenticated`. No new field; sender nulling comes from `kudos_rows`.
- Verify (same style as heart verify: pg_temp functions, `set local role` + `request.jwt.claims`, sub-block rolled back): D1 definer/search_path/stable/account rule/owner bypasses RLS/signature/SETOF kudo_row/no PUBLIC + authenticated yes, anon no; D2 named Kudo 1 row with sender/recipient/content; D3 anonymous Kudo sender null for viewer AND the real sender, sender uuid appears nowhere in the row JSON, alias kept, is_mine only for the sender; D4 unknown/null id → 0 rows; D5 wrong domain / non-Google / no claims → 0 rows; D1b anon → 42501.
- `getKudoDetail(id, client?)`: `kudoIdSchema` (z.guid) first → not_found with no query; `rpc("kudo_detail", { p_id })`; `z.array(kudoRowSchema).max(1)`; 0 rows → not_found; RPC error / malformed / >1 row / throw → `console.error("[kudos] kudo_detail ...")` → error. Never throws.
- Parser: paragraph per non-blank line (serializer writes paragraphs and hard breaks both as `\n`), `N. ` ordered list (consecutive numbering; a restart begins a new `<ol start>`), INDENT (3 spaces) continuation/nesting inside items, `> ` / `>` quotes parsed recursively, nesting capped at 8. Inlines: `**`, `_`, `~~`, `[t](url)` (http/https only, normalised `URL.href`; otherwise label only), `@[Name](uuid)` → mention, escapes via private-use placeholders (as kudo-plain-text.ts); a backslash inside a link target is restored as written.
- Renderer: `<p>`, `<ol start>/<li>`, `<blockquote>`, `<strong>/<em>/<s>`, `<a target="_blank" rel="noopener noreferrer">`, mention `<strong>@Name</strong>`. Returns a fragment, unstyled: Track A's `KudoDetailCard` styles it from the container (`RICH_CONTENT`: `[&>*+*]`, `[&_ol]`, `[&_blockquote]`, `[&_a]`), so one owner for styling.
- Page: awaits params, `getRouteDictionary` (bad locale 404), `createSupabaseServerClient`, `getKudoDetail`; `notFound()` before any render, no Suspense/loading.tsx above it; error → `<p role="alert">{loadError}</p>` (layout's ALERT_CARD dresses it); ok → `KudoHeartsProvider(setKudoHeart)` + `KudoDetailCard(content=<KudoRichContent/>)`. `generateMetadata` → `dict.kudos.detail.metaTitle`. No `connection()`: `cacheComponents` is off and the board page (same pattern) has none; the client is created outside any try/catch.
- Fixture DETAIL_CONTENT (unit + render): 1 strong "bạn", 1 em "luôn", 1 s "việc gấp", 1 ol with 3 li, blockquote "Một đồng đội giỏi là người biết chia sẻ.", 1 link `https://example.com/x`, mention "@Nguyễn Thị Minh Anh", literal "Dấu sao *nguyên văn* không phải chữ nghiêng.", exactly one `<a>` (no anchor for "mở ngay").

## Evidence
- RED first: kudo-content-blocks and get-kudo-detail tests failed on the missing module before the code existed (render test was written alongside the component, not observed RED separately).
- `npx vitest run` → 46 files, 725 tests passed, exit 0.
- `npx tsc --noEmit -p .` → exit 0 (Track A exports present).
- `npx eslint <own files>` → exit 0.
- ReDoS: 50k-char runs of `* _ ~ [ @[ [a]( **_ \` parse in ~4–17 ms; 100k ≤ 43 ms (linear). Test ceiling 250 ms (first draft at 100 ms flaked once at 104 ms cold; quadratic would be seconds).

## Security checklist
- [x] security definer + `search_path = ''` + account rule FIRST (verify D1)
- [x] no execute for anon / PUBLIC (D1, D1b)
- [x] no sender leak for anonymous Kudos: no new field; sender null via kudos_rows; D3 asserts the sender uuid is absent from the whole row
- [x] id validated (z.guid) before any query; malformed → 404 without a round trip
- [x] no raw error to the client: full log server-side, page shows `dict.kudos.detail.loadError`
- [x] no `dangerouslySetInnerHTML`; render test proves `<img onerror>` / `<script>` come out escaped
- [x] only absolute http(s) links, `target="_blank" rel="noopener noreferrer"`; javascript:/data:/relative/ftp/bare-host → label text only
- [x] linear parsing: delimiters by indexOf (first closer wins, so same-mark nesting is impossible and a missing closer is found once), link/mention patterns exclude their own delimiters (`[^[\]]*`, `[^()]*`), block nesting capped at 8 (no stack overflow on `>>>>…`, tested with 20k)

## Deviations / notes
- Hand-made `[mở ngay](javascript:alert(1))` (raw parentheses in the target) is not a link token for this grammar (targets exclude `(`/`)` to stay linear, exactly like kudo-plain-text.ts; the serializer percent-encodes parentheses), so it shows as literal text `[mở ngay](javascript:alert(1))` — never an anchor. The "label only" rule applies to well-formed tokens with a non-http(s) target (e.g. `javascript:alert%281%29`). Matching balanced parentheses would need a pattern that is not provably linear on untrusted input. E2E only requires no anchor and no `@[` / `](https://example.com/x)` leaks: satisfied.
- Escape helpers duplicated from kudo-plain-text.ts (6 lines) because that file is outside this task's ownership; candidate to share later.
- `lib/validation/kudos.ts`: added `kudoIdSchema` (alias of the existing z.guid `pgUuid`).
- Nothing committed; no build/E2E/servers run.

## Open
- User must run the migration then the verify file in the Supabase SQL editor (every row PASS) before riskGate.
