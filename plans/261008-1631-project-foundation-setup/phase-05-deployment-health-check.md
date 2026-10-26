# Phase 05 — Deployment smoke-test health check

## Context Links
- Spec: `technical-spec.md` § 3.5 (A8), § 3.6 edge row A8, § 5.1 SC-005 + US005 scenarios; `functional-spec.md` US005, FR-006, BR-004, § 9
- Permissions: `spec/system/permissions.md` (health check public, no session)
- Next 16 docs: `connection` from `next/server` (usage shown in `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md` § Forcing dynamic rendering); Route Handlers in `03-api-reference/03-file-conventions/route.md`

## Overview
- Priority: P1 · Status: cancelled (chưa có /api/health) · Effort: 1h · Depends on: 01, 02 (`logServerError`), 03 (`lib/supabase/env.ts`)
- `GET /api/health` proves the Worker can reach Supabase with a real network round-trip.
  200 `{ "status": "ok" }` on success; 503 `{ "status": "degraded" }` otherwise. Public, minimal body.

## Key Insights
- `supabase.auth.getUser()` with no session returns `AuthSessionMissingError` WITHOUT a network call → false "ok"/false "degraded". Use Supabase Auth's `GET {URL}/auth/v1/health` with `apikey: <publishable key>` instead: real round-trip, no table, no session, no RLS concern. (Spec § 3.5 allows "a lightweight equivalent".)
- `cacheComponents` on → a GET handler with no dynamic API may be prerendered at build (would freeze build-time result). Call `await connection()` first to force request-time execution.
- Endpoint is excluded from `proxy.ts` matcher (phase 03) — no cookie work, cheap.
- Uses publishable key only; secret key must never be used here.

## Requirements
- FR-006 / US005 AC1: Supabase reachable → 200 `{status:"ok"}`.
- US005 AC2 / BR-004 / FR-604: unreachable, non-2xx, timeout, or missing env → 503 `{status:"degraded"}`; detail only in server log.
- Response `Cache-Control: no-store`.

## Architecture
```
GET /api/health
  await connection()
  try:
    { url, publishableKey } = getSupabasePublicEnv()        // throws if empty
    res = fetch(`${url}/auth/v1/health`, { headers: { apikey }, signal: AbortSignal.timeout(3000), cache: "no-store" })
    if res.ok → 200 { status: "ok" }
    else      → logServerError(new Error(`supabase health ${res.status}`), "api/health"); 503 { status: "degraded" }
  catch err → logServerError(err, "api/health"); 503 { status: "degraded" }
```

## Related Code Files
Create: `app/api/health/route.ts` (~30 lines). Modify: none. Delete: none.

## Implementation Steps
1. Confirm `connection` export and Route Handler semantics in vendored Next 16 docs.
2. Implement per Architecture; `Response.json(body, { status, headers: { "Cache-Control": "no-store" } })`.
3. No Origin check (GET, read-only, no cookies — FR-601 not applicable).
4. Run checks.

## Todo List
- [ ] Implement app/api/health/route.ts with connection(), timeout, generic bodies
- [ ] Local degraded-path check
- [ ] Live ok-path check (release gate)

## Success Criteria
- [local] `npm run typecheck`, `npm run lint`, `npm run build` exit 0; build output lists `/api/health` as dynamic (not prerendered).
- [local] `npm start` with `NEXT_PUBLIC_SUPABASE_URL=https://invalid.invalid` → `curl -i /api/health` = 503, body exactly `{"status":"degraded"}`, no stack/message; server log shows the error.
- [local] Same with env vars empty → 503 generic body (not a 500 crash).
- [local, may need WSL] `cf:preview` → same 503 behaviour under workerd.
- [live — Supabase project] real env → 200 `{"status":"ok"}` locally and on deployed `*.workers.dev` (SC-005, US005 AC1).

## Risk Assessment
| Risk | L | I | Countermove |
|------|---|---|-------------|
| Route prerendered at build, stale result | M | H | `await connection()`; verify "dynamic" in build output |
| Hanging fetch blocks Worker | L | M | `AbortSignal.timeout(3000)` |
| Public endpoint abused for load | L | L | Body minimal, single upstream call; CF rate rule if needed later |
| `/auth/v1/health` path changes upstream | L | M | Degraded result is loud; swap to another lightweight call |

## Security Considerations
- Public by decision; reveals only ok/degraded. No env names, URLs, or error text in body.
- Publishable key only.

## Next Steps
- Release checklist: after `cf:deploy`, `curl https://<worker>.workers.dev/api/health` must return 200.
- Rollback: revert commit.
