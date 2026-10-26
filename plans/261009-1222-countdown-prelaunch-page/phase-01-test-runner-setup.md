---
phase: 01
title: "Test runner setup (Vitest + Playwright)"
status: completed
feature: F001
owner: implementer
test_policy: e2e-red-first
blocked_by: []
---

# Phase 01 — Test runner setup

## Context Links
- `../../CLAUDE.md`, `clarifications.md` (Vitest + @playwright/test approved)
- `spec/countdown-prelaunch-gate/technical-spec.md` § 5.1

## Overview
Priority P1 · pending. Install and configure the two runners so phase 02 can produce a real RED. No app code.

## Key Insights
- Scenarios need different `EVENT_START_AT` per server process (future / past / invalid). One webServer cannot cover them → run **three `next start` servers on separate ports** from one build.
- Explicit process env wins over `.env*` files in Next, so a developer's `.env.local` cannot leak into the test servers. Use an invalid string (not "missing") for the fail-open server; "missing" is unit-tested in phase 05.
- Building inside each webServer command would race; build once in the npm script.

## Requirements
- devDependencies: `vitest`, `@playwright/test` (pin current majors). Chromium only: `npx playwright install chromium`.
- Scripts: `"test": "vitest run"`, `"test:e2e": "next build && playwright test"`.
- `vitest.config.ts`: `environment: 'node'`, `include: ['tests/unit/**/*.test.ts']`, alias `@/` → repo root (match tsconfig paths).
- `playwright.config.ts`: `testDir: 'tests/e2e'`, chromium project, `webServer` array:

| Name | Port | EVENT_START_AT |
|------|------|----------------|
| future | 3100 | `now + 2d 3h 4m 30s` computed at config load, ISO with `+07:00` offset |
| past | 3101 | `2020-01-01T00:00:00+07:00` |
| invalid | 3102 | `not-a-date` |

  Each `command: 'npx next start -p <port>'`, `reuseExistingServer: !process.env.CI`. Export the three base URLs + the future target ms through `process.env` (e.g. `E2E_FUTURE_URL`, `E2E_FUTURE_TARGET_MS`) so the spec reads them; no `test.use` hard-coding of ports in two places.
- `.gitignore`: add `/test-results/`, `/playwright-report/`, `/playwright/.cache/`.
- Non-functional: config files < 200 lines; Worker bundle unaffected (dev deps only).

## Architecture
`npm run test:e2e` → `next build` → Playwright boots 3 servers (env differs) → `tests/e2e/*.spec.ts`. `npm test` → Vitest over `tests/unit`.

## Related Code Files
- Modify: `package.json`, `package-lock.json`, `.gitignore`
- Create: `vitest.config.ts`, `playwright.config.ts`
- Delete: none

## Implementation Steps
1. `npm i -D vitest @playwright/test`; `npx playwright install chromium`.
2. Add the two scripts.
3. Write `vitest.config.ts` (`passWithNoTests: true` until phase 04 adds tests).
4. Write `playwright.config.ts` with helper computing the future ISO string with `+07:00` offset.
5. Update `.gitignore`.

## Todo List
- [ ] deps installed, lockfile committed
- [ ] scripts `test`, `test:e2e`
- [ ] vitest config
- [ ] playwright config with 3 webServers
- [ ] gitignore test artifacts

## Success Criteria
- `npm test` exits 0 (no tests yet).
- `npx playwright test --list` exits 0 (config parses).
- `npm run lint` exits 0; `npm run build` exits 0.
- Scope Contract: Changed = tooling/config only; Impacted = build (config is safety-critical list → full lint+build); Skipped = app behavior (none exists).

## Risk Assessment
| Risk | L | I | Mitigation |
|------|---|---|-----------|
| `next build` under cacheComponents fails later for unrelated reason, blocking E2E | M | H | phase 02 RED must be assertion-caused; tester distinguishes build failure from RED |
| Port clash on dev machines | L | M | uncommon ports 3100-3102 |
| Playwright browser download blocked by proxy/network | M | M | report BLOCKED with exact error; do not fall back to MCP browser for RED |

## Security Considerations
No secrets. `EVENT_START_AT` is not secret; test values live in config only.

## Next Steps
Phase 02 (RED gate). Rollback: revert the commit; no runtime code touched.

## Delivery Notes
✓ Completed. Deviations: @types/node bumped ^20→^22 (vitest 5 peer); eslint.config.mjs now ignores `.claude/**` + test artifacts; `playwright.config.ts` health-check moved to `/favicon.ico` (gated `/` never became ready) and future target computed once at config load, reused by workers (clock-skew fix).
