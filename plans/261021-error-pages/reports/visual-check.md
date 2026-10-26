# Visual check: error pages 404 + 403 (phase 02a)

Sources: reference screenshots `figma/error-404-1378-5063.png`, `figma/error-403-2182-9291.png` (1438x917, 1x); assets in `public/images/errors/`.
Figma MCP and MoMorph exports were unavailable, so every value below is measured from those PNGs with `sharp` (scripts in the session scratchpad). Nothing was run through `next build`/E2E (another agent edits next.config/app routes); the layout was rendered from a static HTML replica of the component's exact Tailwind classes in headless Chromium with the real Montserrat woff2 and the real assets.

## Background (error-bg)

| Finding | Value | Source |
|---------|-------|--------|
| `error-bg.png` has a constant alpha (1,314,980 of 1,318,646 px = 25/255 = 0.098; 1 transparent column at x=1437) | the "dark overlay" is already inside the export: artwork at 10% opacity over the page colour | `sharp` raw RGBA read of error-bg.png |
| Model `out = a*src + (1-a)*C`, a = 25/255, C = #00101A vs screenshot (bg-only strips y<100 and y>830, both screens) | MAE 1.52/255 (C=#00101A); MAE 0.45 with C=#01121C (fitted C = 1.0,17.7,27.9) | 12 sampled points + full strips |
| Equivalent overlay form | artwork opaque + #00101A overlay at alpha 0.90 (art weight 0.10) | algebra of the model above |
| Implementation | NO extra overlay element: `<main class="bg-login-bg">` (#00101A) + `error-bg.webp` (alpha kept) `fixed inset-0 -z-10 object-cover`. Colour delta to Figma (~1.5 levels) is the screenshot's colour profile; the project token #00101A is kept. | |
| Convert | `error-bg.png` 1,763,830 B -> `error-bg.webp` 210,662 B (sharp, quality 82, alphaQuality 100). PNG deleted (re-export from Figma if ever needed). | |

## Typography (Montserrat, project font, 700)

| Element | Target ink (screenshot) | Result with chosen CSS | Chosen CSS |
|---------|--------------------------|------------------------|------------|
| 404 title "NOT FOUND" | x 541..898 (w 358), baseline y 179 | x 541..898 (w 358) | 57px / 62px line, bold, tracking -0.25px, white, centred |
| 403 title "Access Denied" | x 502..931 (w 430), baseline y 179 | x 502..931 (w 430) | same |
| Description line 1 "The resource you’re looking for doesn’t exist" | x 441..997 (w 557) | x 440..996 (w 557) | 24px / 33.6px line (1.4), bold, white, max-w 580px, centred |
| Description baselines | 758 and 791 (spacing ~33) | 758 / 791 | |

57px matches Material Display Large (57/64/-0.25); 24px matches Headline Small (24/32); the measured widths agree to 1px with those values (font-size sweep 22..25 / 55..58 with letter-spacing 0, -0.25, -0.5). Ink tops differ by 1-2px (this Montserrat build has slightly taller ascenders).

## Layout (1438x917, desktop)

| Item | Target | Measured/derived | Source |
|------|--------|------------------|--------|
| Illustration frame 702x545 | x 368..1070 (centre 719 = 1438/2), y ~189..734 | box x 368, y 190 | alpha bbox of assets (robot 0..662 x 63..496; monitor 140..567 x 70..497) matched to screenshot ink (404: x 368..1030, y 255..684; 403: x 508..935, hair top y ~260, base 686) |
| Title box | cap/baseline 179 | y 128..190 | |
| Gaps title -> illustration -> description | 0 (assets carry their own transparent margin) | description box starts 2px under the illustration bottom (`md:-mt-0.5`) | |
| Home button | NOT in Figma (kept on request) | 32px under the description, 165x48, y 832..880 at 917px tall | assumption |
| Vertical centring | title at ~125 | `lg:pt-[115px] lg:pb-6` centres title+illustration+description+button as one group so the title lands at y 128 (917px) / 119 (900px) | |

Full-frame comparison at 1438x917, rows y<822 (above the added button): MAE 2.97/255 (404), 2.99/255 (403); 0.6% of channel samples differ by more than 40 levels (anti-aliasing of text, ink tops). Whole-frame MAE incl. button 3.95/3.97.

## Responsive

- 375x812, 404 EN/403: scrollWidth 375 = clientWidth 375 (no horizontal scroll); 404 VI at 375x812: scrollHeight 812. Illustration scales to w 343 (`w-full max-w-[702px] h-auto`, `sizes` "(min-width: 750px) 702px, calc(100vw - 2rem)").
- Below `md` the title is 36px and description 18px (design values only apply from 768px).
- 404 VI title uppercase renders "KHÔNG TÌM THẤY TRANG" 752px wide at 1438 (one line), wraps to 2 lines under ~830px viewport (expected).

## Checks run

- `npx tsc --noEmit`: exit 0. `npx eslint components/errors components/not-found messages` and `npm run lint`: exit 0.
- Not run (by instruction): `npm run build`, E2E, visual capture against the live app (tester owns GREEN + final screenshot comparison).

## Tester verification (phase 03, live app, 2026-10-21 11:18)

Captures: `reports/visual/{404-signedin|403-guest}-{vi|en}-{1438x917|1440x900|375x812}.png` (12 files), taken from `next start` on 3103 (signed-in unknown path) and 3101 (guest /403) built from the same code as the E2E run. Each capture waited for hydration and the error-bg image, then moved the pointer to (0,0) before the screenshot. Measurements: DOM rects plus PNG ink bounds (lum > 200).

| Check (1438x917, EN) | Figma | Live | Result |
|----------------------|-------|------|--------|
| 404 title ink width / baseline | 358 / 179 | 358 / 179 (x 541..898) | match |
| 403 title ink width / baseline | 430 / 179 | 430 / 178 (x 502..931) | match, 1 px baseline |
| Illustration box | 702x545, x 368, y ~190 | 702x545, x 368, y 189.9 | match |
| 404 description ink line 1 | x 441..997 (w 557) | x 440..996 (w 557) | match within 1 px |
| 403 description | Figma copies the 404 sentence | "You don't have permission..." (clarifications.md, intended) | expected deviation |
| Button | not in Figma | y 832..880, 164.8x48, x centre 719 | no overlap with description (desc bottom 800) |

Pixel comparison against the Figma PNGs (1438x917, sRGB, no alpha, no size mismatch):

| Pair | Full frame MAE | Without button rect | Share of channel samples off by more than 40 (full) |
|------|----------------|---------------------|------------------------------------------------------|
| 404 EN vs 1378:5063 | 4.09 | 3.05 | 1.10 % (text anti-aliasing and 1 px ink offsets) |
| 403 EN vs 2182:9291 | 4.65 | 3.61 | 1.37 % (includes the intentional description change) |

Not zero, so no "exact" claim. Background: mean RGB of the top-left 60x60 block is (4.1, 20.8, 29.7) live vs (5.5, 23.5, 32.5) in Figma, about 2.7 levels darker. Band MAE over y < 100 is 2.27 with 0 % of samples over 40. Qualitative: slightly darker, consistent with the 1.5-level delta recorded above.

Layout discrepancies (listed, not accepted):
- Group is not vertically centred: title top 128 px, button bottom 880 px at 917 px tall (bottom margin 37 px). Horizontal centring is correct (button centre 719 = 1438/2). The title position follows Figma; the added button pushes the group down. Needs an explicit decision.
- 1440x900: every element sits 8.6 px higher than at 917 px (lg:pt-[115px] centring). Expected.
- 375x812 (4 captures, VI and EN, both pages): scrollWidth 375 = clientWidth 375, title 36 px, description 18 px, button 48 px tall with no overlap. Cosmetic: the VI title wraps to leave "chối" alone on line 2, and the VI description leaves "này." alone on line 2. No Figma reference exists for mobile.
- VI 404 title renders uppercase by CSS ("KHÔNG TÌM THẤY TRANG" one line at 1438, two lines at 375); the DOM text stays "Không tìm thấy trang".

Verdict for the screenshots: layout and type match Figma at the measured points. Background tone and vertical centring are the open items. No colour is exact; the pixel metrics above are the evidence.
