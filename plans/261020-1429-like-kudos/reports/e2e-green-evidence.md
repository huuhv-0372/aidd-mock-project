# E2E GREEN evidence: Like Kudos (#13), phase 05

Policy: `e2e-red-first`. Product code and specs untouched. Nothing committed. Raw runs: `plans/261020-1429-like-kudos/evidence/raw-temper-runs.json` (11 entries, all exit codes integer).

## Results

| Step | Command | Exit | Counts | Duration |
|---|---|---|---|---|
| 1 | `npm run lint` | 0 | clean | 63 s |
| 1 | `npx tsc --noEmit` | 0 | clean | 14 s |
| 1 | `npx vitest run` | 0 | 40 files, 559 passed, 0 failed | 18.7 s |
| 2 | `npm run test:e2e` (next build + full Playwright) | 0 | 204 passed, 0 failed, 0 flaky, 0 skipped | 7.6 min |
| 3 | `npx playwright test tests/e2e/kudo-hearts.spec.ts --repeat-each=5` | 0 | 45 passed (9 x 5), 0 failed, 0 flaky | 3.1 min |

- RED to GREEN: the RED run had 10 failures in the two specs (`reports/e2e-red-evidence.md`). In the full run all 9 `kudo-hearts.spec.ts` cases and `sun-kudos-feed.spec.ts` ID-9 hearts ("toggle buttons with aria-pressed") pass.
- Flaky: 0 in the full run, 0 in the 5x repeat. No ECONNRESET, no retries.
- Full-suite count is 204. The earlier 261020 fix-round run (195 passed) is from a different tree, so the difference is not attributed here.
- Ports 3100-3103, 54398, 54399 were free before the first command and free after every run. Playwright `webServer`s exit with their run.

## Build and size

- `npx opennextjs-cloudflare build`: exit 0, 207 s. Four WARN lines, all platform notices (OpenNext is not fully supported on Windows, use WSL; Node middleware is experimental). No build error.
- `npx wrangler deploy --dry-run --outdir <scratch>`: exit 0. Total Upload 10668.24 KiB, **gzip 2221.89 KiB**, limit 3072 KiB. Delta +1.25 KiB vs the 261019 final (2220.64 KiB). Nothing uploaded.

## Visual check (Playwright chromium, authed 3103 + fake 54398, `reports/visual/`)

Script: `<scratchpad>/like-visual-check.cjs` (outside the repo). Measurements: `reports/visual/like-measurements.json`. 14 screenshots: feed card grey, red, red+focus, grey+focus, own-disabled at 1440 and 375; Highlight card grey and red at both widths.

Checks that pass (measured with getBoundingClientRect / getComputedStyle):
- Grey to red: `aria-pressed` false to true, icon colour rgb(153,153,153) to rgb(212,39,29), count 15 to 16, in the feed and in the Highlight copy of the same Kudo at the same time.
- Own Kudo: `disabled=true`, grey, count unchanged, `cursor-not-allowed`.
- Keyboard focus: `:focus-visible` true, outline solid 2px rgb(255,234,158).
- Heart geometry: count 24px / weight 700 / line-height 32px, icon 32x32, gap 4px, button 44 px tall with -6 px margin and 6 px padding, so the layout box is 32 px. Matches the phase-04 spec (count 24/32 bold + 32 px icon, gap 4).
- No horizontal overflow at 1440 and 375. 0 console errors, 0 page errors.
- Copy Link button (144x56) is still at the right end of the card action row in every state.

## Findings (not blocking GREEN, owner decides)

1. **Heart width is not the Figma 101 px.** Content width is 59.7 px with a 2-digit count (60.7 when liked). Height and typography match C.4.1. The 101 px frame width is not reproduced by the content box. I had no Figma access in this run, so I cannot tell whether 101 is a fixed frame or a 3-digit count. Needs a Figma check, not a PASS.
2. **No "before" capture for the layout-shift check.** Stash was not allowed, so "card did not shift vs #11" is argued from geometry, not measured against the old build. Heart layout box is 32 px tall (same as the old 32 px frame), and the Copy Link button stays in the same action row. Re-check against a #11 screenshot if the Figma diff needs it.
3. **Keyboard focus ring is low contrast on the cream card.** `FOCUS_RING` uses `login-accent` (rgb(255,234,158)) on a cream card (about #FFF8DC). My estimate is about 1.1:1 (not measured), below the 3:1 non-text contrast of WCAG 1.4.11. The same ring is used by Copy Link and other shared controls, so this is a token-level issue, not new to #13.
4. **Element screenshots at 1440 show the sticky site header over the top of the card** (`like-1440-feed-card-red-focus.png`). This is a capture artefact of the sticky header at `lg:` and not a card bug.
5. **Stale comment in `tests/e2e/kudo-hearts.spec.ts:5`**: "Expected RED now: the heart is still a display-only span". The spec is GREEN now. Test file is owned by the tester, not changed here. Fix the header comment in the next test edit.

## Not verified here

- Real Supabase SQL (`20261020150000_create_kudo_heart_rpc.sql`): the user runs it, per the Scope Contract. Migration reads cleanly: `is_allowed_account` exists (`20261012133000_create_profiles.sql:48`), grants are authenticated only.
- Pointer hover state, Highlight own-Kudo heart, and the 375 Highlight focus ring were not captured.

## Ports and processes

Servers started for the visual check (fake Supabase 54398, `next start` 3103) were stopped by PID (38992, 36040). Re-check showed no listeners on 3100-3103, 54398, 54399, 8787. Nothing was committed.

## Final run (frozen code, after review fix)

Scope: `components/kudos/kudo-hearts.tsx` (`disabled={own}`, `aria-disabled={pending || undefined}`), `tests/e2e/kudo-hearts.spec.ts` (aria-disabled pending check, keyboard focus stays on heart), `tests/e2e/support/kudo-hearts-fake.mjs` (non-boolean `p_liked` → `not_found`). Full suite run as safety-critical data mutation. No product or test file edited in this run.

| Step | Command | Exit | Counts | Duration |
|---|---|---|---|---|
| 1 | `npm run lint` | 0 | clean | ~63 s |
| 2 | `npx tsc --noEmit` | 0 | clean | ~14 s |
| 3 | `npx vitest run` | 0 | 40 files, 559 passed, 0 failed | ~19 s |
| 4 | `npm run test:e2e` (next build + full Playwright) | 0 | 204 passed, 0 failed, 0 flaky, 0 skipped | 9.1 min |
| 5 | `npx playwright test tests/e2e/kudo-hearts.spec.ts tests/e2e/sun-kudos-feed.spec.ts --repeat-each=5` | 0 | 105 passed (21 x 5), 0 failed, 0 flaky | 5.9 min |
| 6 | `npx opennextjs-cloudflare build` | 0 | worker saved, build complete | — |
| 6 | `npx wrangler deploy --dry-run --outdir <scratch>/wrangler-out` | 0 | gzip 2221.89 KiB (limit 3072 KiB), nothing uploaded | — |

- The E2E count (204) is unchanged from the GREEN run. The 9 `kudo-hearts.spec.ts` cases still pass, now with the `aria-disabled="true"` pending assertion and the keyboard focus-stays-on-heart assertion.
- Flaky: 0 in the full run and in the 5x repeat. The `[WebServer]` lines (`create_kudo failed`, `set_kudo_heart failed ... not_found`) are server logs from the failure-path cases, not test failures.
- Previous finding 5 (stale RED comment in the `kudo-hearts.spec.ts` header) is resolved. The header now describes the GREEN behaviour.
- Ports 3100-3103, 3104, 54398, 54399, 8787 had no listeners before the first command and none after the last. No servers were started by hand in this run, so nothing needed killing.

Evidence: `plans/261020-1429-like-kudos/evidence/raw-temper-runs.json` (7 final entries appended, prefixed `(final)`) and `plans/261020-1429-like-kudos/evidence/temper-results.json` (final runs only, built with `buildTemperResults`, integer exit codes, all `status: pass`).

Not verified here (unchanged from the GREEN run): real Supabase SQL for `20261020150000_create_kudo_heart_rpc.sql` (owner runs it, per the Scope Contract).
