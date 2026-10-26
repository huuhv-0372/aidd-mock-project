# Phase 04 — Code-organization + responsive conventions doc

## Context Links
- Spec: `technical-spec.md` § 3.4, § 4.1, § 4.4 Bin 3 (FR-005/BR-007, FR-603/BR-001); `functional-spec.md` US002, US006, § 8 scenarios
- Research: `plans/reports/researcher-responsive-tailwind-v4.md` (all); OWASP report §§ 2, 4, 6
- Rules: `.claude/rules/development-rules.md` (kebab-case, <200 lines, YAGNI/KISS/DRY)

## Overview
- Priority: P2 · Status: cancelled (quy ước nằm trong CLAUDE.md) · Effort: 1.5h · Depends on: none (parallel; paths referenced are fixed by this plan)
- Create `docs/code-standards.md` — the single written source for file organization, responsive/a11y
  conventions, and the security conventions introduced by phases 02/03 (incl. the RLS review gate).
- Docs only. No `components/ui/` files, no `tailwind.config.js`, no `globals.css` change.

## Key Insights
- `docs/` does not exist yet; this phase creates it with one file. Other docs (`system-architecture.md`, roadmap, changelog) are the delivery-tracker/doc-writer's job after implementation — not here.
- US002 (RLS) has no table to check in v1 → deliverable is a mandatory review checklist item.
- Keep under ~200 lines; split into `docs/code-standards-*.md` only if it overflows.

## Requirements
- FR-005 / BR-007 / US006: document `components/ui/` (shared, extract on 2nd repetition) vs `components/<feature>/`; `app/` routing-only; Tailwind v4 CSS-first, default breakpoints, mobile-first; `next/image` `sizes` mandatory; `min-h-11 min-w-11` touch targets; `focus-visible:`; `motion-safe:`/`motion-reduce:`; RSC boundary rule.
- FR-603 / BR-001 / US002: "every `public` table has `ENABLE ROW LEVEL SECURITY` + policies in the same migration; PR without it is blocked".
- Reference (not restate) security helpers: headers, `verifyOrigin`, zod-first, `handleActionError`, `server-only` secret boundary, `getClaims()` not `getSession()`.

## Architecture
Doc outline (`docs/code-standards.md`):
1. Directory layout — `app/` (routes, actions in `app/actions/`, handlers), `components/ui/`, `components/<feature>/`, `lib/<domain>/`, `proxy.ts`. Naming: kebab-case, <200 lines.
2. Component extraction rule (YAGNI): inline Tailwind first; promote to `components/ui/` on second use; review flags premature primitives (functional-spec § 8 US006 error scenario).
3. Styling — Tailwind v4 `@theme` in `app/globals.css` only (one block, no JS config); default breakpoints; custom breakpoint only when a real design needs it; container queries selectively; no fixed px widths on layout containers; fluid type tokens only for headings.
4. Responsive images — `next/image` with `sizes` mapped to Tailwind breakpoints + `width/height` or `fill`; `priority` only on LCP image.
5. Accessibility — 44px touch targets (`min-h-11 min-w-11`), `focus-visible:` not `focus:`, motion opt-in via `motion-safe:` with `motion-reduce:` fallback, never disable zoom.
6. RSC boundaries — server components own layout; `"use client"` pushed to the interactive leaf (cacheComponents/partialPrefetching payoff).
7. Security conventions — zod `safeParse` first line (`lib/validation/<feature>.ts`); `verifyOrigin` in cookie-authenticated mutating Route Handlers; `handleActionError` in every catch; secrets only behind `import "server-only"`, never `NEXT_PUBLIC_`; `getClaims()` only; no `dangerouslySetInnerHTML` without server-side sanitize; header set lives in `lib/security/security-headers.ts` + `public/_headers` (keep in sync); CSP upgrade gate before first user-data page.
8. Database — RLS review gate checklist (US002); Supabase query builder only, no string-built SQL in `rpc` functions.
9. Env vars — table of the 4 vars, public vs server-only, where each is set (`.env.local`, `.dev.vars`, `wrangler secret put`, CI build env).

## Related Code Files
Create: `docs/code-standards.md`. Modify: none. Delete: none.

## Implementation Steps
1. Draft sections 1-9 above, concise bullets, with one short code example each for images, touch target, focus/motion.
2. Cross-check every file path cited against phases 01-03 file lists.
3. Line count check (<200; else split by topic).

## Todo List
- [ ] Create docs/code-standards.md with sections 1-9
- [ ] Verify cited paths match plan file ownership
- [ ] Keep under 200 lines

## Success Criteria
- [local] File exists; every US006 AC item and the US002 checklist item are present (reviewer checklist walk).
- [local] Every path cited exists after phases 01-03 land (or is explicitly marked "create on demand", e.g. `components/ui/`).
- [local] No `components/ui/*` or `tailwind.config.*` files created by this phase.
- No live credentials needed.

## Risk Assessment
| Risk | L | I | Countermove |
|------|---|---|-------------|
| Doc drifts from code as phases change | M | L | Step 2 cross-check; doc-writer reconciles after implementation |
| Doc grows into a tutorial | M | L | Bullets + one example per rule; 200-line cap |

## Security Considerations
- Doc must never contain real keys or project URLs; use placeholders.

## Next Steps
- After all phases land: doc-writer refreshes `docs/` (architecture, changelog) per documentation-management rules.
- Rollback: delete the file.
