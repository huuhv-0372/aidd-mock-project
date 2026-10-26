# Visual diff: Homepage SAA vs MoMorph frame (i87tDx10uM, node 2167:9026)

Date: 2026-10-12 · Method: **qualitative** (side-by-side crops; no pixel-diff metric computed, so nothing here is "exact").
Reference: frame PNG 1512x4480 (momorph.ai/api/images/.../2167:9026). Desktop only — no mobile frame exists, so 375 is judged against layout rules (2-col grid, 44px targets), not a design.
Captured state: signed in (fake Supabase), `EVENT_START_AT` past = launched state; pointer parked at bottom-left, focus blurred. Frame shows the PRE-event state ("Comming soon", digits 20/20/20), so countdown content differs by design (clarifications Q1).

Screenshots (this folder): `homepage-1512-full.png` (frame width), `homepage-1440-full.png`, `homepage-375-full.png`, `homepage-1440-hover-nav.png`, `homepage-1440-hover-cta.png`, `homepage-1440-hover-card.png`.
Page height: ours 4401 px @1512 vs frame 4480 (-79 px: ~49 px from the hidden "Coming soon" row (state), ~30 px from the Root Further text column below).

## High
- None.

## Medium
- **Root Further body text column too wide** (mm:2167:9032 area). Frame text block x = 180..1332 (≈1152 px, 1512 frame); ours x = 144..1368 (≈1224 px). Result: fewer wrapped lines, block ~40 px shorter, line breaks differ from Figma throughout both paragraphs.
- **Root Further quote sizes smaller.** Frame quote "A tree with deep roots fears no storm" ≈24 px and subline ≈20 px; ours visibly smaller (≈20 px / ≈16 px). Verify against node font sizes.

## Low
- KUDOS logo block sits ≈20 px right of Figma (frame mark starts x≈868, ours x≈888 at 1512).
- Header/footer nav spacing shifts a few px because the label is "Awards Information" (accepted typo correction vs Figma "Award Information").
- Bell has no red badge (Figma shows one) — accepted by clarification (ID-29, no notifications).
- Figma footer shows "Award Information" in the highlighted (hover/active) style; ours renders it normal at rest. Our hover style (tinted bg + glow, see hover-nav.png) matches that Figma treatment, so this is the frame illustrating a state, not a rest-state delta.
- Frame award tiles 1-2 render without the name artwork (Figma raster artifact); ours shows TOP TALENT / TOP PROJECT names, consistent with tiles 3-6.
- 375: fixed widget button sits beside "ABOUT KUDOS" in the first viewport (does not cover it; x 240..328 vs CTA 46..224). Fixed by design; no mobile frame to compare.

## Matches (qualitative)
Header (translucent bar, active "About SAA 2025" underline+glow, VN selector, account button), hero title/key visual position (title top 184 vs ≈185), countdown tiles + labels, event info strings and colours, CTA buttons, "Sun* annual awards 2025" + "Hệ thống giải thưởng", 3x2 award grid with titles/descriptions/"Chi tiết", Sun* Kudos card copy and button, footer layout and copyright "Bản quyền thuộc về Sun* © 2025". 375: header wraps to 2 rows, nav centred, 2-column award grid, footer stacked.

## Hover states (ID-23, 46, 51)
Captured at 1440: nav (bg tint + text glow), ABOUT AWARDS CTA, award card (lift + glow). E2E hover fingerprint tests passed 2/2 repeats — kept as E2E, not demoted.

## Capture notes
- Full-page captures show a ≈40 px dark band above the sticky header — a Playwright fullPage artifact; a viewport capture at 1512 shows the header at y=0 matching the frame (elementFromPoint(700,20) = nav link, header top 0).
