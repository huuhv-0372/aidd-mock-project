# Visual check inputs: /tieu-chuan-chung (phase 02)

Reference: `figma/standards-1161-8944-1440.png` (user 1x export, 1440x1517). Figma MCP / MoMorph image unavailable, so no
render-vs-export diff has been run yet (no dev server started in this phase; the tester compares after GREEN).
Sources: **M** = Figma get_metadata (clarifications.md), **X** = measured from the export (PNG pixels / Chromium text metrics with the app's Montserrat), **T** = reused token.

| Value | Where | Source |
|---|---|---|
| Keyvisual band 1440x512 at y=24, logo 451x200 at x=144 y=184, content block x=144 w=1152 y=504 (120px under logo) | hero, content | M |
| Cover height 627px | hero | M |
| Cover gradient: 12deg `#00101a 23.7% / rgb(0 18 29/.46) 38.34% / transparent 48.92%` (Homepage stops) + 0deg `#00101a 0 -> transparent 20%` | hero | T (home) + X (eye-matched: export art is gone by y~470, left-bottom dark). Approximation, not a Figma value |
| Artwork crop: `object-cover`, position 50% 70% (lg) | hero | X (anchor ribbons matched in a static Chromium render; export is slightly more muted than my render) |
| Below lg: band 420px from top, position 75% 70%, 50% scrim, logo 80vw | hero | derived (no mobile web frame), same idea as HomeHero |
| h2 font 45px (28 / 36 below md), line box 56px | content | X: "Tiêu chuẩn cộng đồng" at Montserrat 700 45px = 528.4px, export ink x160-684 = 524; "Tiêu chuẩn bảo mật" 469 vs ~468. Line box 56 = M |
| Body 16/24 bold, letter-spacing 0.15px | content | X: intro line 1 = 1059.0px at 0.15px, export 160-1219 = 1059 (0.5px gives 1099, 0 gives 1042) |
| List rows 30px pitch incl. wrapped line of bullet 2 -> li line-height 30px | content | X (centres 709,739,...,979; 1186,1216,1246) |
| ol text x=195 (padding-left 35), "10." sits further left = native right-aligned outside markers | content | X |
| ul text x=184 (padding-left 24); Figma shows 189 for bullet 1 / 184 for bullet 2, I used 184 for both | content | X |
| Gold intro y=592 h=47 -> 3px gap to white notice at y=643; notice -> list first row top y=694 (mt 11px on top of the 16px gap) | content | M + X |
| ol bottom space 13px so the divider lands at y=1039 (block end 1007 + 32px) | content | M (block 643+364=1007) |
| Section gap 32px; divider 1px, 1120 wide, colour `#2e3940` | content | X: pixel (46,57,64) = `--color-login-divider` exactly; extent x160-1279 |
| C: statement 24px, list mt 3px (30px rows), contact 16px under the block | content | M + X |
| Footer top 72px under the contact line at xl: `xl:-mb-[53px]` cancels most of SiteFooter's 125px top margin | content | M (footer y=1373, contact ends 1301) + footer code |
| Footer selected link: bg `rgb(255 234 158/.1)` + glow, white text | footer | X: tile pixel (25,38,39) = 10% `#ffea9e` over `#00101a`, tile x875-1060 y1417-1472; same classes as hover |
| Footer border colour | footer | X (46,57,64) = login-divider, already used |

Not verified (needs a render): exact header height vs `lg:pt-[184px]` (copied from HomeHero, which assumes an 80px sticky
header), wrap points at < xl, and the hero fade vs the export.

## Tester verification (phase 03, 2026-10-21)

Capture: guest on `next start` (port 3101, launched event), 1440 full page and 375 full page.
Files in `reports/visual/`: `standards-1440-actual.png` (1440x1566), `standards-375-actual.png` (375x2444),
`standards-375-viewport-scroll340.png`, `diff-1440-full.png`, `diff-1440-to-footer.png` (red = differing pixel).
Export: `figma/standards-1161-8944-1440.png` (1440x1517, signed-in header with bell and avatar).

Metric (Chromium canvas, summed RGB difference per pixel): 1440 full page 965,004 of 2,255,040 px differ (sizes differ).
Rows 0-1372: 874,873 px differ. Not exact, so nothing is labelled "exact". Most of the diff is the hero artwork
and the guest header, not text.

| Value | Export (1440) | Actual (guest, 1440) | Verdict |
|---|---|---|---|
| Header bottom | 80 | 80 | PASS. `lg:pt-[184px]` puts the logo at y184 with the header at 80 |
| Logo box | x144 y184 451x200 | x144 y184 451x200 | PASS |
| h2 "Tiêu chuẩn cộng đồng" box top | 520 | 520 (56px line box, 45px font) | PASS |
| h2 ink width | ~527 | box 1120 wide; ink not measured by script (Chromium text width 528.4px from the earlier check) | PASS (qualitative) |
| Intro top | 592 | 592 | PASS |
| Intro wrap | line 1 ends after "tích cực" (x1219) | line 1 ends after "cho" (x1255) | DISCREPANCY. The export box is narrower than 1120 (about 1060-1094px). Fix: cap the intro width |
| First list item centre | 709 | 709 | PASS |
| List pitch | 30 | 30 (centres 709 to 979, 10 rows) | PASS |
| Divider | y1039, w1120 | y1039, w1120, 1px | PASS |
| h2 "Tiêu chuẩn bảo mật" top | 1072 | 1072 | PASS |
| Bullet 1 text x | ~189 (eyeballed from export) | 184 | MINOR. Export shows 189 for item 1 and 184 for item 2, a Figma inconsistency. Accept, or set item 1 to 189 by hand |
| Bullet 2 wrap | 2 lines (1216/1246) | 2 lines (centres 1216 and 1246) | PASS |
| Contact centre | ~1289 | 1289 | PASS |
| Footer top border | 1373 | 1373 | PASS |
| Page height | 1517 | 1566 | DISCREPANCY, +49px. Cause below |
| Footer selected tile | ~875-1060 x 1417-1472 (eyeballed) | 883.2-1068.6 x 1418-1474 (185.4x56) | MINOR, 8px right. Follows from the footer nav gap, not this page |
| Footer selected look | bg 10% #ffea9e + glow | bg rgba(255,234,158,0.1), text-shadow 0 0 6px rgb(250,226,135), white text | PASS (qualitative) |
| Footer copyright | same row, right side (x1075-1350) | wrapped to its own row at x90 (y1502) | DISCREPANCY (cause below) |

### Root cause: footer +49px (shared SiteFooter, not this page)

`components/site-shell/site-footer.tsx:25` is the inner flex row with `gap-6` (24px) plus `xl:flex-wrap xl:justify-between`.
At xl the 24px gap also applies as a column gap. Logo block 978.6 + 24 + copyright 274.4 = 1277 > 1260 content width (1440 - 2*90),
so the copyright wraps. The homepage footer wraps the same way (measured height 193 on `/`), so this predates the standards page.
Fix (one class, shared footer, needs the footer owner's call): add `xl:gap-x-0` to line 25. That removes the wrap and the 49px;
the copyright returns to the right edge as in the export. The change also touches the homepage footer, so re-run the homepage E2E after.

### Implementer's open items

1. **Header height vs `lg:pt-[184px]`**: PASS at 1440. Header is 80px and the logo lands at y184. At 375 the header is 172px (two-row nav), so the mobile hero moves with it. No mobile reference exists to compare.
2. **Wrap points below xl**: at 1440 the intro wrap is wrong (see table). No reference below xl, so mobile wrap is qualitative only. At 375 the lists wrap cleanly and there is no horizontal scroll (scrollWidth 375).
3. **Hero fade approximation**: does NOT read the same. The export artwork is more muted; its ribbons sit higher and larger on the right (green and yellow ribbons at x1200-1440, y0-450) and the fade sits lower. The render has more orange ribbon in the centre. The export header is signed-in (bell, avatar) while the guest render shows "Đăng nhập", which shifts the header controls. Qualitative judgment only.
4. **`xl:-mb-[53px]` on the content block**: partly works. The footer top lands at 1373 as in the export, so the offset is right for the top. The footer is 193px tall instead of 144px because of the copyright wrap above. Fix the footer gap and the page height becomes 1517.
5. **Bullet indent 184 vs 189**: item 1 is 5px off the export (eyeballed). Qualitative and minor. Accept, or hand-fix.

### Extra finding: hero band paints over content

`StandardsHero` band (`components/standards/standards-hero.tsx:68`) is `h-[420px]` below lg and `lg:h-[512px]` from lg,
starting at `top-0` / `lg:top-6`. The section is only 366px tall at 375 and 504px at 1440, so the band runs past it.
Being absolutely positioned, it paints over the following non-positioned content. Measured: band bottom 592 vs section bottom 366 at 375,
and 536 vs 504 at 1440. In the 375 viewport capture (scroll 340) the h2 and gold intro are hidden under the band and the notice line
is cut off. At 1440 the top of the h2 is faded by the band. `elementFromPoint` still reports the h2 because the band has
`pointer-events-none`, so the DOM hit test does not catch it. The E2E `toBeVisible` checks pass too.
Fix: add `overflow-hidden` to the hero `<section>` (`standards-hero.tsx:65`) so the band is clipped to the section. Then re-check the 375 viewport and the 1440 h2.
Add an occlusion assertion to E2E (sample the h2 with the band's pointer-events ignored, or compare the screenshot) so this is caught.

### Tester verdict

Fixes needed before sign-off: (a) intro width at xl (wrap point); (b) hero band overflow (visible at 375 and 1440); (c) footer copyright wrap (shared SiteFooter, owner decision); (d) hero artwork crop (qualitative mismatch, implementer to re-match or accept). Items 1, 2 (mobile), 4 (top offset) and the selected-footer look pass.

## Fix round 1 (implementer, 2026-10-21)

Applied from the tester's findings. Not re-rendered by the implementer (tester reruns GREEN + visual).

| Change | Value | Source |
|---|---|---|
| Hero artwork | `/images/awards/keyvisual-bg.webp` (2880x1094 = 1440x547 at 2x), `object-cover` centred at lg (crops ~35px), `sizes="100vw"` kept; below lg position 75% 100% (as AwardsHero) | M (Figma Keyvisual = Awards band artwork) |
| Cover fade at lg | 627px from the section top (`lg:-top-6` inside the band that starts at y=24): `linear-gradient(0deg,#00101a 25%,rgb(0 19 32/0) 52.79%)` -> fully #00101a from y~470, art untouched above y~296 | derived from export (stop 52.79% / rgb(0 19 32/0) reused from AwardsHero; opaque stop 25% = y470 on a 627px box) |
| Cover below lg | `linear-gradient(0deg,#00101a 0,rgb(0 16 26/0) 45%)` plus the existing 50% scrim | derived (no mobile frame) |
| Stacking | content wrapper `relative` so it paints above the overhanging absolute band (band not clipped) | decision (Figma Cover overlaps content) |
| Intro width | gold intro `max-w-[1092px]` (Figma text box); line 1 = 1059px + " cho" ~36px = ~1095 > 1092 so "cho" wraps as in the export | M + X |
| Footer row | `xl:gap-x-0` on the inner row of SiteFooter. Logo+nav group 978.6px + copyright 274.4px = 1253px <= 1260 (1440 - 2x90), so one row at 1440. `gap-6` stays for the stacked layout. Every page renders the same footer links and VI copyright, so Home/Awards/Kudos/Standards all get one row (144px); EN copyright is shorter | reasoning from tester's measurements |
| Bullet indent | **Accepted**: export shows bullet 1 text at x~189 and bullet 2 at x~184 (Figma inconsistency); both stay at 184 | accepted |

Hero fade values above are "derived from export", not Figma values.

## Fix round 1 verification (tester, 2026-10-21)

Fixes checked: spec `pageHeading(page, name)`; hero band now `/images/awards/keyvisual-bg.webp` with re-tuned Cover;
content wrapper `relative` and intro `max-w-[1092px]`; footer inner row `xl:gap-x-0`.
Captures (guest, port 3101): `reports/visual/fr1-standards-1440-actual.png` (1440x1518), `fr1-standards-375-actual.png` (375x2444),
`fr1-375-viewport-scroll340.png`, `fr1-1440-viewport-scroll380.png`, `fr1-diff-1440-full.png`, `fr1-diff-1440-to-footer.png`.

| Check | Export | Fix round 1 render | Verdict |
|---|---|---|---|
| Intro line 1 end | after "tích cực" | after "tích cực" (line 2 starts "cho tất cả") | PASS |
| Page height | 1517 | 1518 (+1px) | PASS (1px) |
| Footer height / row | 144, one row | 144 (145 with border), one row at 1440, copyright on the right | PASS |
| h2 "Tiêu chuẩn cộng đồng" | 520 | 520, opacity 1, gold, not covered at 1440 | PASS |
| h2 at 375 (viewport capture, scroll 340) | n/a | h2 and gold intro fully readable, no band overlap | PASS |
| Hero artwork and fade | reference | Same artwork family and palette. Fade reaches dark near y~470, close to export. Ribbon composition differs: export has more green/purple ribbon at the top right (x1300-1440); render has more orange in the centre-right | CLOSER, NOT THE SAME (qualitative) |
| Pixel metric | n/a | rows 0-1372: 863,767 of 2,185,920 px differ (sizes 1517 vs 1518) | Not exact. Hero and guest header dominate |

### Footer width measurements (copyright on one row?)

| Viewport | Path / locale | Footer height | Copyright | Result |
|---|---|---|---|---|
| 1440 | /tieu-chuan-chung VI | 145 (144 + border) | 274.4px, same row | one row |
| 1440 | /tieu-chuan-chung EN | 145 | 188.5px, same row | one row |
| 1440 | / VI | 145 | 274.4px, same row | one row |
| 1440 | / EN | 145 | 188.5px, same row | one row |
| 1280 | /tieu-chuan-chung VI | 193 | 274.4px on row 2 | WRAPS |
| 1280 | /tieu-chuan-chung EN | 193 | 188.5px on row 2 | WRAPS |
| 1280 | / VI and EN | 193 | row 2 | WRAPS |

The row needs about 1253px (logo block 978.6 + copyright 274.4) plus 180px padding, so one row holds from about 1433px
viewport width. The 1440 margin is only about 7px, as the implementer said. At 1280 the copyright wraps below the logo, and the
footer is 49px taller. This was already true on the homepage before the fix, and it is not a regression of this change.
Tell the owner that a viewport below ~1433px still wraps; a wider gap or a smaller copyright would give more slack.

### Intro width note

The EN page is taller (docHeight 1536 at 1440) because the EN copy is longer. That is expected and not compared with the export.

### Verdict for fix round 1

Passed: spec green (full E2E 218/218; standards repeat 30/30, 0 flaky), intro wrap, h2 unfaded at 1440 and readable at 375,
footer one row at 1440 in all four locale/path combinations, page height within 1px.
Open: the hero composition is closer but not the same as the export (qualitative); the footer wraps below about 1433px (a known limit, not a regression).
