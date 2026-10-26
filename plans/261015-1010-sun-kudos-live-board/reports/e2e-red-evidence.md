# E2E RED evidence — Sun* Kudos Live board (phase 01)

Policy: `e2e-red-first`. Web only (Chromium). Final code state (fixtures aligned to `20261015100000_create_kudos.sql`).

## RED gate

- **redTestFiles:** `tests/e2e/sun-kudos.spec.ts`, `tests/e2e/sun-kudos-feed.spec.ts`
- **redCommand:** `npm run test:e2e -- tests/e2e/sun-kudos.spec.ts tests/e2e/sun-kudos-feed.spec.ts` (runs `next build && playwright test <files>`)
- **redExitCode:** `1` (real process exit; build compiled successfully, all webServers started)
- **Result:** 19 failed, 1 passed (the guest redirect, see below), 20 total
- **redFailure (first real failure):**
  ```
  Error: expect(locator).toHaveCount(expected) failed
  Locator: getByTestId('all-kudos').getByTestId('kudo-card')
  Expected: 10
  Received: 0
  ```
  Root cause on the page: `/sun-kudos` renders the app 404 for a signed-in user (`Không tìm thấy trang`, from the `error-context.md` snapshot), so every content locator resolves to 0 elements.
- Failures are missing-content assertions only: `all-kudos`, `kudo-card`, `kudo-hearts`, `kudo-time`, `kudos-stats`, `spotlight-total`, `searchbox`, `Pan/Zoom`, `Sun* Kudos` header link (`aria-current`), `highlight-kudos`, `language-selector` text. No webServer, port, fake-supabase, or build error appears in the run.
- Guest case `71b3ef43` (`/sun-kudos` → `/login`) already passes: the proxy default-deny covers it. It is a regression guard, not a RED signal.

## Regression gate (existing suite)

- Command: `npx playwright test` (all specs, after the build above; nothing excluded)
- Result: **75 passed, 19 failed, exit 1**. All 19 failures are in the two new Sun* Kudos specs (11 in `sun-kudos-feed.spec.ts`, 8 in `sun-kudos.spec.ts`). Every existing spec passes with the edited fake server.
- Run time: about 5.1 min total. Missing-element timeouts (30 s each) make the RED run slow.

## Static checks

- `npx tsc --noEmit`: exit 0 (whole project).
- `npm run lint`: exit 0 (whole project).
- ESLint on owned files: exit 0.

## Files

- Created: `tests/e2e/sun-kudos.spec.ts` (147 lines), `tests/e2e/sun-kudos-feed.spec.ts` (143 lines), `tests/e2e/support/kudos-contract.ts` (70 lines), `tests/e2e/support/kudos-fixtures.mjs` (286 lines)
- Edited (additive): `tests/e2e/support/fake-supabase-server.mjs`. Adds `/rest/v1/*` dispatch (POST `rpc/kudos_*`, GET `hashtags|departments`) and an optional `sub` query on `/__mint`. Existing routes are unchanged.
- `playwright.config.ts`: not touched.

## Fixture data

- 28 kudos (feed pages 10 / 10 / 8). Highlight returns top 5 by hearts.
- Hashtags and 50 departments mirror the migration. Viewer is `E2E User`, department `CEVC1`.
- Spotlight: 23 recipient nodes, total 388.
- Gifts: 10 recipients. Viewer stats: received 3, sent 2, hearts 17, boxes 4 / 2.
- Viewer-owned kudo (`is_mine`) and a liked kudo (`liked_by_me`) are present.
- `EMPTY_USER_ID` returns empty lists and zero counts. Anonymous callers get `[]`, `null` spotlight, and `[]` stats, per `kudo-types.ts`.

## Open items for the implementers

- Sidebar: the phase lists 5 rows; `specs.csv` says "6 dòng số liệu". Built to 5. Confirm with phase 05.
- `kudos_my_stats` and `kudos_latest_gift_recipients` return arrays (table/setof shape). Phase 03 zod must match.
- Fixture avatars are `null`; kudo images point at `/images/kudos/demo/*`, which do not exist yet.
- `kudos-fixtures.mjs` is 286 lines, over the ~200-line guideline. Not split because the owned-file list fixed the names.
- Specs rely on these contract points: `kudo-time` exact text `HH:mm - MM/DD/YYYY`; disabled arrows accept native `disabled` or `aria-disabled="true"`; `kudo-recipient` is a link.
