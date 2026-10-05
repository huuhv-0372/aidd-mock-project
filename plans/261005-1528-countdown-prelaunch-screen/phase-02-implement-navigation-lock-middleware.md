# Phase 02 — Implement Navigation-Lock Middleware

**Status: Complete** — all Todo List items satisfied, build passes, review findings fixed and re-verified.

## Context Links

- Functional spec: `spec/countdown-prelaunch-screen/functional-spec.md` (FR5, FR6, SC1, SC2)
- Technical spec: `spec/countdown-prelaunch-screen/technical-spec.md` (D2)
- Depends on: Phase 01 (same env var `NEXT_PUBLIC_EVENT_START_AT`)

## Overview

- **Priority**: High (safety-critical: gates access to the entire site — full test pass required
  regardless of change size, per `development-rules.md` → Scope Contract)
- **Status**: Complete
- Site-wide redirect: before the event start, every route except `/` bounces to `/`; after, no
  redirect happens anywhere.

## Key Insights

- This is the mechanism FR5/FR6 depend on — without it, Phase 01's countdown page is just
  decorative. Centralizing in `middleware.ts` means future routes (Login, Homepage, etc. from
  other MoMorph specs) are gated automatically with zero per-page changes.

## Requirements

- FR5: countdown <= 0 → full site unlocked, no redirects.
- FR6: countdown > 0 → any non-`/` route redirects to `/`, for all users regardless of auth state.

## Related Code Files

**Create:**
- `middleware.ts` (project root, alongside `next.config.ts`)

**Modify:**
- none expected; may extract `lib/event-start.ts` if Phase 01 duplication is awkward (optional,
  not required for correctness).

## Implementation Steps

1. Create `middleware.ts` exporting `middleware(request: NextRequest)`.
2. Parse `NEXT_PUBLIC_EVENT_START_AT` the same defensive way as Phase 01 (invalid/missing →
   treat as already past, per technical-spec fallback — fail open to "unlocked" so a config typo
   never makes the whole site unreachable).
3. If `now < target` and `request.nextUrl.pathname !== '/'`: return
   `NextResponse.redirect(new URL('/', request.url))`.
4. Otherwise: `return NextResponse.next()`.
5. Set `export const config = { matcher: [...] }` excluding `/_next/*`, `/favicon.ico`, and other
   static asset paths so the countdown page's own JS/CSS/image requests are never redirected.
6. `npm run build` to catch compile errors.

## Todo List

- [x] Navigation-lock middleware created and deployed as `proxy.ts` at repo root (Next.js 16.3.8 convention; see Implementation Notes)
- [x] Redirect fires for any non-`/` path before target time
- [x] No redirect fires for any path at/after target time (including `/` itself)
- [x] Malformed/missing env var fails open (no redirect) rather than crashing
- [x] `npm run build` passes

## Implementation Notes

**Files Delivered:**
- `proxy.ts` (at repo root) — site-wide navigation-lock middleware, replaces the deprecated `middleware.ts` convention

**Implementation Details:**
- **Naming deviation from phase spec:** The implementation is delivered as `proxy.ts` (not `middleware.ts`) because Next.js framework v16.3.8 (the installed version in `node_modules/next/dist/docs/`) deprecated the `middleware.ts` convention in favor of `proxy.ts`. This is an environment-driven implementation detail, not a scope change. The export signature remains `export function proxy(request)` with the same `matcher` semantics, and all functional requirements are unchanged.
- Time-parsing logic uses the same defensive approach as phase 01, benefiting from the shared `countdown-time.ts` helper where applicable.
- Matcher explicitly excludes `/_next/*`, `/favicon.ico`, and other static asset paths to prevent redirect loops on countdown assets.

## Success Criteria

- Manually set `NEXT_PUBLIC_EVENT_START_AT` to a future time, hit `/anything`, confirm redirect to
  `/`. Set it to a past time, confirm `/anything` loads directly with no redirect.

## Risk Assessment

- **Risk**: redirect loop if the matcher accidentally includes the countdown page's own assets.
  **Mitigation**: explicit matcher exclusions in step 5; verify via manual check before marking
  done.
- **Risk**: middleware runs on the Edge runtime — confirm env var parsing works there (no Node-only
  APIs used; `Date`/string parsing is Edge-safe).

## Security Considerations

- This is an access-control gate for the whole site — covered by the safety-critical test rule in
  `development-rules.md`. Full temper pass required, not just the touched-surface subset.

## Next Steps

- None — this closes out F001. Future screens (Homepage, Login, etc.) need no changes to benefit
  from this gate; they are covered automatically by the matcher.
