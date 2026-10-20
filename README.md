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

After the gate, `proxy.ts` refreshes the session and an anonymous visitor may open only the exact paths in `PUBLIC_PATHS` (`lib/auth/constants.ts`): `/` (the homepage: guests see it with a login link in the header), `/login`, `/auth/callback`, `/countdown`. Every other path redirects (307) to `/login` (unknown paths included; a path of only slashes such as `//` counts as `/`). Add new public routes to that list. Static assets excluded by the matcher in `proxy.ts` do not go through this check. If the Supabase env is missing everyone counts as signed out, so everything outside the list redirects to `/login`. The proxy is only the first layer: pages that serve data must re-verify the session on the server.

## Homepage (`/`)

The SAA homepage (`app/[locale]/page.tsx`, `components/home/` plus the shared shell in `components/site-shell/`, images in `public/images/home/`) is reachable only after launch, and is public: guests and signed-in users both get it. Its countdown targets the awards ceremony time from the server-only env `AWARDS_CEREMONY_AT` (ISO 8601 with an explicit offset, e.g. `2026-12-26T18:30:00+07:00`; see `.env.example`), read in `lib/event/get-awards-ceremony-at.ts`. `EVENT_START_AT` only drives the prelaunch gate. If `AWARDS_CEREMONY_AT` is missing or invalid, the server logs `[home-countdown] AWARDS_CEREMONY_AT missing or invalid` and the countdown shows `00` with "Coming soon" hidden (same once the time has passed). On the Worker it is a `vars` entry in `wrangler.jsonc`.

- Header controls depend on the session, read on the server by `components/site-shell/header-session-controls.tsx` (`getIsAuthenticated()` in `lib/auth/get-is-authenticated.ts`, verified with `getClaims()`; any failure counts as a guest). It sits inside `<Suspense>` with a same-size placeholder as fallback, so `/` stays Partial Prerender. Signed in: notification bell plus account menu. Guest: a "Đăng nhập" link to `/login` (`components/site-shell/login-link.tsx`). The language selector is always shown.
- Account menu (signed in only): Profile (`/profile`) and Sign out. Sign out is the server action `lib/auth/sign-out.ts` (`scope: local`, this browser only) and always ends on `/login`. No Admin Dashboard item (no roles yet).
- The notification bell (signed in only) opens an empty panel (no notification data yet). The language selector (`components/ui/language-selector.tsx`, shared with `/login`) switches VI/EN (see Language below).
- Nav, CTA and award links point to `/awards-information` (with `#<slug>` per award), `/sun-kudos`, `/tieu-chuan-chung`, `/profile` (constants in `lib/navigation/routes.ts`). `/awards-information` and `/sun-kudos` are built (see below); the other two are not and show the SAA 404 page (`app/[locale]/not-found.tsx`).
- Hero image is now a ~315 KB WebP (`public/images/home/keyvisual-bg.webp`). `next/image` optimization on the Worker goes through the `IMAGES` binding in `wrangler.jsonc`.

## Awards Information (`/awards-information`)

The awards page (`app/[locale]/awards-information/page.tsx`, blocks in `components/awards/`) is not in `PUBLIC_PATHS`, so it needs a signed-in user: anonymous visitors are redirected (307) to `/login`. It reuses the header, footer, Kudos block and widget button from `components/site-shell/` (shared with the homepage). The sticky category menu (`components/awards/awards-nav.tsx`) highlights the award in view and follows `#<slug>` (`useActiveAward` in `components/awards/use-active-award.ts`; pure helpers in `lib/awards/`). The six slugs live in `lib/navigation/routes.ts`. Any path that does not exist renders `app/[locale]/not-found.tsx`.

## Sun* Kudos (`/sun-kudos`)

The Live board (`app/[locale]/sun-kudos/page.tsx`, blocks in `components/kudos/`, data and helpers in `lib/kudos/`) is not in `PUBLIC_PATHS`, so it needs a signed-in user. It shows Highlight Kudos, the Spotlight Board (streamed in its own `<Suspense>`), All Kudos with infinite scroll (Server Action `loadMoreKudos`), personal stats and the latest gift recipients. The compose pill opens the write modal (see Write Kudo below); the profile search is display-only and hearts cannot be toggled yet. Filters live in the URL (`?hashtag=<slug>&department=<code>`; unknown values are ignored). Each block loads independently: a failed read is logged on the server and only that block shows a generic error.

Data comes from `supabase/migrations/20261015100000_create_kudos.sql`: ten tables with RLS on all of them, read only through five `SECURITY DEFINER` functions (`kudos_feed`, `kudos_highlight`, `kudos_spotlight`, `kudos_my_stats`, `kudos_latest_gift_recipients`), because an anonymous Kudo must hide its sender and RLS cannot hide a column. Apply it by hand like the profiles migration (it adds a foreign key on `profiles.department` and briefly locks `profiles`: run off-peak), then run `supabase/verify/20261015100000_create_kudos_verify.sql`. It was applied to the real Supabase project on 2026-10-15 and the verify script passed 20/20; run it the same way in each new environment. Rollback: `supabase/rollbacks/20261015100000_create_kudos_down.sql`. Demo data (demo environments only, never production): `supabase/seed/20261015_kudos_demo_seed.sql`, removed by `kudos_demo_seed_cleanup.sql`. Open product question: whether hearts count for the sender or the recipient (currently the sender, one line in `kudos_my_stats`). Details: `docs/codebase-summary.md`.

## Write Kudo (#12)

The floating widget on `/`, `/awards-information` and `/sun-kudos` (`components/site-shell/widget-button.tsx`) opens a menu: "Thể lệ" (rules panel), "Viết KUDOS" (write modal) and a close button. The pill A.1 on `/sun-kudos` opens the same modal. Each of the three pages is wrapped in `KudosComposer` (`components/kudos-compose/`). On `/`, which is public, the widget reads the session in its own `<Suspense>` (`WidgetSessionGate`): a guest can read the rules, and "Viết KUDOS" links to `/login`. The editor (Tiptap v3, `@tiptap/*` pinned to 3.31.4) is loaded client-side only, on first open.

Recipient and mentions (`components/kudos-compose/recipient-picker.tsx`, `kudo-mention-extension.ts`): "Người nhận" takes plain text (matches name or email) or "@name" (names only). No match shows "Không tìm thấy Sunner phù hợp"; text typed but not picked shows "Hãy chọn người nhận trong danh sách gợi ý". In the editor, "@" lists Sunners at once, names may contain spaces, and the list closes when an unmatched `@word` continues as plain text. "+ Image" disappears once 5 images are attached; typed editor text is weight 500 (Figma only specifies the placeholder). The modal follows the Figma frame `ihQ26W78P2`; only the required asterisk uses `Noto_Sans_JP` 700 (`app/[locale]/layout.tsx`, `preload: false`).

Sending goes through the Server Action `createKudo` (`lib/kudos/create-kudo-action.ts`; helpers `search-sunners-action.ts` and `get-hashtag-options-action.ts` are read-only):

- Input is validated with zod (`lib/validation/write-kudo.ts`): title 1-100 characters, content 1-5000, 1-5 distinct hashtags, up to 5 images, alias up to 50 (anonymous only), a best-effort check that link targets are `http(s)` or `@[Name](uuid)` mentions (it only sees `[label](target)` forms with no `[` in the label: nested-bracket links, `<javascript:…>` autolinks and reference-style links pass, so it is not a barrier even against a forged client). The content length limit is checked first (`abort: true`) so an oversized body never reaches the later checks, and the form also flags it while typing. Content is stored as the Markdown subset `**b** _i_ ~~s~~ 1. > [t](https://…) @[Name](uuid)` (`lib/kudos/kudo-content-markdown.ts`).
- Images (`lib/kudos/kudo-image-file.ts`): type taken from the magic bytes (JPEG, PNG, WebP), at most 5 MB each, and personal metadata is stripped before upload, best-effort and only on the UI / Server Action path (a direct Storage upload with the publishable key skips it). JPEG keeps only the Orientation tag and drops APP1/APP11/APP13/COM (a deny-list: other APPn segments stay); PNG and WebP metadata chunks and anything after the image are dropped. Files go to the Storage bucket `kudo-images` as flat `{uuid}.{ext}` objects, so the public URL of an anonymous Kudo does not reveal the sender.
- `next.config.ts` sets `experimental.serverActions.bodySizeLimit` and `experimental.proxyClientMaxBodySize` to `26mb` (5 images of 5 MB plus text in one request). Raise both together.
- Errors are logged on the server; the client only gets a generic code. Uploaded images are removed only when the Kudo cannot exist (a failure before the RPC is sent, or an RPC error with a code); an unknown outcome such as a network error or timeout keeps them, so orphan images are possible. If the hashtag catalog fails to load, the dropdown shows an alert with "Thử lại"; Esc inside a dropdown in the modal closes only the dropdown.

Apply `supabase/migrations/20261019110000_create_kudo_write.sql` by hand like the others (needs the profiles and kudos migrations first), then run `supabase/verify/20261019110000_create_kudo_write_verify.sql` (every row must be PASS). Rollback: `supabase/rollbacks/20261019110000_create_kudo_write_down.sql`. It adds the RPCs `create_kudo` (the only write path; the sender is always `auth.uid()`) and `kudos_search_sunners(p_query, p_limit, p_name_only)` (name or email match with exact email first, `p_name_only` = names only, a blank query lists up to 10 named Sunners, never returns email), the helper `kudos_unaccent`, and the bucket `kudo-images` with own-object INSERT/SELECT/DELETE policies. **Status: run on the real Supabase project on 2026-10-19, verify 16/16 PASS**, plus one real authenticated upload (`plans/261019-1022-write-kudos/reports/db-verify-result.md`); run it the same way in each new environment. The E2E tests use a fake Supabase that mirrors this SQL.

Known limits: sending 5 images of 5 MB passed on local workerd only; the Cloudflare 128 MB isolate limit is untested on a deployed Worker (risk accepted by the owner). `create_kudo` does not validate link targets in `content` (only the Server Action does), and the Server Action check is incomplete (see above); this is safe today only because the board renders plain text, so fix it before any Markdown renderer exists and sanitise link targets on read. `kudos_search_sunners` never returns an email, but it matches email substrings, so a signed-in user can probe emails. The English strings in `messages/en/kudos-compose.ts` are our own translations awaiting organizer review (`plans/261019-1022-write-kudos/reports/en-localizations.md`). Details: `docs/codebase-summary.md`.

## Login (Google via Supabase)

`/login` signs in with Google through Supabase (PKCE). After the gate, `proxy.ts` refreshes the session with `getClaims()`; a signed-in user opening `/login` is redirected to `/`. The OAuth callback is `/auth/callback`; failures return to `/login?error=auth_failed`.

Only Google accounts with an `@sun-asterisk.com` email may sign in (`ALLOWED_EMAIL_DOMAIN` in `lib/auth/constants.ts`, exact-domain match in `lib/auth/is-allowed-email.ts`). Three layers: sign-in sends the Google hint `hd=sun-asterisk.com` (UX only); `/auth/callback` signs out and returns the generic error for any other email; the database rejects new non-domain sign-ups (see Profiles below).

- Env (see `.env.example`, read at runtime): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. If missing, the app logs an error and treats everyone as signed out.
- Supabase dashboard: enable the Google provider and allow `<your-origin>/auth/callback` as a redirect URL. Disable the Email, Phone and Anonymous providers (the profiles migration assumes Google is the only way in). Production also needs both variables set on the Worker.
- `npm run test:e2e` passes fake Supabase values, so no real project is needed for the tests.

## Language (VI/EN)

The UI is Vietnamese (default) or English. Public URLs carry no locale: the language selector (`components/ui/language-selector.tsx`) calls the Server Action `setLocale` (`lib/i18n/set-locale-action.ts`), which stores the httpOnly cookie `NEXT_LOCALE`, then reloads the page. `proxy.ts` reads the cookie and rewrites internally to `app/[locale]/` (`lib/i18n/resolve-locale-rewrite.ts`); a missing or unknown value means `vi`. `app/auth/*` is outside `[locale]`.

- All copy lives in `messages/vi/*` and `messages/en/*`. `messages/vi` defines the `Dictionary` type and `messages/en` must satisfy it, so a missing English key fails `npm run build`. Pages read it with `getRouteDictionary` (`lib/i18n/get-dictionary.ts`).
- English strings that do not come from Figma are marked `/* not from Figma */` in `messages/en/*` and await review; the list is in `plans/261014-1115-multi-language-vi-en/reports/en-localizations.md`.
- Known limits: the 404 body is client-rendered; `Cache-Control: private, no-cache` on the rewritten response is not yet verified on OpenNext/Cloudflare. See `docs/project-changelog.md`.

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
