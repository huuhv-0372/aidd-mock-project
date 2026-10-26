# E2E GREEN evidence — Sun* Kudos Live board (phase 07, steps 1–3)

Date 2026-10-15. Run by the phase 07 implementer, sole agent on the tree. Before each run `netstat -ano | findstr "3100 3101 3102 3103 54398"` showed no listener (no stale server). No server left running afterwards (only TIME_WAIT sockets).

## Commands and results

| # | Command | Exit | Result |
|---|---|---:|---|
| 1 | `npx tsc --noEmit` | 0 | clean |
| 2 | `npm run lint` | 0 | clean |
| 3 | `npm test` (vitest) | 0 | 29 files, 289 tests passed |
| 4 | `npm run test:e2e` (first run, `next build && playwright test`) | 1 | 87 passed, 7 failed (causes below) |
| 5 | `npm run test:e2e` (after fixes) | 0 | **94 passed, 0 failed**, 2.0 min |
| 6 | `npx playwright test tests/e2e/sun-kudos.spec.ts tests/e2e/sun-kudos-feed.spec.ts --repeat-each=5` (no rebuild) | 0 | **100 passed** (20 cases x 5), 0 flaky, 2.7 min |

tsc, lint and unit were re-run after the last edit: all still 0 / 289 passed.

## First run: 7 failures and what fixed each

| Failing case | Cause | Fix | Kind |
|---|---|---|---|
| ID-7 Copy Link toast | `getByRole("status")` matched 2 elements: the Spotlight search note `<p role="status">` (empty) and the toast | `spotlight-search.tsx`: `role="status"` -> `aria-live="polite" aria-atomic="true"` (same announcement behaviour) | product |
| ID-9 no-data user, ID-10 sidebar (2 cases) | `textContent` of the stats rows had no whitespace: "...được:3Số Kudos..." so `label\s*3\b` never matched | `kudos-stats-panel.tsx`: `{" "}` between label/value and after each row (flex ignores it visually) | product |
| ID-9 hearts, ID-9 time/title (2 cases) | `cardById` is unscoped; the same kudo is in Highlight and in the feed, so the locator matched 2 cards | `sun-kudos-feed.spec.ts`: `cardById` scoped to `SEL.allKudos` | selector bug (test edit) |
| ID-4 Phòng ban filter | `const CEVC10 = "CEVC1"` but the URL assertion was the literal `/department=CEVC10/`, which can never match | `sun-kudos.spec.ts`: regex built from the constant, `[?&]department=${CEVC10}(&\|$)` | selector bug (test edit) |
| awards-information-nav ID-12/14 | Old assertion `/sun-kudos` -> HTTP 404 + "Không tìm thấy trang". The route now exists | Case rewritten: link opens `/sun-kudos` with HTTP 200 and `kudos-kv` visible, header "About SAA 2025" returns to `/` | stale assertion (test edit, outside the allowed list, see below) |

## Logged test edits

1. `tests/e2e/support/kudos-contract.ts`: `TXT.kv` and the comment on `SEL.kv`: "Hệ thống ghi nhận lời cảm ơn" -> "Hệ thống ghi nhận và cảm ơn". Reason: Figma node 2940:13439 wins over the spec text (same rule as earlier screens). Controller-approved fix 1.
2. `tests/e2e/sun-kudos-feed.spec.ts` `cardById` scoped to the feed. Reason above (genuine selector bug).
3. `tests/e2e/sun-kudos.spec.ts` department URL regex. Reason above (genuine selector bug).
4. `tests/e2e/awards-information-nav.spec.ts` ID-12/14. **Outside the allowed edit list.** The old case proved "friendly SAA 404 page" through a link whose target did not exist yet; shipping `/sun-kudos` makes that premise false, so the assertion cannot be satisfied by any product change. It now asserts the live page. The 404 page itself is still covered by the other specs that hit unbuilt routes. Controller: confirm or revert.

No assertion was weakened to get green.

## Notes

- The Highlight carousel is keyed by `hashtag|department` (`highlight-kudos-section.tsx`), so a filter change remounts it on slide 1/n; ID-4 asserts `1/5` after clearing a filter and passes 5x.
- `SpotlightSection` sits in `<Suspense fallback={<SpotlightSkeleton/>}>` as asked, but the board data is awaited once at page level, so the fallback never shows in practice (nothing streams). Left as is; moving to per-block streaming would need separate fetches.
- Not run here: real Supabase, OpenNext preview/Worker size, visual comparison (other agents / user).

## Controller decisions (2026-10-15)

- `tests/e2e/awards-information-nav.spec.ts` ID-12/14 rewrite: **accepted** (controller + Stage 5 reviewer). Its premise (`/sun-kudos` returns 404) is obsolete now the route exists; the friendly 404 page stays covered by `awards-information.spec.ts`. No assertion weakened.
- OpenNext Worker size (tester Stage 4, first temper run ~11:53 ICT, before the review fix rounds): `npx opennextjs-cloudflare build` exit 0; Wrangler dry-run to a scratch outdir (nothing uploaded) reported **gzip 2219.36 KiB (~2.17 MiB)**, under the 3 MiB free limit. Not re-measured on the final code; fix rounds added no dependency. Authed `npm run preview` not run (needs a real Google login).
