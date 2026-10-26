# GREEN 3 after fix round 2 (tester hand-back, persisted by controller 2026-10-23)

**Status:** DONE (concern: Next 16.4.0 build nudge, owner decision).

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | npx vitest run | 0 | 63 files, 1054/1054 (+1 repeated-userId export case) |
| 2 | npx tsc --noEmit | 0 | clean |
| 3 | npm run lint | 0 | clean |
| 4-5 | npm run build (1 / retry) | 1 / 0 | Next 16.4.0 SecurityFatalError nudge, then built (24/24 static, admin routes dynamic) |
| 6 | admin-users-actions.spec.ts --repeat-each=10 | 0 | 50/50, scroll race 0 failures |
| 7 | admin-users --repeat-each=3 | 0 | 117/117 |
| 8 | npx playwright test (full) | 0 | **356/356**, 0 flaky, 6.9 min |

Manual probe (Playwright MCP, 768x900, admin): menu anchored under the button; page scroll with the button visible → menu follows and stays open; table box scrolled sideways so the button leaves the box → menu closes. Not probed: vertical clip, other widths.
Ports free afterwards. Evidence: evidence/raw-temper-runs.json (34 entries).
