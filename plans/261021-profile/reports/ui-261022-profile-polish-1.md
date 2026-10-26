# UI polish round 1: Profile (mode polish, e2e-red-first, GREEN stays with the controller)

Checks run: `npx tsc --noEmit -p .` exit 0; `npx eslint` on all touched files exit 0, no warnings. No `next build`, no E2E, no servers (as dispatched). The E2E files were not touched. Nothing in `tests/e2e/profile.spec.ts` or `support/profile-contract.ts` asserts a tooltip position, a class name, a trigger height or the card padding (grep), and no testid, role or copy changed.

## 1. DRY (review Medium) + M4 (hero band hard edge)
- New `components/kudos/kudos-kv-backdrop.tsx` (49 lines): `KudosKvBackdrop({ cover = "board", dimmed = false, preload = false })` and `KUDOS_PAGE_ALERT_CARD`. It renders exactly the markup that was copied three times (wrapper `absolute inset-x-0 top-0 -z-10 h-[432px] lg:h-[512px]`, `kv-bg.webp` with `sizes="100vw"` and `object-[75%_50%] lg:object-center`, the 957px Cover div, optional 80% overlay).
- Used in `kudos-kv-banner.tsx` (`<KudosKvBackdrop preload />`, 37 lines), `kudo-detail-layout.tsx` (`<KudosKvBackdrop dimmed />`, 44 lines), `profile-page-layout.tsx` (`<KudosKvBackdrop cover="profile" preload />`, 47 lines). The two `ALERT_CARD` copies are gone; both layouts import `KUDOS_PAGE_ALERT_CARD`. The unused `next/image` import is removed from the detail and profile layouts.
- Board and View Kudo stay identical: the default `cover="board"` keeps the same class string (`linear-gradient(25deg,#00101a_14.74%,rgb(0_19_32/0)_47.8%)`). The DOM is the same node for node. The board still preloads, View Kudo still does not (`preload={false}` is the `next/image` default), and `dimmed` renders the same overlay div after the gradient.
- M4, cause: the profile Figma does not use the board gradient. MoMorph node `1210:12612` (Cover of 362:5037) says `linear-gradient(8deg, #00101A 8.6%, rgba(0,19,32,0) 37.25%)`, 1440x957, and its `startY 445` is really y = -445, bottom edge on the band's bottom (the same geometry the board uses). Only the angle and stops differ. That is why the app had #69512e at y511 and a hard edge.
- M4, fix: `cover="profile"` uses `linear-gradient(6deg, #00101a 8.6%, transparent 37.25%)`. I chose 6deg over the stated 8deg because I fitted both against the 1440 export (composite of `kv-bg.webp` plus gradient vs Figma pixels, x outside 360-1080, y 120-511):

  | gradient | RMS error |
  |---|---|
  | board 25deg (before) | 29.7 |
  | 8deg (MoMorph CSS) | 7.8 |
  | 6deg | 5.0 |

  At x=1300: y500 gives #1a201f (Figma #141d20), y511 gives #141c1e (Figma #0d181e); 8deg would give #262721 at y511. Image alignment was checked too (shift 0, scale 1.00 vs Figma), so the residual is the gradient only. If you prefer the literal CSS, change one number (`6deg` to `8deg`) in `COVER.profile`.
- The tester should recheck: x=1300 y500 and y511, plus the x=100 side (the profile gradient is lighter on the left than the board's: Figma at x=100,y336 is about 70% dark, the board gradient gives 100%).

## 2. M1 hero badge tooltip at 375
- `components/kudos/kudo-person.tsx` (172 lines, additive): `TipAlign` gains `"page"`, plus a `TIP_ANCHOR` map. `start`/`end` keep `left-0`/`right-0` on a `relative` wrapper, so board cards are unchanged. `page` is `left-1/2 -translate-x-1/2` and the badge wrapper is `max-md:static md:relative`. Below md the panel therefore centres on the nearest positioned ancestor. `HeroTitle` and `Stars` are exported with the wider `TipAlign` (they already were exported by the earlier profile work).
- `profile-hero.tsx`: the badge uses `align="page"`; the info column (`flex w-full flex-col items-center gap-2`) gets `relative`. At 375 the column is 343 wide at x 16-359 and the panel is 304 wide (`min(304px, 100vw-4rem)`), so it spans about x 35-339. From md it is centred under the badge as before.
- Caveat: below md the panel hangs from the bottom of the info column. If the stars wrap onto a second row under the badge, the panel sits below that second row instead of directly under the badge. At 375 the badge, dot and stars fit one row for the tester's data, so not visible there.

## 3. M5 direction trigger height
- `profile-direction-dropdown.tsx`: trigger `min-h-14` to `min-h-16` (64 tall; was 58). Width unchanged (text-driven). Option rows keep `min-h-14`.

## 4. D1 stats card padding
- `kudos-stats-panel.tsx` (100 lines): optional `spacious` prop, default false. The default class string is byte-identical to before (`p-6`, no trailing space); `spacious` appends `md:p-10`.
- `profile-view.tsx` passes `spacious`. Decision: 24 on phones, 40 from md. At 375 the card is 343 wide, so 40 would leave 263px for a label plus a 32px value plus the x2 flame; 24 keeps the board's phone layout. Figma is 1440 only, and from md the card is 40 / 439 tall.

## Files (lines after change)
- New: `components/kudos/kudos-kv-backdrop.tsx` 49
- Changed: `components/kudos/kudos-kv-banner.tsx` 37, `components/kudos/kudo-detail-layout.tsx` 44, `components/kudos/kudos-stats-panel.tsx` 100, `components/kudos/kudo-person.tsx` 172, `components/profile/profile-page-layout.tsx` 47, `components/profile/profile-hero.tsx` 52, `components/profile/profile-view.tsx` 77, `components/profile/profile-direction-dropdown.tsx` 134
- Not touched: edit pencil, end-of-feed line, S1-S5, header/footer, tests.
