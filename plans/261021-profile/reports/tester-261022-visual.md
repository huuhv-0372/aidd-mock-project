# Tester report: Profile visual validation (1440 / 375)

Persisted by the orchestrator from the tester's hand-back. Method: Playwright against `next start -p 3103` with the fake Supabase, scrollbar hidden, pixel sampling with sharp. Screenshots are in `visual/` and crops in `visual/crops/`. Figma values come from PNG pixels (±1px).

## Matches (1440)
These match within 1px:
- Own face: hero avatar 200 at y184, name 36/44 gold, the 6×64 icon circles and their x positions, icon heading, eyebrow, KUDOS title, card bg/radius/width, card-to-eyebrow gap 120, page and card colours.
- Other face: write bar 680×72, its border/fill, the 472px label at 16px bold and the 24px pencil; bar-to-eyebrow 137/136 and bar-to-card 290; the static count at 22/28 bold, right-aligned at 1060.

## Mismatches
| # | Item | Figma | App | Owner decision |
|---|---|---|---|---|
| M1 | Hero tooltip at 375 | inside the viewport | panel x 77–381, clipped | fix |
| M2 | Edit pencil on each card (shared `KudoPostCard`, `kudo-post-card.tsx:75`) | own face none, other face present | present | keep: the board card has it and the other-face image shows it. Ask the owner. |
| M3 | End-of-feed line "Bạn đã xem hết Kudos." | not in Figma, card-to-footer 120 | 230 | keep: board behaviour, asserted by the E2E contract. Ask the owner. |
| M4 | Hero band bottom edge | fades into #00101a | hard edge at y512 | fix (shared band with the Cover gradient) |
| M5 | Dropdown trigger height | 64 | 58 | fix: `min-h-16` |
| D1 | Stats card padding | 40 (439 tall) | 24 (407 tall) | fix: additive padding option, board default unchanged |
| D2 | Footer top margin | 120 | 125 (shared `SiteFooter`) | accept (shared) |

## Shared-component notes (report only, not fixed in this plan)
- S1: header "Awards Information" vs Figma "Award Information".
- S2: footer "Tiêu chuẩn chung" bold vs regular; footer height 145 vs 142.
- S3: `KudoPostCard` sender/recipient pair centred across the card; Figma sits about 28px left.
- S4: the hearts row shows the "x2" flame when the multiplier applies; Figma has none (data-driven).
- S5: at 375 a clipped hashtag link is still focusable.

## 375
- No horizontal scroll on either face (375/375).
- No target under 44px.
- The dropdown opens cleanly.
- The write bar is 343×82.

## Round 1 re-capture (after polish-1)
- PASS: M4 own face (x1300 y500/y511 #1a201f / #141d1e vs Figma #141d20 / #0d181e; x100 y336 diff ≤3). 6deg fits better than the literal 8deg (RMS 5.55 vs 8.36).
- PASS: M1 tooltips at 375 (x 35.5–339.5) on the own and busy profiles; at 1440 the tooltip stays centred under the badge.
- PASS: M5 trigger 64px. D1 stats card 439 tall with padding 40 at 1440, 24 at 375. Board stats keeps 24.
- PASS: board band computed gradient identical to main; pixels identical to the 2026-10-15 capture. View Kudo band DOM/classes identical to main (pixel baseline predates the 80% overlay, so inconclusive by pixels).
- PASS: no horizontal scroll at 375 on own, other and busy profiles.
- NEW, owner decision: the other-face band does not match the user image (Figma darker on the left, artwork about 7px off). That frame has no MoMorph node; both faces use the same band.
