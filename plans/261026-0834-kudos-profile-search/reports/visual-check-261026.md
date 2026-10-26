# Visual check — profile search pill (2026-10-26)

Measured by the tester on the built app (`next start -p 3103`, fake Supabase 54398, signed in), numbers from
`getBoundingClientRect` / `getComputedStyle`; screenshots in `reports/visual/`, viewed by the orchestrator.
Figma reference: MoMorph `MaZUn5xHXZ` node `2940:13450` — 381x72, 1px #998C5F border, rgba(255,234,158,0.10) fill,
radius 68, padding 24/16.

## GREEN 1 (before fix round 1) — `1440-*.png`, `375-*.png`

| Check | 1440 | 375 |
|---|---|---|
| Pill box | 381.34 x 72 at (914.66, 408) | 343 x 58 at x 16, under A.1 (A.1 y 399–457, pill top 473) |
| Border / fill / radius | 1px rgb(153,140,95) / rgba(255,234,158,0.1) / 68px | same |
| Magnifier hit area | 44 x 44 | 44 x 44 |
| Placeholder = accessible name | "Tìm kiếm profile Sunner" | same |
| Focus-visible (`1440-focused.png`, `375-focused.png`) | pill outline solid 2px rgb(255,234,158); activeElement = combobox | same |
| Dropdown ("Nguyễn Văn") | listbox 381.34 wide at x 914.66, y 484, 1px rgb(153,140,95), bg rgb(0,7,12), radius 8; rows 60px | 343 wide at x 16; rows 60px |
| Covered by Highlight? | no — elementFromPoint at first-option centre = the option | no |
| Horizontal scroll | scrollWidth 1440 = clientWidth | scrollWidth 375 = clientWidth |

## Round 1 (after moving the vertical padding onto the input) — `*-profile-search-round1.png`, `evidence/round1-measure-next.log`

| Width | Pill | Input (combobox) | Overflow |
|---|---|---|---|
| 375 | 343 x 58 | 269 x 56 | 0 px |
| 1440 | 381.34 x 72 | 307.34 x 70 | 0 px |

Pill dimensions unchanged by the fix; the input now fills the pill (≥44px tap target), asserted in
`tests/e2e/sun-kudos-profile-search-keyboard.spec.ts:100` (375) and `:103-109` (1440).

## Mutation check (orchestrator)

`components/kudos/use-profile-search.ts:54` guard (`if (mine !== latest.current) return;`) commented out → rebuilt →
`npx playwright test tests/e2e/sun-kudos-profile-search.spec.ts -g "slow answer after"`: exit 1, 2 failed
(`listbox toHaveCount(0)` received 1). Guard restored, rebuilt clean. Log: `evidence/mutant-guard-removed-run.log`.
