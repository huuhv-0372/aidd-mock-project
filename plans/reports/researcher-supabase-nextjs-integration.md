# Research: Supabase + Next.js 16 App Router on Cloudflare Workers

Date: 2026-10-08 | Sources: Supabase official docs (server-side auth guide, API keys migration guide), Cloudflare Workers/OpenNext docs, `cloudflare/next-on-pages` GitHub issues & supported-features doc, `supabase/supabase-js` GitHub issue, Cloudflare blog, 3+ independent community write-ups cross-checked against official docs.

## 1. Package choice

- **Use `@supabase/ssr` + `@supabase/supabase-js`.** `@supabase/auth-helpers-nextjs` is deprecated — official docs point exclusively to `@supabase/ssr` now. Confirmed by Supabase's own server-side-auth guide (updated for App Router: Server Components, Route Handlers, middleware).
- Install: `npm install @supabase/supabase-js @supabase/ssr`. No fixed "latest version" pin found worth hardcoding in a report — resolve to current `^2.x` of `@supabase/ssr` at install time; don't pin a stale version in docs.

## 2. Client setup pattern + edge runtime interaction — THE KEY FINDING

Three clients, all built on `createBrowserClient` / `createServerClient` from `@supabase/ssr`, cookie-based (not localStorage):
- **Browser client** — Client Components, uses `createBrowserClient(url, key)`.
- **Server client** — Server Components/Actions/Route Handlers, uses `createServerClient` with a `cookies` adapter exposing `getAll()` / `setAll()`. Server Components can't write cookies — writes only take effect via middleware or Route Handlers/Actions.
- **Middleware client** — same `createServerClient`, `getAll`/`setAll` wired to the Next.js `request`/`response` cookie objects; must call `supabase.auth.getClaims()` (not `getSession()` — official docs warn `getSession()` inside server code trusts unverified cookie data) every request to refresh tokens, then copy cookies onto the outgoing response or sessions silently die.

**Cloudflare runtime — this reshapes the question as asked.** The two deployment paths behave oppositely, and this bears directly on the parallel adapter-choice task:

| Adapter | Runtime Next.js actually runs in | Node API access | Supabase/@supabase-ssr fit |
|---|---|---|---|
| `@opennextjs/cloudflare` | **Node.js runtime** on workerd (Edge runtime is explicitly *not supported* — Cloudflare's own OpenNext docs say to strip any `export const runtime = 'edge'`), via `nodejs_compat` flag (compat date ≥ 2024-09-23) | Broad — crypto, dns, timers, tls, net now natively implemented; rest via `unenv` shim | **Clean fit.** No special handling needed. |
| `@cloudflare/next-on-pages` | **Edge runtime only** — every route must be `export const runtime = 'edge'` | None of Node's `fs`/`buffer`/`path`, limited `crypto` | **Documented breakage.** `cloudflare/next-on-pages` issue #241: Supabase projects fail to build (`Cannot read properties of undefined (reading 'module')`); also fails resolving `buffer` (pulled in transitively via `js-base64`). A recent `supabase-js` build-warning issue (#1515) is a separate, cosmetic deprecation-warning problem, not a blocker — but the buffer/module failures are. |

**Bottom line for the parallel adapter decision:** if Supabase is in the stack, `@opennextjs/cloudflare` is the only adapter with a clean story. `next-on-pages` requires the whole app to survive pure Edge runtime with no large/Node-dependent deps — Supabase's SDK chain doesn't clear that bar today. This should be treated as a hard constraint feeding the other research task, not just a preference.

## 3. Folder structure

Matches the project's "single-purpose module, lib/service layer" convention:

```
lib/
  supabase/
    client.ts       # createBrowserClient() — browser-only singleton
    server.ts       # createServerClient() for Server Components/Actions/Route Handlers
    middleware.ts    # createServerClient() wired for middleware + session-refresh helper
middleware.ts         # root middleware, calls lib/supabase/middleware's updateSession()
```
Each file stays well under 200 lines — this is the pattern in Supabase's own quickstart (they use `utils/supabase/*`; `lib/supabase/*` is equivalent and fits this repo's existing `lib/` convention better — no reason to introduce a second top-level dir for the same purpose, which would violate DRY/KISS).

## 4. Auth flow best practice

- **Server Actions** for sign-in / sign-up / sign-out (password or OAuth-initiate) — form-native, no extra endpoint, works with `useFormState`/`useActionState`.
- **Route Handler** specifically for the OAuth/email `auth/confirm` callback (`exchangeCodeForSession`) — this one genuinely needs a URL Supabase redirects to.
- **Middleware** runs on every request to call `getClaims()`, refresh the session, and write the rotated cookies back onto the response — skipping this is the most common cause of "user randomly logged out" reports in the sources reviewed.
- Client-side: an `onAuthStateChange` listener + `router.refresh()` keeps Server Component data in sync after a token refresh triggered client-side.

## 5. Security basics (non-negotiable, confirmed across official docs + security retro)

- **RLS on every table, no exceptions.** The anon/publishable key is public by design — it is shipped to the browser. Without RLS, that key alone can read/write any row.
- **Never trust `getSession()` server-side** — only `getClaims()` validates the JWT signature; a plain cookie read can be forged. (Same point, restated: don't gate authorization decisions on unverified session data.)
- **Secret/service_role key is server-only** — never import it in any file reachable by a Client Component or anything bundled for the browser; never prefix it `NEXT_PUBLIC_*`.

## 6. Environment variables — correction to the question's assumed names

The question assumes `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`. **That naming is legacy and actively being retired** (official Supabase migration guide + GitHub discussions #29260, #40300, corroborated by the security retro post):

- Supabase began deprecating anon/service_role JWT keys mid-2025; **projects created from Nov 2025 onward no longer get legacy keys at all** — only the new key pair. A fresh project today (Oct 2026) will only have the new keys.
- **Use the current pair:**
  - `NEXT_PUBLIC_SUPABASE_URL` — safe in browser, as before.
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`) — replaces anon key, safe in browser; relies on RLS exactly like the old anon key did.
  - `SUPABASE_SECRET_KEY` (`sb_secret_...`) — replaces service_role key, server-only, bypasses RLS, never bundled client-side.
- Old env var names (`..._ANON_KEY`, `..._SERVICE_ROLE_KEY`) still work during the transition window if a project still carries legacy keys, but authoring new docs/code around the old names is already stale guidance for a project starting now.

## Trade-off matrix (adapter × Supabase fit)

| Measure | `@opennextjs/cloudflare` | `@cloudflare/next-on-pages` |
|---|---|---|
| Supabase/@supabase-ssr compatibility | Works out of the box | Documented build failures |
| Maintenance/adoption | Actively maintained by OpenNext + Cloudflare collab, recommended in current Cloudflare docs | Cloudflare's own docs/blog steer toward OpenNext now; legacy path |
| Complexity | One `nodejs_compat` flag, no per-route runtime annotation | Every route forced to `edge`, app-wide Node-free constraint |
| Risk of abandonment | Low — official, current steer | Rising — being superseded |

## Ranked recommendation

1. **`@supabase/ssr` + `@supabase/supabase-js`**, cookie-based, three-client pattern under `lib/supabase/{client,server,middleware}.ts` — no viable alternative; `auth-helpers-nextjs` is dead.
2. **Deploy via `@opennextjs/cloudflare`, not `@cloudflare/next-on-pages`**, specifically *because* Supabase is in the stack — this research found a concrete, sourced incompatibility, not just a style preference. Feed this into the parallel adapter-decision task as a hard input, not a tiebreaker.
3. **Adopt the new key names now** (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) rather than the legacy `ANON_KEY`/`SERVICE_ROLE_KEY` pair — a project started today may not even have legacy keys issued.
4. Server Actions for auth mutations, one Route Handler for the OAuth/email confirm callback, middleware-driven session refresh using `getClaims()` — never `getSession()` — on every request.
5. RLS enabled on every table from the first migration, enforced as a review gate, not an afterthought.

## Limits / open questions

- Did not verify exact current `@supabase/ssr` semver (changes too fast to hardcode in a report — resolve at `npm install` time).
- Did not independently load-test `@opennextjs/cloudflare` + Supabase in a live Workers deployment — findings rely on documented adapter behavior and reported build errors, not a hands-on repro in this session.
- Whether this specific Supabase project still has legacy anon/service_role keys issued (pre- vs post-Nov-2025 creation) is unverified — check the Supabase dashboard's API settings before wiring env vars either way.
- Did not cover Supabase Realtime/Storage SDK behavior under Workers — out of scope for this auth-focused pass; flag if the project needs those.
