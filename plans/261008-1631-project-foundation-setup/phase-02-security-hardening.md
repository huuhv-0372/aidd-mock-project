# Phase 02 — Security hardening primitives

## Context Links
- Spec: `technical-spec.md` § 3.3, § 4.4 Bin 3 (A0: FR-003, FR-004, FR-601, FR-602, FR-604); `functional-spec.md` US003, BR-002/003/004, § 10
- Research: `plans/reports/researcher-owasp-security-checklist.md` §§ 1, 3, 4, 8
- Next 16 docs: `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md` (lines 385-452)

## Overview
- Priority: P1 · Status: cancelled (chưa làm, xem plan.md) · Effort: 2h · Depends on: 01
- Ship the cross-cutting security baseline every later route/action reuses: response headers (dynamic +
  static), CSRF Origin helper, shared error handler. Zod convention is delivered as a usage pattern
  here and as the first concrete schema in phase 03 (`lib/validation/auth.ts`).

## Key Insights
- Static assets are served by Cloudflare directly; `headers()` never reaches them → `public/_headers` needed (two mechanisms, both required).
- **Spec deviation (FR-003 says "nonce CSP"):** Next 16 docs — nonce CSP forces all pages dynamic and is
  incompatible with PPR; `cacheComponents` must stay on. Decision: static CSP with
  `script-src 'self' 'unsafe-inline'`, every other directive strict. Upgrade path (nonce or SRI) is
  required before the first authenticated/user-data page. Flag for user sign-off; proceed meanwhile.
- `experimental.sri` spike NOT in scope: inline RSC flight scripts (`self.__next_f.push`) have no hash → likely breaks hydration.
- Server Actions already get Next's built-in Origin==Host CSRF check. `verify-origin` is only for
  cookie-authenticated mutating Route Handlers — none exist in v1; it ships because FR-601/SC-004 mandate the helper. Its unit test is its first consumer.
- `connect-src` must allow Supabase origin or browser token refresh breaks.

## Requirements
- FR-003 / US003: 5 headers on every dynamic response (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) + `X-Content-Type-Options: nosniff`; same set on static assets.
- FR-601 / BR-003: `verifyOrigin(request)` rejects mutating requests whose Origin (fallback Referer) is not in the allow-list.
- FR-604 / BR-004: errors logged fully server-side; client gets generic message in production.
- FR-004 / BR-006: convention — `lib/validation/<feature>.ts`, `safeParse` first line of every action/handler.
- FR-602 / BR-002 is enforced in phase 03 (`import "server-only"`); no file here touches secrets.

## Architecture
```
request ─► Cloudflare
            ├─ static asset (/_next/static/*, public/*) ─► public/_headers rules
            └─ Worker ─► next.config.ts headers() (source "/(.*)") ─► route / action / handler
                                                           └─ handler: verifyOrigin() → safeParse() → logic → catch: handleActionError()
```
CSP value (single string, built once in `lib/security/security-headers.ts`):
`default-src 'self'; script-src 'self' 'unsafe-inline'[+ 'unsafe-eval' in dev]; style-src 'self' 'unsafe-inline';
img-src 'self' blob: data:; font-src 'self'; connect-src 'self' https://*.supabase.co;
object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`
Other headers: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Content-Type-Options: nosniff`.

## Related Code Files
Create:
- `lib/security/security-headers.ts` — exports `securityHeaders: { key, value }[]` (one source for `next.config.ts`).
- `lib/security/verify-origin.ts` — `verifyOrigin(request: Request, allowed?: string[]): boolean`; default allow-list = request's own origin (from `Host`/`X-Forwarded-Host` + proto). Missing Origin AND Referer on a mutating method → reject.
- `lib/security/verify-origin.test.ts`
- `lib/errors/handle-action-error.ts` — `logServerError(err, context)` (console.error, full detail) and `handleActionError(err, context): { error: string }` (dev: `err.message`; prod: `"Something went wrong"`; never `stack`).
- `lib/errors/handle-action-error.test.ts`
- `public/_headers` — `/*` rule with the same 6 headers (CSP literal duplicated — static file cannot import; comment "keep in sync with lib/security/security-headers.ts"); `/_next/static/*` `Cache-Control: public, max-age=31536000, immutable`.

Modify:
- `next.config.ts` — add `async headers() { return [{ source: "/(.*)", headers: securityHeaders }] }`. Keep `cacheComponents`, `partialPrefetching`, `experimental.agentFeedback`, `turbopack` untouched. Do NOT add `serverActions.allowedOrigins` (workers.dev does not rewrite Host; document only).

## Implementation Steps
1. Write `security-headers.ts` (dev adds `'unsafe-eval'` via `process.env.NODE_ENV === "development"`).
2. Wire `headers()` in `next.config.ts` (relative import `./lib/security/security-headers`).
3. Write `public/_headers` mirroring the set.
4. Write `verify-origin.ts`: only methods POST/PUT/PATCH/DELETE are checked; compare `new URL(origin).origin` exactly (no prefix/substring match).
5. Write `handle-action-error.ts`.
6. Unit tests (smallest set protecting the contracts):
   - verifyOrigin: same-origin POST → true; foreign Origin → false; no Origin + same-origin Referer → true; no Origin, no Referer on POST → false; `https://evil.com.example.com`-style lookalike → false.
   - handleActionError: production env → generic message, no `stack`/raw message; logs called with full error.
7. Run checks below.

## Todo List
- [ ] security-headers.ts + next.config.ts headers()
- [ ] public/_headers mirror
- [ ] verify-origin.ts + tests
- [ ] handle-action-error.ts + tests
- [ ] Local hydration check under CSP (next build && next start)

## Success Criteria
- [local] `npm run typecheck`, `npm run lint`, `npm test` (both test files) exit 0.
- [local] `npm run build && npm start`; `curl -I http://localhost:3000/` shows all 6 headers (SC-003).
- [local] Open `/` in a browser/Playwright: zero `Content Security Policy` console errors / `securitypolicyviolation` events; page hydrates.
- [local, may need WSL] `npm run cf:preview`; `curl -I` on `/` and on one `/_next/static/...` asset → both carry the header set (validates `_headers` under workerd).
- [local] `grep -rn "err.stack\|error.stack" app lib` → no hits outside `NODE_ENV` guards (FR-604).
- [live] Same `curl -I` checks against the deployed `*.workers.dev` URL.

## Risk Assessment
| Risk | L | I | Countermove |
|------|---|---|-------------|
| CSP blocks Next inline scripts/styles → broken hydration | M | H | `'unsafe-inline'` on script/style; browser check in done-criteria |
| `_headers` and `security-headers.ts` drift | M | M | Sync comment in both; preview curl compares both responses |
| `headers()` not applied to PPR/cached routes under OpenNext | L | M | `cf:preview` curl check |
| `connect-src` too narrow breaks Supabase browser refresh | M | H | `https://*.supabase.co` wildcard |
| Weaker CSP accepted silently | M | M | Logged as spec deviation in plan.md; upgrade gate before first user-data page |

## Security Considerations
- Allow-list compares full origin strings, never `startsWith`/`includes`.
- Generic error text in production; full error only in server logs (Workers observability on via phase 01).
- HSTS `preload` is irreversible-ish for the apex domain — acceptable on `workers.dev`; revisit before attaching a custom domain.

## Next Steps
- Phase 03 consumes `handleActionError`; phase 05 consumes `logServerError`. Phase 04 documents these conventions.
- Rollback: revert commit (headers disappear; nothing stateful).
