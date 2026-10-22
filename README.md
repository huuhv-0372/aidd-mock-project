# SAA 2025 (AIDD mock project)

Next.js 16 (App Router, TypeScript) + Tailwind CSS v4. Supabase Auth (Google login, `@sun-asterisk.com` accounts only) is wired in; it deploys to Cloudflare Workers through OpenNext (`wrangler.jsonc`, `open-next.config.ts`). See `CLAUDE.md` for the stack and conventions.

## Run

```bash
npm install
cp .env.example .env.local   # then adjust EVENT_START_AT, AWARDS_CEREMONY_AT and the Supabase keys
npm run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest, `tests/unit/`) |
| `npm run preview` | OpenNext build, then a local workerd preview of the Worker |
| `npm run deploy` | OpenNext build, then `opennextjs-cloudflare deploy` |
| `npm run test:e2e` | `next build` then Playwright (`tests/e2e/`); starts four app servers on ports 3100-3103 plus a test-only fake Supabase on 127.0.0.1:54398 |

First time running e2e: `npx playwright install chromium`.

## Prelaunch gate

`proxy.ts` gates every route on the server environment variable `EVENT_START_AT` (see `.env.example`):

- Before that time, every route except `/countdown` and static assets redirects (307) to `/countdown`.
- After that time, `/countdown` redirects to `/login`; the gate lets other routes through (see Access control below for who may open them).
- `EVENT_START_AT` missing or invalid: the gate stays open (no countdown) and an error is logged on the server.
- Format: ISO 8601 with an explicit offset, e.g. `2025-12-01T09:00:00+07:00`. Server-only, never prefix with `NEXT_PUBLIC_`.

Once the event starts (or the countdown reaches zero) the redirect lands on `/login`.

To preview the countdown locally, set `EVENT_START_AT` to a future time in `.env.local`.

## Access control (default-deny)

After the gate, `proxy.ts` refreshes the session and an anonymous visitor may open only the exact paths in `PUBLIC_PATHS` (`lib/auth/constants.ts`): `/` (the homepage: guests see it with a login link in the header), `/login`, `/auth/callback`, `/countdown`, `/tieu-chuan-chung` (the community standards page, public by owner decision 2026-10-21), `/403` (the access-denied page, public by owner decision 2026-10-21: it carries no data). Every other path redirects (307) to `/login` (a guest on exactly `/sun-kudos/<guid>` gets `/login?next=/sun-kudos/<guid>` so sign-in returns to that Kudo, see Login below; unknown paths included, so a guest cannot probe which paths exist; a path of only slashes such as `//` counts as `/`). Add new public routes to that list. Static assets excluded by the matcher in `proxy.ts` do not go through this check. If the Supabase env is missing everyone counts as signed out, so everything outside the list redirects to `/login`. The proxy is only the first layer: pages that serve data must re-verify the session on the server.

## Homepage (`/`)

The SAA homepage (`app/[locale]/page.tsx`, `components/home/` plus the shared shell in `components/site-shell/`, images in `public/images/home/`) is reachable only after launch, and is public: guests and signed-in users both get it. Its countdown targets the awards ceremony time from the server-only env `AWARDS_CEREMONY_AT` (ISO 8601 with an explicit offset, e.g. `2026-12-26T18:30:00+07:00`; see `.env.example`), read in `lib/event/get-awards-ceremony-at.ts`. `EVENT_START_AT` only drives the prelaunch gate. If `AWARDS_CEREMONY_AT` is missing or invalid, the server logs `[home-countdown] AWARDS_CEREMONY_AT missing or invalid` and the countdown shows `00` with "Coming soon" hidden (same once the time has passed). On the Worker it is a `vars` entry in `wrangler.jsonc`.

- Header controls depend on the session, read on the server by `components/site-shell/header-session-controls.tsx` (`getIsAuthenticated()` in `lib/auth/get-is-authenticated.ts`, verified with `getClaims()`; any failure counts as a guest). It sits inside `<Suspense>` with a same-size placeholder as fallback, so `/` stays Partial Prerender. Signed in: notification bell plus account menu. Guest: a "Đăng nhập" link to `/login` (`components/site-shell/login-link.tsx`). The language selector is always shown.
- Account menu (signed in only): Profile (`/profile`) and Sign out. Sign out is the server action `lib/auth/sign-out.ts` (`scope: local`, this browser only) and always ends on `/login`. No Admin Dashboard item (no roles yet).
- The notification bell (signed in only) opens an empty panel (no notification data yet). The language selector (`components/ui/language-selector.tsx`, shared with `/login`) switches VI/EN (see Language below).
- Nav, CTA and award links point to `/awards-information` (with `#<slug>` per award), `/sun-kudos`, `/tieu-chuan-chung`, `/profile` (constants in `lib/navigation/routes.ts`). `/awards-information`, `/sun-kudos` and `/tieu-chuan-chung` are built (see below); `/profile` is not and shows the SAA 404 page (`app/[locale]/not-found.tsx`).
- Error pages (no header/footer; title, illustration, description and a "Về trang chủ" / "Back to home" button; shared frame `components/errors/error-screen.tsx`, images in `public/images/errors/`, copy in `messages/{vi,en}/not-found.ts` and `forbidden.ts`). **404** (`not-found.tsx`): a signed-in user on a path that does not exist gets HTTP 404 with this page; a guest on such a path is still redirected to `/login` (default-deny, see above). **403** (`forbidden.tsx`): `experimental.authInterrupts` is on in `next.config.ts`, so any route can `import { forbidden } from "next/navigation"` and call `forbidden()` to answer with this page; call it before the response starts streaming, otherwise the status stays 200. `/403` (`app/[locale]/403/page.tsx`) calls it as a public preview and returns HTTP 403. The home buttons are not in Figma (kept on request). The EN 404 copy and the EN 403 title come from Figma; the EN 403 description and all VI copy are team translations.
- The standards page (`app/[locale]/tieu-chuan-chung/page.tsx`, blocks in `components/standards/`, copy in `messages/{vi,en}/standards.ts`) is public: the footer "Tiêu chuẩn chung" link and the "Tiêu chuẩn cộng đồng" link in the Viết Kudo toolbar (opens a new tab) both land on it. It has the shared header and footer but no Viết Kudo widget; the footer link is marked `aria-current="page"` through `SiteFooter`'s optional `activeHref`.
- Hero image is now a ~315 KB WebP (`public/images/home/keyvisual-bg.webp`). `next/image` optimization on the Worker goes through the `IMAGES` binding in `wrangler.jsonc`.

## Awards Information (`/awards-information`)

The awards page (`app/[locale]/awards-information/page.tsx`, blocks in `components/awards/`) is not in `PUBLIC_PATHS`, so it needs a signed-in user: anonymous visitors are redirected (307) to `/login`. It reuses the header, footer, Kudos block and widget button from `components/site-shell/` (shared with the homepage). The sticky category menu (`components/awards/awards-nav.tsx`) highlights the award in view and follows `#<slug>` (`useActiveAward` in `components/awards/use-active-award.ts`; pure helpers in `lib/awards/`). The six slugs live in `lib/navigation/routes.ts`. Any path that does not exist renders `app/[locale]/not-found.tsx`.

## Sun* Kudos (`/sun-kudos`)

The Live board (`app/[locale]/sun-kudos/page.tsx`, blocks in `components/kudos/`, data and helpers in `lib/kudos/`) is not in `PUBLIC_PATHS`, so it needs a signed-in user. It shows Highlight Kudos, the Spotlight Board (streamed in its own `<Suspense>`), All Kudos with infinite scroll (Server Action `loadMoreKudos`), personal stats and the latest gift recipients. The compose pill opens the write modal (see Write Kudo below); the profile search is display-only; hearts are toggled in place (see Like Kudos below). Filters live in the URL (`?hashtag=<slug>&department=<code>`; unknown values are ignored). Each block loads independently: a failed read is logged on the server and only that block shows a generic error.

Data comes from `supabase/migrations/20261015100000_create_kudos.sql`: ten tables with RLS on all of them, read only through five `SECURITY DEFINER` functions (`kudos_feed`, `kudos_highlight`, `kudos_spotlight`, `kudos_my_stats`, `kudos_latest_gift_recipients`), because an anonymous Kudo must hide its sender and RLS cannot hide a column. Apply it by hand like the profiles migration (it adds a foreign key on `profiles.department` and briefly locks `profiles`: run off-peak), then run `supabase/verify/20261015100000_create_kudos_verify.sql`. It was applied to the real Supabase project on 2026-10-15 and the verify script passed 20/20; run it the same way in each new environment. Rollback: `supabase/rollbacks/20261015100000_create_kudos_down.sql`. Demo data (demo environments only, never production): `supabase/seed/20261015_kudos_demo_seed.sql`, removed by `kudos_demo_seed_cleanup.sql`. Open product question: whether hearts count for the sender or the recipient (currently the sender, one line in `kudos_my_stats`). Details: `docs/codebase-summary.md`.

## View Kudo (`/sun-kudos/<id>`)

One Kudo in full (`app/[locale]/sun-kudos/[id]/page.tsx`, Figma 520:18779; frame in `components/kudos/kudo-detail-{layout,card,close-button}.tsx`). Not in `PUBLIC_PATHS`: signed-in only. It is reached from "Xem chi tiết" on a Highlight card, the content box of an All Kudos card, the Spotlight Board and any shared Copy Link URL (`kudoDetailHref` in `lib/navigation/routes.ts`). A malformed id (`kudoIdSchema`, checked before any query) or an id with no row answers HTTP 404 through `notFound()`; a failed read shows a generic error inside the frame (details only in the server log). Data comes from the RPC `kudo_detail(p_id uuid)` (`lib/kudos/get-kudo-detail.ts`), which returns the same row shape as the feed and hides the sender of an anonymous Kudo.

The stored Markdown subset is rendered with its formatting by `components/kudos/kudo-rich-content.tsx` on top of `lib/kudos/kudo-content-blocks.ts`: bold, italic, strike, numbered lists, quotes, links and `@Name` mentions (shown as bold text). Everything goes through React (no `dangerouslySetInnerHTML`), only absolute `http(s)` links become `<a>` (new tab, `rel="noopener noreferrer"`; `URL.canParse` runs first so invalid targets stay cheap), `@Name` is a mention only when its target is uuid-shaped, and the parser is linear on untrusted text. The serializer escapes a typed line-start `N.` or `>` (`N\.`, `\>`) so it stays text; a bare marker from older content (`2025.` with nothing continuing it, a quote of only `>`) also reads as text. The board card text (`lib/kudos/kudo-plain-text.ts`) strips only the markers this page reads. Keyboard focus rings on cream Kudo cards use the dark `login-bg` colour (`components/kudos/kudo-card-focus-ring.ts`), and Montserrat loads 400/500/700/800/900. The Close button goes back only when the previous same-site Navigation API entry exists and is not `/login`, otherwise to `/sun-kudos`. The page has no footer and no Write-KUDOS widget (the design has neither).

Apply `supabase/migrations/20261021120000_create_kudo_detail_rpc.sql` by hand like the others (needs the profiles and kudos migrations first; idempotent, one transaction), then run `supabase/verify/20261021120000_create_kudo_detail_rpc_verify.sql` (every row must be PASS). Rollback: `supabase/rollbacks/20261021120000_create_kudo_detail_rpc_down.sql`. **Status: applied on the real Supabase project on 2026-10-21; verify 6/6 PASS** (owner confirmation, `plans/261021-view-kudo/clarifications.md`). E2E (`tests/e2e/kudo-detail.spec.ts`) uses the fake Supabase, so run migration and verify in each new environment.

## Like Kudos (#13)

The heart on a Kudo card (`components/kudos/kudo-hearts.tsx`) is a toggle button (`aria-pressed`). One provider (`KudoHeartsProvider`, `components/kudos/kudo-hearts-store.tsx`, mounted in `app/[locale]/sun-kudos/page.tsx`) holds the state of every card, so a Kudo shown in both Highlight and All Kudos changes in both. A click flips the heart and the count at once and locks the button (`aria-disabled`, extra clicks dropped) until the server answers; the answer replaces the guess. A refusal or failure puts the old value back and shows a toast (`hearts.error` in `messages/{vi,en}/kudos.ts`; the toast is the shared `components/ui/status-toast.tsx`, also used by Copy Link). The viewer's own Kudo has a `disabled` heart.

The Server Action `setKudoHeart` (`lib/kudos/set-kudo-heart-action.ts`) validates `{ kudoId, liked }` with zod (`setKudoHeartInputSchema` in `lib/validation/kudos.ts`), calls the RPC `set_kudo_heart(p_kudo_id uuid, p_liked boolean)` and returns the database's `liked` and `heart_count`; errors are logged and the client only gets `"own"` or `"generic"`. The RPC **sets** the state (it is not a toggle, so repeated or overlapping calls cannot flip each other), is the only write path to `kudo_hearts`, is granted to `authenticated` only, and refuses with SQLSTATE `22023` and the message `forbidden`, `not_found` or `own_kudo` (checked in that order). The x1/x2 award stays in the triggers of `20261015100000_create_kudos.sql`: `hearts_awarded` is 2 while a row of `special_heart_days` covers now (configured by SQL only, no admin UI), so unliking takes back exactly what the like gave. Hearts are credited to the Kudo's **sender** (`kudos_my_stats.hearts_received`); the number on a card is the count of likes (`heart_count`), not the hearts awarded.

Apply `supabase/migrations/20261020150000_create_kudo_heart_rpc.sql` by hand like the others (needs the profiles and kudos migrations first; idempotent, one transaction), then run `supabase/verify/20261020150000_create_kudo_heart_rpc_verify.sql` (checks H1-H6, every row must be PASS; its writes are rolled back). Rollback: `supabase/rollbacks/20261020150000_create_kudo_heart_rpc_down.sql` (removes only the RPC; hearts already given stay). **Status: applied on the real Supabase project on 2026-10-20, verify 7/7 PASS (H1-H6 + H1b), plus a real like through Google sign-in**; run migration and verify in each new environment. E2E (`tests/e2e/kudo-hearts.spec.ts`) uses the fake Supabase, which mirrors the RPC in `tests/e2e/support/kudo-hearts-fake.mjs`.

## Write Kudo (#12)

The floating widget on `/`, `/awards-information` and `/sun-kudos` (`components/site-shell/widget-button.tsx`) opens a menu: "Thể lệ" (rules panel), "Viết KUDOS" (write modal) and a close button. The pill A.1 on `/sun-kudos` opens the same modal. Each of the three pages is wrapped in `KudosComposer` (`components/kudos-compose/`). On `/`, which is public, the widget reads the session in its own `<Suspense>` (`WidgetSessionGate`): a guest can read the rules, and "Viết KUDOS" links to `/login`. The editor (Tiptap v3, `@tiptap/*` pinned to 3.31.4) is loaded client-side only, on first open.

Recipient and mentions (`components/kudos-compose/recipient-picker.tsx`, `kudo-mention-extension.ts`): "Người nhận" takes plain text (matches name or email) or "@name" (names only). No match shows "Không tìm thấy Sunner phù hợp"; text typed but not picked shows "Hãy chọn người nhận trong danh sách gợi ý". In the editor, "@" lists Sunners at once, names may contain spaces, and the list closes when an unmatched `@word` continues as plain text. "+ Image" disappears once 5 images are attached; typed editor text is weight 500 (Figma only specifies the placeholder). The modal follows the Figma frame `ihQ26W78P2`; only the required asterisk uses `Noto_Sans_JP` 700 (`app/[locale]/layout.tsx`, `preload: false`).

Sending goes through the Server Action `createKudo` (`lib/kudos/create-kudo-action.ts`; helpers `search-sunners-action.ts` and `get-hashtag-options-action.ts` are read-only):

- Input is validated with zod (`lib/validation/write-kudo.ts`): title 1-100 characters, content 1-5000, 1-5 distinct hashtags, up to 5 images, alias up to 50 (anonymous only), a best-effort check that link targets are `http(s)` or `@[Name](uuid)` mentions (it only sees `[label](target)` forms with no `[` in the label: nested-bracket links, `<javascript:…>` autolinks and reference-style links pass, so it is not a barrier even against a forged client). The content length limit is checked first (`abort: true`) so an oversized body never reaches the later checks, and the form also flags it while typing. Content is stored as the Markdown subset `**b** _i_ ~~s~~ 1. > [t](https://…) @[Name](uuid)` (`lib/kudos/kudo-content-markdown.ts`).
- Images (`lib/kudos/kudo-image-file.ts`): type taken from the magic bytes (JPEG, PNG, WebP), at most 5 MB each, and personal metadata is stripped before upload, best-effort and only on the UI / Server Action path (a direct Storage upload with the publishable key skips it). JPEG keeps only the Orientation tag and drops APP1/APP11/APP13/COM (a deny-list: other APPn segments stay); PNG and WebP metadata chunks and anything after the image are dropped. Files go to the Storage bucket `kudo-images` as flat `{uuid}.{ext}` objects, so the public URL of an anonymous Kudo does not reveal the sender.
- `next.config.ts` sets `experimental.serverActions.bodySizeLimit` and `experimental.proxyClientMaxBodySize` to `26mb` (5 images of 5 MB plus text in one request). Raise both together.
- Errors are logged on the server; the client only gets a generic code. Uploaded images are removed only when the Kudo cannot exist (a failure before the RPC is sent, or an RPC error with a code); an unknown outcome such as a network error or timeout keeps them, so orphan images are possible. If the hashtag catalog fails to load, the dropdown shows an alert with "Thử lại"; Esc inside a dropdown in the modal closes only the dropdown.

Apply `supabase/migrations/20261019110000_create_kudo_write.sql` by hand like the others (needs the profiles and kudos migrations first), then run `supabase/verify/20261019110000_create_kudo_write_verify.sql` (every row must be PASS). Rollback: `supabase/rollbacks/20261019110000_create_kudo_write_down.sql`. It adds the RPCs `create_kudo` (the only write path; the sender is always `auth.uid()`) and `kudos_search_sunners(p_query, p_limit, p_name_only)` (name or email match with exact email first, `p_name_only` = names only, a blank query lists up to 10 named Sunners, never returns email), the helper `kudos_unaccent`, and the bucket `kudo-images` with own-object INSERT/SELECT/DELETE policies. **Status: run on the real Supabase project on 2026-10-19, verify 16/16 PASS**, plus one real authenticated upload (`plans/261019-1022-write-kudos/reports/db-verify-result.md`); run it the same way in each new environment. The E2E tests use a fake Supabase that mirrors this SQL.

Known limits: sending 5 images of 5 MB passed on local workerd only; the Cloudflare 128 MB isolate limit is untested on a deployed Worker (risk accepted by the owner). `create_kudo` does not validate link targets in `content` (only the Server Action does), and the Server Action check is incomplete (see above); the board renders plain text and the View Kudo page sanitises link targets on read (only `http(s)` becomes a link), so the risk is contained at render time, not at write time; any new Markdown renderer must do the same. `kudos_search_sunners` never returns an email, but it matches email substrings, so a signed-in user can probe emails. The English strings in `messages/en/kudos-compose.ts` are our own translations awaiting organizer review (`plans/261019-1022-write-kudos/reports/en-localizations.md`). Details: `docs/codebase-summary.md`.

## Login (Google via Supabase)

`/login` signs in with Google through Supabase (PKCE). After the gate, `proxy.ts` refreshes the session with `getClaims()`; a signed-in user opening `/login` is redirected to `/` (or to a valid `?next`, below). The OAuth callback is `/auth/callback`; failures return to `/login?error=auth_failed`.

Only Google accounts with an `@sun-asterisk.com` email may sign in (`ALLOWED_EMAIL_DOMAIN` in `lib/auth/constants.ts`, exact-domain match in `lib/auth/is-allowed-email.ts`). Three layers: sign-in sends the Google hint `hd=sun-asterisk.com` (UX only); `/auth/callback` signs out and returns the generic error for any other email; the database rejects new non-domain sign-ups (see Profiles below).

Returning to a Kudo after sign-in: the only post-login target besides `/` is `/sun-kudos/<guid>`, passed as `?next=` (`lib/auth/post-login-next.ts`). It is an allow-list, not a sanitiser: `parsePostLoginNext` accepts exactly that shape (no query, hash, trailing slash or encoding) and returns null for anything else, so no redirect can leave the site or reach another path. The value is re-checked at the proxy, the login page, the Server Action `signInWithGoogle` and the callback. It crosses the Google round trip in the cookie `saa_post_login_next` (`httpOnly`, `SameSite=Lax`, `Secure` in production, 10 minutes), not in `redirectTo`; the callback re-checks it and clears it on every exit. The clear goes through `cookies()` (`lib/auth/clear-post-login-next-cookie.ts`), not `response.cookies`: on Next 16.4 the response's own `Set-Cookie` is re-parsed once the store was written, and that parser drops `Max-Age=0`. It lives in its own module because importing `next/headers` straight into the route duplicated a ~296 KB server chunk.

- Env (see `.env.example`, read at runtime): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. If missing, the app logs an error and treats everyone as signed out.
- Supabase dashboard: enable the Google provider and allow `<your-origin>/auth/callback` as a redirect URL. Disable the Email, Phone and Anonymous providers (the profiles migration assumes Google is the only way in). Production also needs both variables set on the Worker.
- `npm run test:e2e` passes fake Supabase values, so no real project is needed for the tests.

## Language (VI/EN)

The UI is Vietnamese (default) or English. Public URLs carry no locale: the language selector (`components/ui/language-selector.tsx`) calls the Server Action `setLocale` (`lib/i18n/set-locale-action.ts`), which stores the httpOnly cookie `NEXT_LOCALE`, then reloads the page. `proxy.ts` reads the cookie and rewrites internally to `app/[locale]/` (`lib/i18n/resolve-locale-rewrite.ts`); a missing or unknown value means `vi`. `app/auth/*` is outside `[locale]`.

- All copy lives in `messages/vi/*` and `messages/en/*`. `messages/vi` defines the `Dictionary` type and `messages/en` must satisfy it, so a missing English key fails `npm run build`. Pages read it with `getRouteDictionary` (`lib/i18n/get-dictionary.ts`).
- English strings that do not come from Figma are marked `/* not from Figma */` in `messages/en/*` and await review; the list is in `plans/261014-1115-multi-language-vi-en/reports/en-localizations.md`.
- Known limits: the 404 and 403 bodies are client-rendered; `Cache-Control: private, no-cache` on the rewritten response is not yet verified on OpenNext/Cloudflare. See `docs/project-changelog.md`.

## Profiles (Supabase)

`public.profiles` holds one row per allowed user (`id` -> `auth.users`, `email`, `full_name`, `avatar_url`, `department`, timestamps). Triggers fill email from `auth.users` and name/avatar from the Google identity; `department` is never written by them. RLS: authenticated users passing the account rule (`@sun-asterisk.com` email and `app_metadata.provider = 'google'`) can read all rows; there are no client writes and `anon` gets nothing. Server code reads the caller's own row with `getCurrentProfile()` (`lib/profiles/get-current-profile.ts`), which returns `null` on any failure.

There is no Supabase CLI here: the SQL in `supabase/` is applied by hand in the Supabase SQL Editor (role `postgres`).

| File | Use |
|---|---|
| `supabase/migrations/20261012133000_create_profiles.sql` | Create table, rules, RLS, triggers, sign-up gate, backfill (idempotent, one transaction) |
| `supabase/verify/20261012133000_create_profiles_verify.sql` | Numbered checks; run one block at a time |
| `supabase/rollbacks/20261012133000_create_profiles_down.sql` | Drop triggers, functions, table (deletes profile rows) |

Before running the migration, disable the Email, Phone and Anonymous providers (Authentication > Sign In / Providers). The migration briefly locks `auth.users` and `auth.identities`; run it off-peak. Runbook: `plans/261012-1330-user-profiles-supabase/phase-03-apply-and-verify.md`.

## Docs

- `docs/codebase-summary.md` — layout of the code, how the gate and the access control work.
- `docs/system/permissions.md` — who may open what (Vietnamese).
- `docs/project-changelog.md` — notable behaviour changes, newest first (Vietnamese).
- `docs/features/F001_CountdownPrelaunchGate/` — functional and technical spec of the gate.
- `docs/screens/SCR001_CountdownPrelaunch/spec.md` — countdown screen spec.
