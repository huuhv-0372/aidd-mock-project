# Phase 02: Zod schema + getCurrentProfile + unit tests (TDD)

## Context Links
- [plan.md](plan.md) · `lib/supabase/server.ts` · `lib/supabase/update-session.ts` (getClaims pattern) · `tests/unit/supabase-env.test.ts` (test style)

## Overview
- Priority: P1 · Status: completed · Effort: 0.75h · Owner: implementer
- Delivered: schema, helper, unit tests (8 cases), domain enforcement in callback, constants, sign-out. Tests green 104/104; lint/tsc/build all pass. Domain restriction (@sun-asterisk.com) enforced at callback + in database account rule gate.

## Key Insights
- Identity must come from `auth.getClaims()` (verified JWT), user id is `data.claims.sub`; never `getSession()`.
- RLS lets any authenticated user read all rows, so the helper MUST filter `.eq("id", sub)` itself.
- Trust nothing from the DB shape: zod-parse the row (CLAUDE.md "validate at boundaries"); no generated DB types.
- Helper never throws to callers: pages stay renderable if the profile read fails.

## Requirements
- `getCurrentProfile(client?)` returns `Profile | null`; `client` injectable for tests, defaults to `await createSupabaseServerClient()`.
- Any error (claims error, query error, parse failure, thrown) -> `console.error("[profiles] ...")` with a static message tag + error object, return `null`. Missing claims (no session) -> `null`, no log (normal state).
- Never return `err.message` to callers (it returns only null).

## Architecture
`getClaims() -> sub -> from("profiles").select(columns).eq("id", sub).maybeSingle() -> profileSchema.safeParse -> Profile`.
Schema sketch:
```ts
export const profileSchema = z.object({
  id: z.uuid(), email: z.string().nullable(), full_name: z.string().nullable(),
  avatar_url: z.string().nullable(), department: z.string().nullable(),
  created_at: z.string(), updated_at: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;
```
(Column list constant derived from `profileSchema.keyof().options.join(",")` to stay DRY.) Structural client type: the minimal `{ auth: { getClaims }, from }` subset via `Pick<SupabaseClient, "auth" | "from">` to keep fakes simple.

## Related Code Files
Create (owned by this phase):
- `lib/validation/profile.ts`
- `lib/profiles/get-current-profile.ts`
- `tests/unit/profile-schema.test.ts` (folded into the helper test if small)
- `tests/unit/get-current-profile.test.ts`

Modify/delete: none. Do not touch `lib/supabase/*`, `proxy.ts`, pages.

## Implementation Steps
1. Write `get-current-profile.test.ts` with a hand-rolled fake client (plain object, chainable `from().select().eq().maybeSingle()` returning a configured result; `getClaims` returning configured result). Cases:
   - no claims (`data: null` / `error: AuthSessionMissingError`-like) -> `null`, query never called
   - row found -> equals parsed `Profile`
   - row missing (`data: null, error: null`) -> `null`
   - query error -> `null` and `console.error` called (spy), error not rethrown
   - malformed row (e.g. `id: "x"`, extra-null shape) -> `null` and logged
   - query filtered by `sub` (assert `.eq` called with `"id"`, sub)
   - client constructor/getClaims throws -> `null`
2. Run `npm test` -> red for the right reason.
3. Implement `lib/validation/profile.ts` then `lib/profiles/get-current-profile.ts`; keep each under ~60 lines; add `import "server-only"` only if the package already exists in the repo (do not add a dependency for it).
4. Green; run verification commands.

## Todo List
- [ ] tests written and red
- [ ] schema + exported `Profile` type
- [ ] helper green
- [ ] lint, tsc, full `npm test`, `npm run build` pass

## Success Criteria
- All listed cases pass; helper has no `getSession` and no `admin` import (grep clean).
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` exit 0.

## Scope Contract
- Changed: four new files above (no existing file edited).
- Impacted: nothing consumes them yet; build bundles only if imported.
- Will verify: unit (mocked client, lowest reliable layer for branch logic) + lint/tsc/build. Auth-adjacent, so full `npm test` runs, not a subset.
- Deliberately skipped: E2E (no route/UI/proxy change; login specs unaffected); live DB read (covered by user smoke in phase 03).

## Risk Assessment
| Risk | L | I | Countermove |
|------|---|---|-------------|
| Fake client diverges from real supabase-js chain | M | M | Phase 03 smoke test against real DB; keep chain minimal (`select/eq/maybeSingle`) |
| `next/headers` static import breaks vitest | L | L | Make default client lazy (`await createSupabaseServerClient()` inside the function) or dynamic import |
| Column drift between SQL and schema | M | M | Single column list from schema; phase 03 checks live row parses |

## Security Considerations
Uses publishable key client under RLS (not service role); id taken from verified claims; no raw errors returned; logs carry error object server-side only.

## Next Steps
Homepage / Kudos plans import `getCurrentProfile`. If a batch read is needed there, add `getProfilesByIds` then (not now).
