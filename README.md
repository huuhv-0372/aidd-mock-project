# SAA 2025 (AIDD mock project)

Next.js 16 (App Router, TypeScript) + Tailwind CSS v4. Supabase Auth (Google login, `@sun-asterisk.com` accounts only) is wired in; Cloudflare Workers (OpenNext) is planned but **not installed yet**. See `CLAUDE.md` for the target stack and conventions.

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

After the gate, `proxy.ts` refreshes the session and an anonymous visitor may open only the exact paths in `PUBLIC_PATHS` (`lib/auth/constants.ts`): `/` (the homepage: guests see it with a login link in the header), `/login`, `/auth/callback`, `/countdown`. Every other path redirects (307) to `/login` (`//` and unknown paths included). Add new public routes to that list. Static assets excluded by the matcher in `proxy.ts` do not go through this check. If the Supabase env is missing everyone counts as signed out, so everything outside the list redirects to `/login`. The proxy is only the first layer: pages that serve data must re-verify the session on the server.

## Homepage (`/`)

The SAA homepage (`app/page.tsx`, `components/home/`, images in `public/images/home/`) is reachable only after launch, and is public: guests and signed-in users both get it. Its countdown targets the awards ceremony time from the server-only env `AWARDS_CEREMONY_AT` (ISO 8601 with an explicit offset, e.g. `2026-12-26T18:30:00+07:00`; see `.env.example`), read in `lib/event/get-awards-ceremony-at.ts`. `EVENT_START_AT` only drives the prelaunch gate. If `AWARDS_CEREMONY_AT` is missing or invalid, the server logs `[home-countdown] AWARDS_CEREMONY_AT missing or invalid` and the countdown shows `00` with "Coming soon" hidden (same once the time has passed). Production must set it on the Worker (`wrangler.jsonc` vars) once that file exists.

- Header controls depend on the session, read on the server by `components/home/header-session-controls.tsx` (`getIsAuthenticated()` in `lib/auth/get-is-authenticated.ts`, verified with `getClaims()`; any failure counts as a guest). It sits inside `<Suspense>` with a same-size placeholder as fallback, so `/` stays Partial Prerender. Signed in: notification bell plus account menu. Guest: a "Đăng nhập" link to `/login` (`components/home/login-link.tsx`). The language selector is always shown.
- Account menu (signed in only): Profile (`/profile`) and Sign out. Sign out is the server action `lib/auth/sign-out.ts` (`scope: local`, this browser only) and always ends on `/login`. No Admin Dashboard item (no roles yet).
- The notification bell (signed in only) opens an empty panel (no notification data yet). The language selector (`components/ui/language-selector.tsx`, shared with `/login`) is UI only.
- Nav, CTA and award links point to `/awards-information` (with `#<slug>` per award), `/sun-kudos`, `/tieu-chuan-chung`, `/profile` (constants in `lib/navigation/routes.ts`). Those pages are not built yet and return 404.
- Hero image is now a ~315 KB WebP (`public/images/home/keyvisual-bg.webp`). Before deploy: add the Cloudflare images binding (`next/image` optimization on OpenNext).

## Login (Google via Supabase)

`/login` signs in with Google through Supabase (PKCE). After the gate, `proxy.ts` refreshes the session with `getClaims()`; a signed-in user opening `/login` is redirected to `/`. The OAuth callback is `/auth/callback`; failures return to `/login?error=auth_failed`.

Only Google accounts with an `@sun-asterisk.com` email may sign in (`ALLOWED_EMAIL_DOMAIN` in `lib/auth/constants.ts`, exact-domain match in `lib/auth/is-allowed-email.ts`). Three layers: sign-in sends the Google hint `hd=sun-asterisk.com` (UX only); `/auth/callback` signs out and returns the generic error for any other email; the database rejects new non-domain sign-ups (see Profiles below).

- Env (see `.env.example`, read at runtime): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. If missing, the app logs an error and treats everyone as signed out.
- Supabase dashboard: enable the Google provider and allow `<your-origin>/auth/callback` as a redirect URL. Disable the Email, Phone and Anonymous providers (the profiles migration assumes Google is the only way in). Production also needs both variables set on the Worker.
- `npm run test:e2e` passes fake Supabase values, so no real project is needed for the tests.

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
