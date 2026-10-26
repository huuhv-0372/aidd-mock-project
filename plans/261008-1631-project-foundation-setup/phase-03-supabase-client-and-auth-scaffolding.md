# Phase 03 — Supabase client + auth scaffolding

## Context Links
- Spec: `technical-spec.md` § 3.2 (A2-A7), § 4.3 (SM-001), § 4.4 Bin 2 (BR-005), § 4.5 (INT-001); `functional-spec.md` US004, FR-002, FR-401..405, D001
- Permissions: `spec/system/permissions.md` (Anonymous vs Authenticated; service-role boundary)
- Research: `plans/reports/researcher-supabase-nextjs-integration.md` §§ 2-6; OWASP report § 7
- Next 16 proxy: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` (Node runtime only; matcher semantics; Server Functions skip proxy when matcher excludes the path)

## Overview
- Priority: P1 · Status: partial (env/server/update-session có; client/admin chưa làm) · Effort: 3h · Depends on: 01 (deps), 02 (`handleActionError`)
- Three Supabase client factories, session refresh in `proxy.ts` via `getClaims()`, Server Actions
  `signIn`/`signUp`/`signOut`, `/auth/callback` email-confirmation handler. No UI screens (separate feature).

## Key Insights
- `getClaims()` verifies JWT signature; `getSession()` trusts raw cookie → forbidden server-side (BR-005).
- Server Components cannot write cookies → `setAll` in `server.ts` must swallow the write error there (proxy does the refresh).
- Next 16 `proxy.ts` is always Node runtime; OpenNext support is experimental (phase 01 pinned version). Fallback if it breaks on Workers: delete `proxy.ts`; browser client `autoRefreshToken` + Server Action/Route Handler writes keep sessions alive (degraded: SSR may see stale token until client refresh).
- Proxy is not an auth gate: Server Functions on excluded paths skip proxy → each action that needs a user must call `getClaims()` itself.
- Supabase `signUp` with an existing email returns an obfuscated success when confirmations are on → return the same "check your email" result either way (no enumeration).
- `admin.ts` has no v1 consumer; FR-002 mandates it. `import "server-only"` makes any client import a build error (FR-602 enforced at build, not by review).

## Requirements
- FR-002: `client.ts` (browser), `server.ts` (SSR, cookie adapter), `admin.ts` (secret key, server-only).
- FR-401/402/403 + BR-006: actions validate with zod first, call Supabase, map errors via `handleActionError`; sign-in failure → "Invalid login credentials" (US004 error scenario).
- FR-404: `GET /auth/callback?code=...&next=/path` → `exchangeCodeForSession(code)` → redirect to safe `next` (default `/`); invalid/missing code → redirect `/?auth_error=1` (generic, no detail).
- FR-405 + BR-005 + SM-001: proxy refreshes session each matched request, copies rotated cookies to response.

## Architecture
```
browser ─► proxy.ts (matcher excludes _next/static, _next/image, favicon.ico, image files, api/health)
             └─ createServerClient(request/response cookie adapter) → auth.getClaims() → response w/ rotated cookies
          ─► Server Action (app/actions/auth.ts)  ["use server"]
             └─ authCredentialsSchema.safeParse → lib/supabase/server.ts → signInWithPassword / signUp / signOut
          ─► GET /auth/callback → server client → exchangeCodeForSession(code) → redirect(safeNext)
lib/supabase/env.ts  → reads + validates NEXT_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY (throws clear error if empty)
lib/supabase/admin.ts → createClient(url, SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
```
Action return shape (for future `useActionState` UI): `{ ok: true } | { ok: false, error: string, fieldErrors?: Record<string,string[]> }`.

## Related Code Files
Create:
- `lib/supabase/env.ts` — `getSupabasePublicEnv()`; reference `process.env.NEXT_PUBLIC_*` literally (Next inlines only literal access).
- `lib/supabase/client.ts` — `createSupabaseBrowserClient()` via `createBrowserClient`.
- `lib/supabase/server.ts` — `import "server-only"`; `async createSupabaseServerClient()` with `await cookies()` `getAll`/`setAll` (try/catch in setAll for Server Component context).
- `lib/supabase/admin.ts` — `import "server-only"`; `createSupabaseAdminClient()`; throws if `SUPABASE_SECRET_KEY` empty.
- `lib/supabase/refresh-session-in-proxy.ts` — `refreshSession(request: NextRequest): Promise<NextResponse>` (keeps `proxy.ts` tiny).
- `proxy.ts` (repo root) — `export async function proxy(request)` → `refreshSession(request)`; `export const config = { matcher: [...] }` (constant literal).
- `lib/validation/auth.ts` — `authCredentialsSchema = z.object({ email: z.email(), password: z.string().min(8).max(72) })` (check installed zod major for `z.email()` vs `z.string().email()`).
- `app/actions/auth.ts` — `"use server"`; `signIn(prev, formData)`, `signUp(prev, formData)`, `signOut()`.
- `lib/auth/safe-redirect-path.ts` — `toSafeRedirectPath(next: string | null): string`; accept only values starting with `/` and not `//` or `/\`, else `/` (open-redirect guard). + `lib/auth/safe-redirect-path.test.ts`.
- `app/auth/callback/route.ts` — `GET` handler using `toSafeRedirectPath`.

## Implementation Steps
1. `env.ts`, then `client.ts`, `server.ts`, `admin.ts` (follow `@supabase/ssr` README of the installed version; read its cookie defaults: httpOnly/secure/sameSite=lax — do not override).
2. `refresh-session-in-proxy.ts` per Supabase SSR Next.js guide: build response with `NextResponse.next({ request })`, `setAll` writes to both request and response cookies, call `await supabase.auth.getClaims()`, return response. Never call `getSession()`.
3. `proxy.ts` + matcher: `'/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'`.
4. `lib/validation/auth.ts`.
5. `app/actions/auth.ts`:
   - signIn: safeParse → on fail return fieldErrors; `signInWithPassword`; any auth error → `{ ok:false, error:"Invalid login credentials" }`; unexpected throw → `handleActionError`.
   - signUp: safeParse; `emailRedirectTo = ${origin}/auth/callback` where origin = `(await headers()).get("origin")` (already Origin==Host checked by Server Action CSRF); always return `{ ok:true }` on non-throw (anti-enumeration).
   - signOut: `auth.signOut()`; `{ ok:true }`.
   - Do not `redirect()` inside actions (UI feature decides navigation).
6. `app/auth/callback/route.ts`: read `code`, `next`; exchange; redirect.
7. Verify (below). Then grep: no `getSession(` anywhere; no import of `lib/supabase/admin` or `SUPABASE_SECRET_KEY` from any `"use client"` file.

## Todo List
- [ ] env.ts / client.ts / server.ts / admin.ts
- [ ] refresh-session-in-proxy.ts + proxy.ts with matcher
- [ ] lib/validation/auth.ts
- [ ] app/actions/auth.ts (signIn, signUp, signOut)
- [ ] app/auth/callback/route.ts with safe-next guard
- [ ] Unit tests: authCredentialsSchema (valid / bad email / short password), safeNext guard (`/x` ok, `//evil.com`, `https://evil.com`, `/\evil` rejected)
- [ ] Greps for getSession / admin-in-client

## Success Criteria
- [local] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` exit 0 with dummy `NEXT_PUBLIC_*` values.
- [local] Build-time guard: temporary `"use client"` file importing `lib/supabase/admin` makes `npm run build` FAIL (server-only), then remove it (FR-602 edge behaviour).
- [local] `grep -rn "getSession(" app lib proxy.ts` → 0 hits (BR-005).
- [local, may need WSL] `npm run cf:build` succeeds with `proxy.ts` present (OpenNext Node-middleware support works); `cf:preview` serves `/` (proxy runs without throwing on missing cookies).
- [local] `GET /auth/callback` with no `code` → 3xx to `/?auth_error=1`; with `next=//evil.com` → redirect stays same-origin.
- [live — Supabase project] signIn valid creds sets `sb-*` cookies; bad password → "Invalid login credentials"; signOut clears cookies; session survives multiple requests through proxy (SC-002); confirmation link round-trips through `/auth/callback`.

## Risk Assessment
| Risk | L | I | Countermove |
|------|---|---|-------------|
| OpenNext experimental Node-proxy fails on Workers (bundling/runtime) | M | H | `cf:build` + `cf:preview` gate; fallback = remove proxy.ts (documented above) |
| Matcher misses a route → silent logout (spec § 9) | M | M | Negative matcher (all except assets/health); actions re-check claims |
| `@supabase/ssr` API drift vs research | M | M | Read installed package README/types before coding |
| Email enumeration via signUp/signIn messages | L | M | Uniform responses |
| Open redirect via `next` | M | H | safeNext guard + unit test |
| Supabase Auth URL config lacks callback URL | M | M | Release checklist: add `<site>/auth/callback` to Supabase redirect allow-list |

## Security Considerations
- Secret key only in `admin.ts` behind `server-only`; never `NEXT_PUBLIC_`.
- Cookie flags: library defaults (httpOnly, secure in prod, sameSite lax).
- No RLS work: no `public` tables created (FR-603 vacuously satisfied; gate documented in phase 04).
- Rate limiting of auth actions: Cloudflare dashboard rule, out of repo scope (plan open question 4).

## Next Steps
- Unblocks phase 05 (`env.ts`). Future login UI feature consumes these actions.
- Rollback: revert commit; no DB state created by code (users created in Supabase during live testing can be deleted in dashboard).
