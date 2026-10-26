---
phase: 06
title: "Track B3 — proxy.ts time gate"
status: completed
feature: F001
owner: implementer
test_policy: e2e-red-first
blocked_by: [05]
---

# Phase 06 — proxy.ts gate

## Context Links
- `technical-spec.md` § 3.1 A1 (DEC-001, DEC-002), § 3.2, § 5.2, § 5.3 items 3-4; `spec/system/permissions.md`
- `CLAUDE.md` (proxy.ts = Next 16 middleware). Runtime is **Node.js by default** (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:255); code still uses Web APIs only for Workers portability. <!-- Updated: Validation Session 1 - runtime claim corrected -->

## Overview
Priority P1 · pending. Gate every matched request: before launch non-`/countdown` → 307 `/countdown`; after launch `/countdown` → 307 `/login`; otherwise pass through.

## Key Insights
- Keep the decision pure and unit-tested; `proxy.ts` is a thin adapter (no Next request mocking needed).
- Matcher must exclude static assets or the countdown page loses CSS/images (US001-2).
- Gate runs before any future session/CSP logic and returns early (5.3 item 3).

## Requirements
`lib/countdown/resolve-gate-redirect.ts`:
- `resolveGateRedirect(pathname: string, launched: boolean): '/countdown' | '/login' | null`
  - `!launched && pathname !== '/countdown'` → `'/countdown'` (DEC-001)
  - `launched && pathname === '/countdown'` → `'/login'` (DEC-002)
  - else `null`. Treat `/countdown/` (trailing slash) as `/countdown`.

`proxy.ts` (repo root):
- `export function proxy(request: NextRequest)`: `launched = isEventLaunched(getEventStartAt(), Date.now())`; target = `resolveGateRedirect(request.nextUrl.pathname, launched)`; redirect via `NextResponse.redirect(new URL(target, request.url))` (307) with query dropped, else `NextResponse.next()`.
- `export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)'] }` — excludes Next assets and any path with a file extension (covers `public/images/countdown/*`).

## Related Code Files
- Create: `proxy.ts`, `lib/countdown/resolve-gate-redirect.ts`, `tests/unit/resolve-gate-redirect.test.ts`

## Implementation Steps
1. RED unit tests for the 4 combinations x paths `/`, `/login`, `/does-not-exist`, `/countdown`, `/countdown/`.
2. Implement resolver → GREEN.
3. Write `proxy.ts`; verify `npm run build` lists proxy and the countdown asset requests are not matched (manual `curl -I` on a `next start` with future env optional; E2E test 2 is the owner).

## Todo List
- [ ] RED resolver tests
- [ ] resolver
- [ ] proxy.ts + matcher
- [ ] build passes

## Success Criteria
- `npm test` exits 0; `npm run lint` 0; `npm run build` 0.
- After this phase alone, E2E tests 1, 7, 8 may go GREEN; tests 3-6 stay RED until 08 (expected).
- Scope Contract: Changed = request gate (cross-cutting routing → safety-critical: full `npm test` + `npm run test:e2e` run to observe); Impacted = every route; Verify = unit for decision table, E2E for real redirects/matcher; Skipped = none.

## Risk Assessment
| Risk | L | I | Mitigation |
|------|---|---|-----------|
| Matcher too broad → redirect loop on `/countdown` assets | M | H | extension exclusion + E2E test 2 |
| Redirect loop `/countdown`↔`/login` | L | H | decisions are mutually exclusive by `launched`; unit-tested |
| Client fast clock loop (D001) | L | M | offset correction in phase 07 |
| Proxy runtime lacks `process.env` on Workers | M | H | deferred to deploy task (plan Unresolved 2) |

## Security Considerations
Gate applies to everyone (FR-601), no role bypass. No env value in responses. 307 keeps method; no open redirect (targets are fixed literals).

## Next Steps
Feeds 08. Rollback: delete `proxy.ts` → site ungated, nothing else breaks.

## Delivery Notes
✓ Completed. Proxy gate implemented with `resolveGateRedirect` decision logic. Matcher revised (final form): explicit asset allowlist `/((?!_next/static|_next/image|images/|favicon\.ico|robots\.txt|sitemap\.xml).*)` (review M1 flagged earlier extension-only approach could bypass; explicit list hardens for future /api routes). Tests 1/2/7/8 green after this phase; 3–6 still red (UI pending).
