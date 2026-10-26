# E2E RED evidence: Like Kudos (#13), phase 01

Policy: `e2e-red-first`. Product code untouched. Nothing committed.

## redTestFiles
- `tests/e2e/kudo-hearts.spec.ts` (new, 9 cases)
- `tests/e2e/sun-kudos-feed.spec.ts` (ID-9 hearts case edited to expect a button with `aria-pressed`)

Support (test-owned): `tests/e2e/support/kudo-hearts-fake.mjs` (new), `tests/e2e/support/kudo-hearts-contract.ts` (new), `tests/e2e/support/fake-supabase-server.mjs` (route + control dispatch), `tests/e2e/support/kudos-contract.ts` (`KUDO_HEART`).

## redCommand
`npm run test:e2e -- tests/e2e/kudo-hearts.spec.ts tests/e2e/sun-kudos-feed.spec.ts`

## redExitCode
1

## redFailure
Counts: 21 run, 10 failed, 11 passed.

All 10 failures are the requested behaviour missing, not config, server or build. The heart is still `span role="img"`:
- kudo-hearts 7a7ec63e: `toHaveRole("button")` got `img`.
- kudo-hearts 91e102ba: `aria-pressed` missing after click (value `null`).
- kudo-hearts sync (Highlight <-> feed): `aria-pressed` missing on the Highlight copy.
- kudo-hearts 63645b03 own Kudo: `toBeDisabled()` got enabled.
- kudo-hearts double click: never disabled while pending (`toBeDisabled()` got enabled).
- kudo-hearts server refusal (500 and not_found): optimistic `aria-pressed="true"` never appears.
- kudo-hearts infinite scroll: `aria-pressed` missing after click.
- kudo-hearts keyboard: `toHaveRole("button")` got `img`.
- sun-kudos-feed ID-9 hearts: own heart enabled, expected disabled.

Passing in the same run: sun-kudos-feed ID-6, ID-7, ID-8 (x2), ID-9 empty state, ID-9 time and title, ID-10, ID-11 (x3), ID-12.

## Regression: other specs stay green
`npm run test:e2e -- tests/e2e/sun-kudos.spec.ts tests/e2e/write-kudo.spec.ts`
- Exit 0. 83 passed, 0 failed.

## Notes
- The first RED attempt stopped at the Next build type-check (TS2345: the `.mjs` fixture fields infer as a union). That was a build failure, not RED. Fixed by coercing the fixture values once in the spec header (`String(...)` / `Number(...)`), then re-run.
- The heart fake is per caller (JWT sub) and overlays the caller's changes onto feed and highlight rows, so a reload shows the stored state. Base fixture kudos only: a Kudo created in the write flow returns `not_found` for `set_kudo_heart` in this fake.
- The fake does not model a "wrong domain" forbidden case (the JWT is only signature-checked). `forbidden` is reached only with no valid session.
- The own-Kudo case uses a 500 ms `waitForTimeout` to prove no request was sent; this is a time-based negative check.
- Keyboard case uses `focus()`, not a Tab walk from the page start.
- `tests/e2e/support/kudos-contract.ts` is now 202 lines (soft cap ~200).
- Ports 3100-3103 and 54398/54399 were free before each run and are free after.
