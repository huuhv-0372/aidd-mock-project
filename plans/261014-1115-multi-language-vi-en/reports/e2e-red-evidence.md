# E2E RED evidence — VI/EN language switch (phase 01)

Date: 2026-10-14 · Policy: e2e-red-first · Scope: two new test files, no implementation touched.

## redTestFiles
- `tests/e2e/language-switch.spec.ts` (8 tests, chromium)
- `tests/unit/locale.test.ts` (Vitest)

## Commands and exit codes
| # | Command | Exit | Outcome |
|---|---|---|---|
| 1 | `npx next build` (tests in place) | 1 | Fails at TypeScript: `tests/unit/locale.test.ts(2,81)` / `(3,30)` TS2307, modules `@/lib/i18n/locales` and `@/lib/validation/locale` missing. Not a screen assertion, so not a valid RED. |
| 2 | `npx next build` (unit file moved aside for this build only, restored byte-identical via cmp) | 0 | Build of current code OK, `.next/BUILD_ID` written. |
| 3 | `npx playwright test tests/e2e/language-switch.spec.ts --reporter=list` | 1 | 1 passed, 7 failed (~1.4 min). All failures are language assertions. |
| 4 | `npx vitest run tests/unit/locale.test.ts` | 1 | Test file fails to load: `Cannot find package '@/lib/i18n/locales'`. Zero tests executed. Expected missing-module RED. |

Servers: Playwright started and stopped its own webServers (3100-3103, fake Supabase 54398). No LISTENING sockets left after the runs. No stale `next start` existed before the first run.

## redFailure (first failing assertion per E2E test)
| Test | Result | First failing assertion |
|---|---|---|
| ID-10 default VN on `/` | PASS | — (partial pass expected, current layout hardcodes `lang="vi"`) |
| ID-24/58 dropdown has VN, EN each with flag | FAIL | `getByRole('listbox').getByRole('option',{name:'VN'}).locator('svg')` expected not 0, received 0 (options are text-only today) |
| ID-25 choose EN on `/` | FAIL | `html` `lang` expected "en", received "vi" |
| EN survives reload on `/` | FAIL | `html` `lang` expected "en", received "vi" |
| ID-26 choose VN again | FAIL | `html` `lang` expected "en", received "vi" (after choosing EN) |
| `/login` choose EN | FAIL | `html` `lang` expected "en", received "vi" |
| Choosing EN writes `NEXT_LOCALE=en` (footer check) | FAIL | footer `contentinfo` expected substring "General standards", received "About SAA 2025 Awards Information Sun* Kudos Tiêu chuẩn chung Bản quyền thuộc về Sun* © 2025" |
| `NEXT_LOCALE=en` renders `/awards-information` in EN (authed 3103) | FAIL | `html` `lang` expected "en", received "vi" (the "Individual" / "per prize" checks are not reached yet) |

Unit (`locale.test.ts`): load failure, `Cannot find package '@/lib/i18n/locales'`. Once the modules exist, the assertions cover `LOCALES`, `DEFAULT_LOCALE`, `LOCALE_COOKIE`, `isLocale`, `resolveLocale` fallbacks and `localeSchema` accept/reject.

## Already passing
- ID-10 (default VN, trigger "VN" + flag, `lang="vi"`, footer "Tiêu chuẩn chung") — passes on current code.

## Concerns for the orchestrator
1. `tsconfig.json` includes `**/*.ts`, so while `lib/i18n/locales.ts` and `lib/validation/locale.ts` are missing, `next build` (and therefore `npm run test:e2e`) fails at type-check. Phase 02 must create those two modules first, or the build stays red for reasons unrelated to the screens. Until then, a RED E2E run requires moving the unit file aside for the build (as done here).
2. Scenario 4b (`/awards-information`) fails on `lang` before it reaches the "Individual" / "per prize" checks; it is still a valid language RED, but those two copy checks are unverified until `lang` is fixed.
3. The footer copyright on the current code is "Bản quyền thuộc về Sun* © 2025"; the test asserts only the listed "Copyright © Sun* 2025" for EN, as instructed.
