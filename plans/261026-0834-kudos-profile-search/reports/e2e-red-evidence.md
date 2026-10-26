# E2E RED — Phase 01 (2026-10-26)

Persisted by the orchestrator from the tester hand-back (the tester's rules forbid report files). Verified against
`evidence/e2e-red-run.log`: last line `EXIT=1`, summary `18 failed`, ports 3100–3103/54398 free afterwards.

- **redTestFiles:** `tests/e2e/sun-kudos-profile-search.spec.ts` (10 cases), `tests/e2e/sun-kudos-profile-search-keyboard.spec.ts` (8 cases: keyboard, Esc/Tab, magnifier, 375/1440 layout)
- **redCommand:** `npm run test:e2e -- tests/e2e/sun-kudos-profile-search`
- **redExitCode:** `1`
- **redFailure:** `profile search: the pill must be a combobox named 'Tìm kiếm profile Sunner'` — `getByRole('combobox', { name: 'Tìm kiếm profile Sunner' })` not found (`support/kudos-contract.ts:237`). EN case fails the same way on `Search for Sunner profile`.
- Valid RED: all 18 fail on the missing combobox; no build/infra/fake failure in the final run. Two earlier runs stopped at the Next 16.4 SecurityFatalError nudge (retry passed); one run superseded by a spec edit. All kept in `evidence/`.

## Support changes
- `tests/e2e/support/kudos-contract.ts`: `PROFILE_SEARCH`, `profileSearch` locators, `openProfileSearch`, `failSearchRpc` (file now 241 lines — split candidate at phase 03).
- `tests/e2e/support/write-kudo-fixtures.mjs`: additive `failSearch` flag, control `/__kudo-fail-search?on=`, marker `boom-secret-detail`.

## Regression / checks
- `npx playwright test tests/e2e/write-kudo.spec.ts`: 75 passed, exit 0.
- `npx tsc --noEmit`: 0. `npm run lint`: 0.

## Contract the UI must meet (from the spec)
- Combobox `placeholder` and accessible name both `Tìm kiếm profile Sunner` (EN `Search for Sunner profile`).
- Options carry `id`s; `aria-activedescendant` points at the highlighted option id.
- Submit button named `Tìm kiếm`, ≥44×44, inside `data-testid="profile-search"`.
- Listbox named `Kết quả tìm kiếm Sunner`; status row via `getByTestId('profile-search').getByRole('status')`.

## Open notes
- Blank case uses one extra fixed `flushUi(400)` before the positive sentinel; case 10 uses the planned 1100 ms wait. Flakiness to be checked with `--repeat-each` at GREEN.
- TC `9e689933` step 3 ("required" error) deliberately not asserted — clarifications chose spec ("Không bắt buộc").
