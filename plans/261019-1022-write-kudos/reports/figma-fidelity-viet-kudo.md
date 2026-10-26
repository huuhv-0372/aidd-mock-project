# Figma fidelity audit: Viết Kudo modal (ihQ26W78P2)

Source: MoMorph `get_node` / `query_section` on frame `ihQ26W78P2` (1440 artboard, modal `520:11647` at x357 y10, 752x1012). "px" below are Figma px; code is read at the `sm`+ (design) breakpoint. Strokes in Figma are drawn inside the box, so a "padding 24" box with a 1px border is `px-[23px]` in CSS.

## Result summary

Differing values found: 17 (font family 1, size 0, weight 0, line-height 1, letter-spacing 5, spacing/geometry 8, radius 2). Font sizes and weights were already right everywhere the frame specifies them. The user-visible errors were geometry/alignment (label column, toolbar cell width, Hashtag label alignment, link text alignment) plus the asterisk font. Details in the table.

## Table: node -> Figma -> code before -> code after

| Node | Property | Figma | Before | After |
|---|---|---|---|---|
| `520:9870` title | 32/40, 700, ls 0, center, w672 | same | same (OK) |
| `416:5534` labels (4x) | 22/28, 700, #00101A, ls 0 | same | same (OK) |
| `416:5547` asterisk | font family | Noto Sans JP | Montserrat (inherited) | `font-noto-sans-jp` (new `Noto_Sans_JP` 700 in `app/[locale]/layout.tsx`, token `--font-noto-sans-jp` in `app/globals.css`, `preload: false`) |
| `416:5547` asterisk | position | flex row, gap 2, items-center (centered on label) | inline, `ml-0.5 align-baseline` | `inline-flex items-center gap-0.5` on the label |
| `416:5547` asterisk | 16/20, 700, #CF1322 | same | same (OK) |
| `520:9872` Người nhận label box | width | 146 (input at +162) | hug 144.9 | `sm:min-w-[146px]` -> 146 |
| `1688:10436` Danh hiệu label | input offset | input at 158 from content edge (box 139 + 19) | fixed `sm:w-[146px]` -> input at 162 (4px right, 4px narrower) | `sm:min-w-[142px]` + 16 gap -> 158 |
| `1688:10447` hint | x / style | x=158 (555), 16/24 700 ls .15 #999 | x=162 | follows the input (158); style unchanged |
| `520:9891` Hashtag label | alignment | top-aligned with 48px tag row (y678-706 in 678-726) | wrapped `sm:h-12 items-center` (10px low) | wrapper removed, `sm:items-start`; `sm:min-w-[108px]` |
| `520:9897` Image label | box | 74 | hug 73.3 | `sm:min-w-[74px]` |
| `520:9873` / `1688:10437` inputs | padding | 24 from outer edge (border inside) | `px-6` + 1px border = 25 | `px-[23px]` |
| inputs placeholder | 16/24 700 ls .15 #999 | same | same (OK) |
| `520:9881-662:10647` toolbar cells | size | 56x40 | `px-4` + border = 58x40 | `px-[15px] sm:min-w-14` -> 56x40 (mobile: `min-w-11 px-2.5`, six cells fit one row at 375) |
| `3053:11619` standards cell | text alignment | centered in the 336 cell (center x 901) | `justify-end` | `justify-center`; top-right radius only at `sm`+ |
| `3053:11621` standards text | 16/24 700 ls .15 #E46060 | same | same (OK) |
| `520:9886` editor | text inset | 24 from outer edge | `px-6` + border = 25 | `px-[23px]` |
| `520:9886` editor placeholder | 16/24 700 ls .15 #999 | same | same (OK) |
| `520:9888` mention hint | 16/24 700 ls .5 #00101A center | same | same (OK) |
| `662:8911` / `662:9133` tag + image buttons | gap plus->text | 4 | `gap-2` (8) | `gap-1` |
| same | padding / width | 8 incl. border (116 wide) | `px-2` + border = 118 | `px-[7px]` |
| same | first line | 16px, line box 22 (text block 38) | `leading-5` (20) | `leading-[22px] tracking-[0.15px]`; second line 11/16 700 ls .5 #999 unchanged |
| `662:9197` thumb inner image | radius | 4 | `rounded-sm` (2) | `rounded` (4) |
| `662:9197` thumb / remove dot | 80x80, r18, border #998C5F; dot 20, #D4271D, center (+78,+2) | same | same (OK, 44px hit area kept) |
| `520:14099` anonymous row | footprint | 28 high | `min-h-11` label = 44 (16px too tall) | `-my-2` (hit area stays 44, footprint 28) |
| `520:14095` anonymous label | 22/28 700 #999 | same at sm+ | same (mobile stays 18px, no design) |
| `520:9906` Hủy | padding 16/40 incl. border -> 146 wide | `px-6 sm:px-10` + border = 148 | `px-[23px] sm:px-[39px]` |
| `520:9906/9907` footer text | Hủy 16/24 ls .15; Gửi 22/28 ls 0; gap 8; Gửi r8 | same | same (OK) |
| `520:11647` card | 752, p40, gap 32, r24, #FFF8E1 | same | same (OK) |
| `520:11646` mask | #00101A at 80% | same | same (OK) |
| dropdown rows (`p9zO-c4a4x`) | 16/24 700 ls .15 white, 40px rows | no ls, 44px rows | `tracking-[0.15px]`, `min-h-11 md:min-h-10` (hashtag, recipient, mention lists) |
| error line (no frame) | n/a | 14/20 ls .1 | ls .15 to match the field tokens; size 14 stays a guess |

## Not changed on purpose

- Editor typed text stays weight 500 (Figma only specifies the 700 placeholder; at 700 the toolbar Bold would be invisible).
- Title 24px and anonymous label 18px below `sm` (no mobile design; 32/22 do not fit 335px).
- "+ Image" is still hidden at 5 images (Figma frame shows it beside 5 thumbs; E2E ID-19 pins the hidden behaviour: owner decision).
- Gửi uses the existing disabled look until the form is valid (Figma shows only the enabled state).

## Evidence

- E2E: `npm run test:e2e -- tests/e2e/write-kudo.spec.ts tests/e2e/kudos-quick-actions.spec.ts`, exit 0, 79 passed (tester, run 2, before the last 142px tweak).
- Screenshots: `plans/261019-1022-write-kudos/reports/visual/fidelity/` (`figma-ihQ26W78P2-1440.png` reference; `actual-1440-{default,filled,images}.png`, `actual-375-{default,filled}.png`). The `images` state is the one comparable with the Figma frame (dialog 752x1012, same as Figma).
- Measurements (tester, getBoundingClientRect, dialog-relative, images state): labels 146/139/108/74, recipient input x202 w510, toolbar cells 56x40 pitch 56, link cell x376 w336 text center 544, editor wrapper bottom radius 8, Hủy 146x60, Gửi 502x60, rhythm 40/152/376/852/912, dialog 1012. Only Danh hiệu input x was off (195 vs 198), fixed afterwards with `min-w-[142px]` (not re-measured).
