# OWASP/ASVS-lite Security Checklist — Next.js 16 + Cloudflare Workers (OpenNext) + Supabase

Date: 2026-10-08. Builds on `researcher-cloudflare-workers-deployment.md` (adapter: `@opennextjs/cloudflare`,
`wrangler.jsonc`, `.dev.vars`). Project is a fresh `create-next-app` scaffold — no middleware,
API routes, or Supabase wiring exist yet, so every item below is a "create this" not "fix this."
Sources: Next.js official docs/blog, Cloudflare Workers docs, OpenNext docs, Supabase docs,
OWASP Cheat Sheet Series, cross-checked against 2026 community reports. 9 searches run (research skill
`medium`→`high` budget), no single-source claims below.

## 1. Security headers

**Critical finding, non-obvious:** OpenNext's Worker does **not** sit in front of static assets
(`public/`, `_next/static/`) — Cloudflare serves those directly, so `next.config.ts` `headers()`
**never runs for them**. Two mechanisms, two file types, not one-or-the-other:

| Mechanism | File | Covers | Headers |
|---|---|---|---|
| `next.config.ts` → `headers()` | `next.config.ts` | Dynamic routes served by the Worker (pages, Route Handlers, Server Actions) | Static headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Frame-Options: DENY` |
| `proxy.ts` (Next.js 16 renamed `middleware.ts`→`proxy.ts`; both still work short-term but shipping both is a hard build error — use `proxy.ts`, run `npx @next/codemod@canary middleware-to-proxy` if `middleware.ts` ever gets created first) | `proxy.ts` | Per-request **nonce-based CSP** (needs a fresh value per request, can't be static) | `Content-Security-Policy: script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'` |
| `public/_headers` (Cloudflare static-assets headers file, plain text, no extension) | `public/_headers` | Static assets bypassing the Worker entirely | `/*` rule duplicating `X-Content-Type-Options`/`X-Frame-Options`/`Referrer-Policy`/`Permissions-Policy`/HSTS; `/_next/static/*` rule for `Cache-Control: public, max-age=31536000, immutable` |

Notes: `proxy.ts` runs on the edge runtime under OpenNext (Node-only `cookies()`/Node `crypto`
break there per the prior deployment report) — generate the nonce with `crypto.randomUUID()`
(Web Crypto, safe). Set CSP only in `proxy.ts` once a nonce is needed, not duplicated in
`next.config.ts`. Cloudflare's own injected `CF-Ray`/`Server: cloudflare` headers are informational,
not worth stripping. Keep `X-Frame-Options` for legacy browsers alongside CSP's `frame-ancestors`.

## 2. Input validation / output encoding (Server Actions + Route Handlers)

- **One zod schema per boundary, parsed first line of the function body** — `app/actions/*.ts`
  Server Actions and `app/api/*/route.ts` Route Handlers each call `.parse()` (or `.safeParse()`
  to return a typed error instead of throwing) before touching Supabase or any domain logic.
  Put schemas in `lib/validation/<feature>.ts`, reused by both the Server Action and any
  Route Handler that duplicates the same input shape (DRY — one schema, two call sites).
- Supabase's query builder (`.from().select()/.insert()` etc.) parameterizes automatically — SQL
  injection is not a practical risk through it. Narrower, not zero: raw SQL via `rpc()` calling a
  Postgres function that string-concatenates internally — audit `CREATE FUNCTION` bodies for
  `EXECUTE format(...)`, require `quote_ident`/`quote_literal` or `EXECUTE ... USING`; forbid any
  `supabase.sql`/`postgres-js` raw template-literal interpolation if ever introduced.
- Output encoding: React's JSX auto-escapes by default — the actual risk is `dangerouslySetInnerHTML`.
  Grep for it before shipping; any legitimate use (rich text) needs a sanitizer (e.g. DOMPurify)
  applied server-side at write time, not just client-side at render.

## 3. CSRF

- **Server Actions**: Next.js's built-in protection already compares the `Origin` header against
  `Host`/`X-Forwarded-Host` and rejects mismatches — automatic, zero config. Gap: a request with
  **no** `Origin` header at all is let through with only a warning, not rejected (matters for
  non-browser clients, not typical browser flows). If Cloudflare/a proxy rewrites the host, set
  `experimental.serverActions.allowedOrigins` in `next.config.ts` to the real public origin(s).
- **Route Handlers that mutate state** (`POST`/`PUT`/`DELETE` under `app/api/`) get **none** of
  the Server Action protection — it is Server-Action-specific. For any Route Handler that mutates
  data and is reachable from a browser session (cookie-authenticated), manually check `Origin`/
  `Referer` against an allow-list at the top of the handler, in a shared helper
  `lib/security/verify-origin.ts` (DRY — one check, every mutating handler calls it).
- Pure token/API-key-authenticated Route Handlers (no cookie session) are not CSRF-exposed by
  definition — skip the Origin check there, don't add dead code.

## 4. Secrets management

- `NEXT_PUBLIC_*` prefix = **bundled into client JS, visible to anyone** — only
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` ever get this prefix.
  `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS entirely) **must never** carry `NEXT_PUBLIC_` and must
  only be read in server-only files — Server Actions, Route Handlers, a server-only Supabase
  client factory (`lib/supabase/admin.ts`, imported **only** from server files — no `"use client"`
  file may import it; grep for the import path in any client component before merging).
- Local dev: Next's own `.env.local` (read by `next dev`), not `.dev.vars` (only read by
  `wrangler dev`) — per the prior deployment report. Both `.gitignore`d (default, verify it stays so).
- Production: `wrangler secret put SUPABASE_SERVICE_ROLE_KEY` (and any other true secret) —
  write-only, encrypted, never in `wrangler.jsonc`'s plaintext `vars` block. Public, non-secret
  config (feature flags, the anon key if you want it versioned) can live in `vars`.
- **Enforce in RLS, not just in code**: the anon key's safety is entirely a function of every
  table having RLS enabled with real policies — a code-level secret-handling checklist is not a
  substitute. `supabase/migrations/*.sql` should enable RLS on every table in `public` schema as
  a matter of course; a table without an `ENABLE ROW LEVEL SECURITY` line is a bug.

## 5. Rate limiting (Cloudflare Workers)

| Option | Fit | Where |
|---|---|---|
| **Cloudflare Rate Limiting Rules** (dashboard/API, WAF-layer, no code) | Simplest, zero app code, good first line for `/api/auth/*`, `/api/login`, any public form-submit endpoint | Configure in Cloudflare dashboard or `wrangler.jsonc` rulesets; no repo file needed beyond documenting the rule in `docs/system-architecture.md` |
| **Workers KV fixed-window counter** | Good enough for coarse per-IP/per-user limits (e.g. 10 req/min); cheap; **not** safe for sub-second precision (1 write/key/sec KV limit, self-contention risk under burst) | `lib/rate-limit/kv-limiter.ts`, called from Route Handlers/Server Actions that need app-level (not just WAF-level) limits |
| **Durable Objects** | Precise, atomic, low-latency counters — one DO instance **per key** (per-API-key or per-IP), never one global DO for all traffic (hot-object bottleneck) | Only reach for this if KV's imprecision actually causes a problem (YAGNI — don't build DO-based limiting speculatively) |

Recommendation: Cloudflare Rate Limiting Rules on `/api/auth/*` and any public mutation endpoint
as the floor (no code, immediate), KV-based app-level limiter only where business logic needs
a custom response body/shape on throttle (e.g. a friendly "try again in Ns" message). Skip
Durable Objects until KV is demonstrated insufficient.

## 6. Dependency / supply-chain hygiene

- `package-lock.json` is already committed (seen in git status) — keep it that way, never `--no-lockfile` installs in CI.
- Add `npm audit --audit-level=high` as a CI step (or `pnpm audit`/equivalent) — fail the build on high/critical, don't just warn.
- `eslint-plugin-security` (or the security rules bundled in `eslint-config-next` if present) into
  `eslint.config.mjs` — flags `eval()`, dynamic `require()`/`import()` with non-literal paths,
  unsafe regex. Grep the repo for `eval(` and `new Function(` before every release as a backstop.
- Pin the OpenNext/Wrangler toolchain versions (not `^range`) in `package.json` devDependencies —
  Workers runtime behavior has shifted between adapter versions per the prior deployment report.

## 7. Auth session security (Supabase SSR cookies)

- Use `@supabase/ssr`'s server client factory (`lib/supabase/server.ts`) which sets cookies via
  Next's `cookies()` API — confirm it sets `httpOnly: true`, `secure: true` (prod), `sameSite: 'lax'`
  (not `'none'` unless there's a genuine cross-site embed need — there shouldn't be for a standard
  SSR app). These are the `@supabase/ssr` defaults; don't override them to `sameSite: 'none'` for
  convenience.
- Session rotation: Supabase's refresh-token flow already rotates the access token on refresh —
  no custom rotation code needed. Do make sure `lib/supabase/server.ts` and
  `lib/supabase/middleware.ts` (the `proxy.ts`-called session-refresh helper, per Supabase's own
  Next.js SSR guide) both exist and the latter runs on **every** request via `proxy.ts`'s matcher
  — a missing refresh step is the most common Supabase-SSR auth bug.
- Session fixation: Supabase issues a new session (new token pair) on login — nothing extra to
  implement, verify by reading the `@supabase/ssr` login flow rather than hand-rolling anything.

## 8. Logging / error handling

- Next.js's default production error boundary already masks server error details from the
  client (`app/error.tsx`, `app/global-error.tsx`) — the risk is custom `catch` blocks that
  `return NextResponse.json({ error: err.message, stack: err.stack })`. Grep Route Handlers and
  Server Actions for `err.stack` or `error.stack` reaching a response body — zero matches should
  exist outside `NODE_ENV !== 'production'` guards.
- Standardize: `lib/errors/handle-action-error.ts` — logs full error server-side (`console.error`
  is fine to start; swap for a structured logger later per YAGNI — don't add one before there's a
  second consumer of the logs), returns a generic `{ error: "Something went wrong" }` (or a typed,
  non-leaking error code) to the client. One helper, every Server Action/Route Handler catch
  block calls it (DRY).

## Prioritized action list

1. `proxy.ts` with nonce CSP + Origin-based CSRF check for mutating Route Handlers — highest
   leverage, covers injection/XSS/CSRF in one file.
2. `next.config.ts` `headers()` for static security headers + `public/_headers` for the static-asset
   gap — cheap, closes the most commonly-missed hole on this exact stack (OpenNext).
3. `lib/supabase/{server,admin,middleware}.ts` split, with `admin.ts` import-restricted to server
   files only — prevents the single worst possible leak (service_role key in client bundle).
4. `lib/validation/*.ts` zod schemas at every Server Action/Route Handler boundary.
5. `wrangler secret put` for all real secrets; audit `wrangler.jsonc` has no secret in `vars`.
6. Cloudflare Rate Limiting Rule on auth/public-mutation endpoints (dashboard config, no code).
7. `npm audit` + `eslint-plugin-security` wired into CI.
8. `lib/errors/handle-action-error.ts` shared error handler.

## Open questions / left uncovered

- Did not verify Supabase's exact current `@supabase/ssr` cookie defaults against the live
  package version this project will pin — recommend a quick `node_modules` read once the
  dependency is actually added, before trusting this report's cookie-flag claims blindly.
- Cloudflare Rate Limiting Rules pricing/quota tier (free vs paid plan limits) not checked — may
  need the KV fallback sooner than "nice to have" if the plan tier caps rule count.
- Did not test a live CSP nonce + `strict-dynamic` setup against this project's actual (currently
  nonexistent) client-side script needs — Tailwind/Turbopack output should be nonce-compatible
  but unverified end-to-end.
