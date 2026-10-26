# E2E RED evidence: error pages 404 + 403 (phase 01)

- redTestFiles: `tests/e2e/error-pages.spec.ts` (11 cases: 404 x6, 403 x5)
- redCommand: `npm run test:e2e -- tests/e2e/error-pages.spec.ts`
- redExitCode: 1 (`next build` passed; Playwright: 10 failed, 1 passed)
- Log: `C:/Users/HOANGV~1.HUU/AppData/Local/Temp/claude/c--Users-hoang-van-huu-Downloads-AI-AIDD-aidd-mockproject/026bc11f-bafc-4537-8784-9a4397c64892/scratchpad/red-run-final.log`

## redFailure (all are missing behaviour or design, none are config/type/browser errors)

| Test | Actual | Expected | Missing piece |
|------|--------|----------|---------------|
| 404 guest GET unknown path | HTTP 200 (proxy default-deny redirects to `/login`) | 404 | see concern C1 |
| 404 signed-in GET unknown path | description "Trang bạn tìm không tồn tại hoặc đã bị xoá." not found | new VI copy | copy still "...đã được chuyển đi nơi khác." |
| 404 VI heading uppercase | `text-transform: none` | `uppercase` | CSS not applied |
| 404 EN | h1 "Page not found" | h1 "NOT FOUND" | EN copy not restyled |
| 404/403 background | no element uses `error-bg` | present | background layer not built |
| 403 guest GET /403 | HTTP 200 (redirected to `/login`) | 403, stays on `/403` | `/403` route and `PUBLIC_PATHS` entry missing |
| 403 signed-in GET /403 | HTTP 404 | 403 | `/403` route + `forbidden()` missing |
| 403 "Về trang chủ" click | HTTP 404 on `/403` | 403 + heading | `/403` route missing |
| 403 EN | HTTP 404 | 403 | `/403` route missing |
| 403 375px background | no `error-bg` | present | background layer |

Passing: 404 "Về trang chủ" click lands on `/` (the home link already exists; regression guard only).

Not yet covered by a failing assertion in this run because the earlier failure stops the test: the `<img src*="not-found-robot">` / `access-denied-monitor` visibility, and the no-banner/contentinfo checks on the new pages. The UI phase must confirm these once the status and copy pass.

## Regression guard

- `npm run test:e2e -- tests/e2e/awards-information.spec.ts`: exit 0, 14 passed (log `.../scratchpad/awards-run.log`).

## Concerns for the orchestrator

- C1: Guest `GET` on an unknown path is default-denied to `/login` by `lib/auth/resolve-auth-redirect.ts` (`PUBLIC_PATHS` allowlist). The contract asks for 404 for guests too. Making that pass means letting unknown paths through the auth gate for anonymous users, which weakens the default-deny rule. Decide: keep the guest 404 case (needs an explicit design change) or change it to "guest unknown path -> /login". The spec currently encodes the contract as written.
- C2: `tests/e2e/language-switch-authed.spec.ts` (~lines 69-71) asserts EN 404 h1 `Page not found`, link `Back to home`, title `Page not found | SAA 2025`. The new EN h1 `NOT FOUND` breaks that case once phase 02 lands. It is not edited here, per the instruction to keep other specs untouched. Its owner must update it in phase 02 or 03.
- C3: `tests/e2e/awards-information.spec.ts` header line 12 documents the old VI body implicitly only through the heading; the heading is unchanged, so no break expected.
- No files other than `tests/e2e/error-pages.spec.ts` and this report were created. Nothing committed. All ports (3100-3103, 54398, 54399) were freed after runs.
