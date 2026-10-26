# Phase 03 GREEN 1 (tester hand-back, persisted by controller 2026-10-23)

**Status:** BLOCKED — full E2E 355/356.

| Command | Exit | Result |
|---|---|---|
| npm run build (1) | 1 | Next 16.4.0 SecurityFatalError nudge, no compile error |
| npm run build (2) | 0 | compiled 30.0s; no [auth]/[admin]/HANGING_PROMISE |
| npx playwright test tests/e2e/admin-users --repeat-each=3 | 0 | 117/117 |
| npx playwright test (full) | 1 | 355 passed, 1 failed / 356 (317 + 39) |
| npx playwright test tests/e2e/admin-users-actions.spec.ts:78 --repeat-each=5 | 1 | 4 passed, 1 failed |
| npx opennextjs-cloudflare build (1 / 2) | 1 / 0 | nudge, then built |
| npx wrangler deploy --dry-run | 0 | gzip 2347.54 KiB (baseline 2258.47, +89 KiB) |

## Failure — code race (not test)
`admin-users-actions.spec.ts:78` times out waiting for `admin-role-item`; snapshot shows the menu closed. `components/admin/admin-user-actions-menu.tsx` (~50-60) closes the menu on any capture-phase `scroll`; Playwright scrolls rows near/below the 900px fold into view after the menu opens → it closes. Probe: rows nth(5)/nth(6) failed 2/10; after scrollIntoView first 6/6 opened.

## Visual 1440 (screenshots in reports/visual/)
Match: header 88, title row, Export (92x52, #FFEA9E / #00101A), filter y, Unit/Level, search 259x48 @1101/206, table x80 y270 w1280, all 12 column widths, footer 48.
Mismatch: **header row 86px vs 65** (two-line labels wrap to 3: "∑ sent Kudos (642)", Received, Time to get, Last Logged in); **Role filter 128 vs 123**; table body rgb(0,7,12) vs #00101A family (close). Rows 73/105/85 data-dependent (long emails). 20 rows + pagination intentional.
768/375: no page scroll, table scrolls inside admin-table-scroll (scrollWidth 1280), filters stack. Account menu as admin: Profile, Dashboard, Sign out.
**Sortable header links < 44px tall at 375/768** (CLAUDE.md touch target).

Ports 3100-3103, 54398 free. Evidence: evidence/raw-temper-runs.json (11 entries).
