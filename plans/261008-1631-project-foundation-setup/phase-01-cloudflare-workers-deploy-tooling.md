# Phase 01 — Cloudflare Workers deploy tooling + dependencies

## Context Links
- Spec: `spec/project-foundation/technical-spec.md` § 3.1 (A1), § 4.6 (Configuration); `functional-spec.md` US001, FR-001, § 12
- Architecture: `spec/system/architecture.md` § Deployment Layer
- Research: `plans/reports/researcher-cloudflare-workers-deployment.md` §§ 2, 3, 5
- OpenNext Node-middleware support: https://github.com/opennextjs/opennextjs-cloudflare/pull/1309 (merged 2026-08-25, experimental)

## Overview
- Priority: P1 · Status: completed (qua plan Countdown/Login) · Effort: 2h
- Make `npm run cf:deploy` build with OpenNext and deploy with Wrangler. Install every dependency the
  whole plan needs so later phases never edit `package.json`. Fix `.gitignore` / env template.

## Key Insights
- `@cloudflare/next-on-pages` deprecated; `vinext` beta and incompatible with `cacheComponents`/PPR → OpenNext.
- `.gitignore` already has `.env*` → a new `.env.example` would be silently ignored. Must add `!.env.example`.
- `.dev.vars*`, `.open-next/`, `.wrangler/` are not ignored yet.
- `next.config.ts` needs NO change for OpenNext. `initOpenNextCloudflareForDev()` only matters for
  Cloudflare bindings (KV/R2/D1) in `next dev`; none are used → YAGNI, skip (keeps `next.config.ts` owned by phase 02).
- Phase 03 adds `proxy.ts`; Next 16 proxy is Node runtime → requires an `@opennextjs/cloudflare`
  release that includes PR #1309. Pin at or above that release.
- Node 24.3 locally. Windows native build "not guaranteed" by Cloudflare.

## Requirements
- Functional: FR-001 — single command builds (OpenNext) and deploys (Wrangler). US001 AC2 — oversize bundle fails non-zero before publish (native `wrangler deploy` behaviour; verified via dry-run size report).
- Non-functional: toolchain versions pinned exact (no `^`) per OWASP report § 6; Free-tier baseline (3 MiB gzip).

## Architecture
```
npm run cf:deploy
  └─ opennextjs-cloudflare build   → next build → .open-next/worker.js + .open-next/assets
  └─ opennextjs-cloudflare deploy  → wrangler deploy (reads wrangler.jsonc) → Worker published
npm run cf:preview → build + local workerd (wrangler dev) on .open-next output
```
Secrets path: local `next dev` reads `.env.local`; `cf:preview` reads `.dev.vars`; production uses
`wrangler secret put SUPABASE_SECRET_KEY`; public vars (`NEXT_PUBLIC_*`) must be present at BUILD time
(inlined by Next) → set in shell/CI env before `cf:build`, and mirrored in `wrangler.jsonc` `vars` only if non-secret.

## Related Code Files
Create:
- `wrangler.jsonc` — `name: "aidd-mockproject"`, `main: ".open-next/worker.js"`, `compatibility_date` = install date (>= 2024-09-23), `compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"]`, `assets: { directory: ".open-next/assets", binding: "ASSETS" }`, `observability: { enabled: true }` (so BR-004 server logs are visible). No secrets in `vars`.
- `open-next.config.ts` — `export default defineCloudflareConfig();` (no R2 incremental cache — YAGNI, no cached data yet).
- `.env.example` — four vars from technical-spec § 4.6, each with a public/server-only comment.
- `vitest.config.ts` — node environment, `@/` alias → repo root, include `**/*.test.ts`.

Modify:
- `package.json` — scripts + deps (below).
- `.gitignore` — add `!.env.example`, `.dev.vars*`, `.open-next/`, `.wrangler/`.

## Implementation Steps
1. `npm i @supabase/supabase-js @supabase/ssr zod server-only`.
2. `npm i -D --save-exact @opennextjs/cloudflare@latest wrangler@latest vitest`; confirm installed
   `@opennextjs/cloudflare` CHANGELOG mentions Node.js middleware support (PR #1309). If not, bump.
3. Add scripts:
   - `"cf:build": "opennextjs-cloudflare build"`
   - `"cf:preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview"`
   - `"cf:deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"`
   - `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`
4. Create `wrangler.jsonc`, `open-next.config.ts`, `vitest.config.ts` as above.
5. Create `.env.example`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=            # public — inlined into client bundle
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= # public — sb_publishable_..., safe only because RLS is on (BR-001)
   SUPABASE_SECRET_KEY=                  # SERVER-ONLY — sb_secret_..., bypasses RLS; never NEXT_PUBLIC_; prod via `wrangler secret put`
   CLOUDFLARE_ACCOUNT_ID=                # deploy tooling only — read by wrangler, never by app code
   ```
6. Update `.gitignore`; verify `git check-ignore .env.example` returns nothing and `git check-ignore .dev.vars` matches.
7. Run local checks (below). Attempt `npm run cf:build` on Windows; if it fails for platform reasons, record and re-run under WSL/CI.

## Todo List
- [ ] Install runtime deps (supabase-js, ssr, zod, server-only)
- [ ] Install pinned dev deps (opennext, wrangler, vitest) and confirm PR #1309 included
- [ ] Add cf:build / cf:preview / cf:deploy / typecheck / test scripts
- [ ] Create wrangler.jsonc, open-next.config.ts, vitest.config.ts
- [ ] Create .env.example with public/server-only comments
- [ ] Fix .gitignore (unignore .env.example; ignore .dev.vars*, .open-next/, .wrangler/)
- [ ] Run local done-criteria; record Windows result

## Success Criteria
- [local] `npm run typecheck`, `npm run lint`, `npm run build` exit 0; `npm test` exits 0 (no tests yet → use `vitest run --passWithNoTests` until phase 02 adds tests, or simply confirm runner boots).
- [local] `git check-ignore .env.example` → not ignored; `.dev.vars`, `.open-next/` → ignored.
- [local] `@opennextjs/cloudflare` and `wrangler` entries in `package.json` have no `^`/`~`.
- [local, may need WSL] `npm run cf:build` exits 0 and produces `.open-next/worker.js`.
- [local, may need WSL] `npx wrangler deploy --dry-run` prints gzip size < 3 MiB (FR-001 budget).
- [live — Cloudflare account] `npm run cf:deploy` exits 0; `*.workers.dev` URL serves `/` (SC-001).

## Risk Assessment
| Risk | L | I | Countermove |
|------|---|---|-------------|
| OpenNext build fails natively on Windows | M | M | Run in WSL or CI; documented in Open Questions |
| Installed OpenNext predates Node-middleware support → phase 03 `proxy.ts` build fails | M | H | Step 2 version check; pin exact |
| Bundle grows past 3 MiB free cap | L (now) | H | Dry-run size check in done-criteria; watch per dependency added |
| `NEXT_PUBLIC_*` missing at build time → empty values inlined | M | H | Document: export them before `cf:build`; phase 03 env helper throws clearly at runtime |

## Security Considerations
- No secret in `wrangler.jsonc` `vars` or `.env.example` values. `.env*`/`.dev.vars*` stay ignored.
- `CLOUDFLARE_ACCOUNT_ID` is not a secret but is tooling-only; API token stays in wrangler login / CI secret.

## Next Steps
- Unblocks 02, 03, 05. Rollback: revert commit; nothing deployed until `cf:deploy` is run.
