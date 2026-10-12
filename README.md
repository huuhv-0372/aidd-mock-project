# SAA 2025 (AIDD mock project)

Next.js 16 (App Router, TypeScript) + Tailwind CSS v4. Supabase Auth (Google login, `@sun-asterisk.com` accounts only) is wired in; Cloudflare Workers (OpenNext) is planned but **not installed yet**. See `CLAUDE.md` for the target stack and conventions.

## Run

```bash
npm install
cp .env.example .env.local   # then adjust EVENT_START_AT and the Supabase keys
npm run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest, `tests/unit/`) |
| `npm run test:e2e` | `next build` then Playwright (`tests/e2e/`); starts three servers on ports 3100-3102 |

First time running e2e: `npx playwright install chromium`.

## Prelaunch gate

`proxy.ts` gates every route on the server environment variable `EVENT_START_AT` (see `.env.example`):

- Before that time, every route except `/countdown` and static assets redirects (307) to `/countdown`.
- After that time, `/countdown` redirects to `/login`; other routes pass through.
- `EVENT_START_AT` missing or invalid: the gate stays open (no countdown) and an error is logged on the server.
- Format: ISO 8601 with an explicit offset, e.g. `2025-12-01T09:00:00+07:00`. Server-only, never prefix with `NEXT_PUBLIC_`.

Once the event starts (or the countdown reaches zero) the redirect lands on `/login`.

To preview the countdown locally, set `EVENT_START_AT` to a future time in `.env.local`.

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

- `docs/codebase-summary.md` — layout of the code and how the gate works.
- `docs/features/F001_CountdownPrelaunchGate/` — functional and technical spec of the gate.
- `docs/screens/SCR001_CountdownPrelaunch/spec.md` — countdown screen spec.
