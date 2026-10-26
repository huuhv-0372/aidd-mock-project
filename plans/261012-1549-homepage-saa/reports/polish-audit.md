# Homepage SAA polish audit (Figma parity)

Date 2026-10-13 · mode polish · policy e2e-red-first (regression guard only, tests untouched) · Figma frame i87tDx10uM (node 2167:9026, 1512x4480) · fileKey 9ypp4enmFmdK3YAFJLIu6C.

## Method
- Design evidence (MCP): `get_overview`, `get_frame_node_tree`, `query_by_type` TEXT/FRAME/RECTANGLE/INSTANCE with styles (55 text, 60 frame, 31 rect, 67 instance nodes), `get_node` (Kudos logo), `get_frame_image` (reference saved as `polish-figma-frame.png`). `get_figma_image` at scale 2 for the hero background returned HTTP 500 and `get_media_file` returned 401, so no 2x re-export was possible.
- Rendering: production build, fake Supabase (127.0.0.1:54398), `next start -p 3120`, EVENT_START_AT past, AWARDS_CEREMONY_AT +2d (Coming soon visible, same state as the frame), Chromium 1512x900 DPR1, signed in. Also 1440, 768, 375.
- 78 probes (geometry, font family/size/weight/line-height/letter-spacing/colour, background, radius, borders, blend) compared against the Figma node values. Tolerance: box ±1px, typography exact, colours exact. Then a pixel pass against the frame PNG: glyph bounding boxes, and best-shift alignment per region (mean abs diff, 0..255).
- Figma node coordinates are floored integers (real values are fractional, e.g. countdown label 567.92 shows as 567), so ±1px is rounding, not a delta.
- Qualitative + numeric only; nothing here is "exact" (no zero-difference metric; text anti-aliasing differs between Figma and Chromium).

## Result summary
Typography (family, size, weight, line-height, letter-spacing, case), colours, radii, borders, shadows, blend modes, section spacing and all image crops already matched Figma: zero typography/colour deltas on 78 probes. Deltas found: 7 real (6 fixed, 1 accepted-by-brief), plus 9 not fixable or accepted. Severity: High 0, Medium 1 (hero 4.4MB image, perf), Low 15.

## Delta table (before -> after)
| # | Element | Property | Figma | Rendered before | After | Sev | Status |
|---|---|---|---|---|---|---|---|
| 1 | Hero key visual `keyvisual-bg` | file weight | n/a (1512x1392 crop) | PNG 4,474,864 B | WebP q90 314,838 B, same 1512x1392 and crop, mean abs diff vs PNG 3.4/255 (lossy noise on fine contour lines); slice 0 diff vs frame 4.80 -> 4.81 | Med | Fixed |
| 2 | ABOUT KUDOS CTA | size | 254x60 (stroke inside) | 255.3x62 (border added outside) | 255.3x60 (padding trimmed 1px/side); width 254.28 vs 254 | Low | Fixed |
| 3 | Root Further block (logo, para 1, quote) | y offset | 881 / 1047 / 1591 | +2.9 px (cascade of #2) | 881.9 / 1047.9 / 1591.9 (Figma floored) | Low | Fixed |
| 4 | RF quote box | height | 66 (glyph pitch 33) | 64, para 2 sat 2px high once #2 fixed | 66 via `pt-0.5`, para 2 y 1689.9 | Low | Fixed |
| 5 | RF quote lines | x (centre) | line1 x=514, line2 x=480 (copy has a leading space per line) | 510 / 478 | 514 / 480 via `ps-[0.26em]` (copy strings unchanged) | Low | Fixed |
| 6 | "Thời gian:" / "Địa điểm:" labels | y in 32px row | 621 (bottom-aligned, 2px up) | 619.9 (centred) | `self-end mb-0.5` -> 621.9 (Figma floor 621) | Low | Fixed |
| 7 | "Âu Cơ Art Center" | x | 511 (label->value gap 6) | 508 | gap 6 via `gap-1.5` -> ~510 | Low | Fixed |
| 8 | KUDOS logo (svg 364x74, group 364x72 at 868,3926) | y | 3926 | 3923.9, region diff 13.12 | translate 3px, region diff 0.76 (x 868 already exact) | Low | Fixed |
| 9 | Nav / footer links after "Awards Information" | x, width | "Award Information" 141 wide; Kudos x=633, footer Kudos 697 | label +6.8 wide, next items +6.4..+8.7 | unchanged | Low | Accepted (typo correction) |
| 10 | Countdown unit width (shared `components/countdown`) | width | 116 | 116.67 (175x0.6667): Minutes x +1.34, MINUTES label +1.34 | unchanged | Low | Not mine, reported |
| 11 | Digit box backdrop blur | blur | 16.64px | fixed 25px (not scaled by --s) | unchanged | Low | Not mine, reported |
| 12 | Text glyph rows (Chromium vs Figma renderer) | y | e.g. card title glyph top 2815, desc 2849, "annual awards" 2246 | ours 2813 / 2846 / 2244 although boxes match within 0.06 px (Figma draws 24/32 text 1-3 px lower; hero text 0-1) | unchanged | Low | Renderer variance, boxes exact |
| 13 | Footer copyright | y centre | box 4402..4413 (11px high, odd) | centre 1.4px lower | unchanged | Low | Figma quirk |
| 14 | Widget button | bottom | frame y 918..982, i.e. flush with a 982px viewport bottom | `bottom-6` (24px), right 19 and 106x64 exact | unchanged | Low | Ambiguous, kept for usability |
| 15 | Page height | h | 4480 | 4481 (rounding) | 4481 | Low | Within tolerance |
| 16 | RF quote text-style | font-size | node reports 20px (first run only) | 24px line 1, 20px line 2 | unchanged: glyph widths 491/557 vs Figma 491/557 confirm 24/20 | n/a | Verified, no change |

Probe false positives (my expected values or box semantics, not delta): language "VN" x (Figma 1248, ours 1248), award tile border 0.955 vs 1px (Chromium snaps), card wrapper heights (grid stretch, invisible), "Chi tiết" row width (whole card is one anchor), block-width text boxes.

## Accepted deviations (per brief, not changed)
"Awards Information" and "Coming soon" copy corrections; countdown values/state; no bell badge (Figma 8px #D4271D dot); account menu and notification panel (not in frame); hover states (frame shows hover as static: footer "Award Information" highlighted, header hover tile); award tiles 1-2 name artwork (Figma raster gap).

## Files changed (line counts)
- `components/home/hero-cta-links.tsx` 38 (padding split, bordered variant)
- `components/home/hero-event-info.tsx` 30 (label alignment, venue gap)
- `components/home/root-further-content.tsx` 54 (quote `pt-0.5`, `ps-[0.26em]`)
- `components/home/kudos-section.tsx` 66 (logo `translate-y-[3px]`)
- `components/home/home-hero.tsx` 62 (src -> `/images/home/keyvisual-bg.webp`)
- `public/images/home/keyvisual-bg.webp` added (314,838 B); `keyvisual-bg.png` deleted (no other code reference; `README.md` line 48 and `docs/codebase-summary.md` line 30 still mention the 4.4MB PNG and need a doc update, outside owned files).
No change to `home-copy.ts`, `root-further-copy.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, selectors, testids, roles or aria.

## Verification
- `npx tsc --noEmit` exit 0 · `npm run lint` exit 0 · `npm test` 133/133 (13 files) exit 0.
- redCommand `npm run test:e2e -- tests/e2e/homepage.spec.ts tests/e2e/homepage-account-menu.spec.ts`: 16/16 passed. Full `npm run test:e2e`: 31/31 passed, exit 0 (countdown 8, login 7, homepage 16).
- Region mean abs diff vs frame (before -> after): RF logo 15.86 -> 4.44, RF para 1 27.05 -> 12.72, RF quote 24.74 -> 12.40, KUDOS logo 13.12 -> 0.76, event info 18.88 -> 13.60, Kudos card 7.39 -> 6.34. CTA row 6.50 -> 9.54: the bordered button is now 60px high like Figma, but the 0.9px narrower text (Chromium vs Figma metrics) shifts its right edge by 1px, which the metric counts. Header, hero title (1.18), award tile backgrounds (1.93, shift 0,0), footer unchanged.
- No horizontal overflow at 375, 768, 1440, 1512 (scrollWidth = viewport).
- Servers started (3120, 54398) killed; ports 3100-3120 and 54398 free; no AGENTS.md; scratch scripts and extra images live in the session scratchpad only.

## Screenshots (this folder)
`polish-figma-frame.png` (reference, 1512x4480), `polish-before-1512.png`, `polish-after-1512.png`, `polish-before-375.png` (capture from the previous pass, same code at 375 as before this pass), `polish-after-375.png`, `polish-after-768.png`, `polish-after-1440.png`. Full-page captures in headless Chromium show subpixel (LCD) text fringes that Figma's export does not have.

## Open items for the orchestrator
1. Shared countdown (`components/countdown/countdown-unit.tsx`): unit width 175x s gives 116.67 vs Figma 116, and `backdrop-blur-[25px]` is not scaled (Figma 16.64 at the 0.6667 scale). Fixing affects /countdown, so left alone.
2. README line 48 and `docs/codebase-summary.md` line 30 say the hero PNG still needs compressing; now done as WebP 1x. The Cloudflare images binding note still applies to the other images.
3. 2x export of the hero background was not possible (MoMorph 500/401); the WebP is 1512 wide like the source.
4. Confirm the widget button offset if the design intends it flush to the viewport bottom.

## Addendum 2026-10-13: shared countdown aligned with the Homepage Figma (deltas 10 and 11)
User decision (clarifications.md, "after polish audit"): keep "Awards Information" / "Coming soon", keep the widget at bottom-6, align the shared countdown, with /countdown (8PJQswPZmU) unchanged.

Figma node data used:
- Homepage (2167:9035): unit = two 51.2px digit boxes + 14px gap = 116.4 (shown as 116; Minutes x = 144 + 2x(116.4+40) = 456.8, shown as 456), digit blur 16.64px, label 24/32, digit glyph 49.152px.
- Prelaunch (2268:35138): unit 175 shown, but positions imply 174.6 (= 2x76.8+21: Hours x 668 = 434+174.6+60, row 644 = 3x174.6+120), digit blur 24.96px. These are the Homepage values x 1.5.

Implementation (no Homepage numbers in the shared file):
- `components/countdown/countdown-unit.tsx`: unit width is `var(--countdown-unit-w, calc(175px*var(--s,1)))` and digit blur is `var(--countdown-digit-blur, 25px)`. Defaults equal the previous values, so /countdown renders the same at s = 0.5 / 0.75 / 1.
- `components/home/home-countdown.tsx`: wrapper sets `--countdown-unit-w: calc(174.6px*var(--s))` (two digits + gap), `--countdown-digit-blur: calc(24.96px*var(--s))`, and `--s` desktop 0.6667 -> 0.666667 (exact 2/3, so digits are 51.2 and labels exactly 24px instead of 24.0012).
- Deviation from the suggested `backdrop-blur-[calc(25px*var(--s,1))]`: scaling the shared default would change /countdown at s = 0.5 (25 -> 12.5px) and 0.75 (25 -> 18.75px), which breaks "unchanged at every breakpoint". The per-screen variable gives 16.64 on the Homepage and keeps 25px on /countdown.
- Not changed (pre-existing, outside this ask): /countdown unit is 175 while Figma's real value is 174.6 (+0.4px per unit; Figma positions 434 / 668 / 903 vs ours 433.5 / 668.5 / 903.5). Left as is to keep /countdown identical.

Homepage countdown, 1512 (before -> after; Figma real value):
| property | before | after | Figma |
|---|---|---|---|
| unit width | 116.67 | 116.39 | 116.4 (116) |
| Minutes unit x | 457.34 | 456.78 | 456.8 (456) |
| row width / gap | 430.02 / 40.002 | 429.17 / 40 | 429 / 40 |
| digit box | 51.19 x 81.92 | 51.19 x 81.91 | 51.2 x 81.92 |
| digit gap | 14.0007 | 14 | 14 |
| digit glyph size | 49.1545px | 49.152px | 49.152px |
| label size / line-height | 24.0012 / 32.0016 | 24 / 32 | 24 / 32 |
| digit backdrop-filter | blur(25px) | blur(16.64px) | blur(16.64px) |
| 768: unit / blur | 116.67 / 25px | 116.39 / 16.64px | no frame |
| 375 (s = 0.5): unit / blur | 87.5 / 25px | 87.3 / 12.48px | no frame |
Probe re-run: Minutes x delta gone; remaining countdown rows are probe artifacts (radius sits on an inner span, DAYS text 67.88 vs 69 is font metrics).

/countdown unchanged proof: `next start` with FUTURE EVENT_START_AT (port 3121), Chromium at 1512x1077, 768x1024, 375x800, before and after the edit; for DAYS / HOURS / MINUTES the unit, group and digit-box rects, the 21px digit gap (and its 15.75 / 10.5 scaled values), label rect, font size, line-height and weight, glyph size and family, backdrop-filter, border radius and width, opacity and background image, plus the row rect and column gap (60 / 45 / 30px), h1 and document size. The two JSON dumps (cd-before / cd-after, whole objects) are byte-identical: `identical = true`. Values at 1512: unit 175, digit 76.8 x 122.88, glyph 73.728px, label 36/48, row 645 at x 433.5, blur(25px), radius 12px. At 768: unit 131.25, blur(25px). At 375: unit 87.5, blur(25px).

Checks: `npx tsc --noEmit` exit 0; `npm run lint` exit 0; `npm test` 133/133 (13 files); full `npm run test:e2e` 31/31 passed, exit 0 (countdown, login, homepage, account menu). Ports 3100-3125 and 54398 free; no AGENTS.md.
