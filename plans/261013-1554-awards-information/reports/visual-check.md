# Visual check: /awards-information vs Figma (zFYDgyj_pD) + Homepage regression

Method: temporary Playwright capture spec (signed in on the authed server), run once, then deleted. No app code or existing tests were changed. No deterministic pixel diff was run, so every comparison below is qualitative. Nothing is labelled "exact".

## Screenshots (plans/261013-1554-awards-information/reports/visual/)

| File | What it shows |
|---|---|
| awards-1440-full.png | Full page, 1440x900 |
| awards-1440-nav-hover.png | ID-10 hover on the 2nd nav item (Top Project), nav clip |
| awards-1440-scrolled.png | After clicking Best Manager: sticky header, sticky left nav, active item |
| awards-375-full.png | Full page, 375x812 |
| awards-375-scrolled.png | 375 viewport after scrollY=1500 |
| home-1440-top.png | Homepage signed in, 1440 |
| home-375-top.png | Homepage signed in, 375 |
| notfound-1440.png | /sun-kudos 404 |

Figma references: annotated frame (tool-results mcp-momorph-blob-…-05bbn0.png), clean frame.png, hero-crop.png (1440x547).

## Matches (no action)

- Section order D.1 to D.6 plus the Kudos block (D1) at the bottom, as in Figma.
- Image side alternates as in Figma: Top Talent left, Top Project right, Top Project Leader left, Best Manager right, Signature left, MVP right.
- Left nav C.1 to C.6 sits in the 1440 left column, as in Figma.
- Card image is about 336px square at 1440 (measured 960 to 1296 in the screenshot).
- Card titles are gold. Quantity, prize and unit copy match the clarifications.
- Active nav item is gold with an underline at 1440 (awards-1440-scrolled.png).
- ID-10 hover shows a dark filled box behind the nav item (awards-1440-nav-hover.png).
- Kudos block has a text column on the left, a "Chi tiết" button, and the KUDOS artwork on the right, as in Figma.
- Hero title "Hệ thống giải thưởng SAA 2025" is gold, with "ROOT FURTHER" at top left, as in Figma.
- 404 page is SAA-styled with Vietnamese copy and a "Về trang chủ" button (notfound-1440.png), as the clarifications require.
- Homepage at 1440 (home-1440-top.png): header, hero, countdown, footer and widget button all render. Nothing visibly broke in the shell move.

## Mismatches

| # | Severity | Where | Observation | Likely file |
|---|---|---|---|---|
| 1 | material (known open item) | Hero keyvisual | Palette and ribbon motif match. Composition does not. Figma's ribbons sweep across the lower band and frame the title. Ours fill the right half and sit behind the title. Figma's hero is shorter and more banded. This is a qualitative judgment only. | hero component in components/awards/awards-hero.tsx and its background asset |
| 2 | minor | Hero subtitle | Figma has a thin full-width rule under "Sun* Annual Awards 2025". Not seen in our capture. | components/awards/awards-hero.tsx |
| 3 | minor (needs explicit acceptance) | Mobile sticky bar (below lg) | Clarification A3 says the chip bar is sticky "under the header". In code, the header is sticky only from lg (site-header.tsx L21 `lg:sticky`). Below lg the header scrolls away and the chip bar docks to the viewport top. awards-375-scrolled.png confirms there is no header above the bar. | components/site-shell/site-header.tsx, components/awards/awards-nav.tsx (L31, `lg:top-28`) |
| 4 | minor (baseline unverified) | Homepage header at 375 | The nav wraps to two rows: "About SAA 2025 / Awards Information" then "Sun* Kudos" on its own line (home-375-top.png). The header markup is said to be unchanged. Confirm against the pre-move build before accepting. | components/site-shell/site-header.tsx, components/site-shell/site-header.tsx nav |
| 5 | minor (unverified) | Kudos block at 375 | awards-375-full.png shows the Kudos text and button, but I could not see the KUDOS artwork. It may be hidden below md or be too small to read at this scale. | components/awards/award-content.tsx or the kudos block component |
| 6 | minor (unverified) | 1440 header edge | awards-1440-scrolled.png shows a faint horizontal line at the header's lower edge, between the logo and the controls. Possibly a backdrop or border artifact. | components/site-shell/site-header.tsx |

## Not mismatches (checked and dismissed)

- At 375, the scrolled state shows "Top Talent" active while the Top Talent prize is still in view. This is correct scroll-spy behaviour, not a bug.
- The 404 page has no site header or footer. The clarifications ask for a simple SAA-styled page, so this is intended.

## Open items

- Item 1 needs either an asset decision or explicit acceptance of the approximation.
- Item 3 needs either a code change (dock the bar under the header below lg) or explicit acceptance of the current behaviour.
- Item 4 needs a comparison against the pre-move Homepage build.
- Items 2, 5 and 6 need a closer look at full resolution if you want them resolved.

**Status:** DONE_WITH_CONCERNS

## Follow-up 2026-10-14

- Hero keyvisual (item 1) FIXED: exact Figma render of mm:2167:5138 exported via Figma MCP `download_assets` at 2x (MoMorph `get_figma_image` still 500) → `public/images/awards/keyvisual-bg.webp` 2880x1094. `components/awards/awards-hero.tsx`: `object-cover object-[75%_100%] lg:object-center`.
  - 1440: hero box x0 y80 1440x547 (= Figma node). Pixel diff vs Figma frame crop (scratch hero-crop.png): mean abs 4.69/255, 0.54% pixels >40 (old approximation: 19.00, 16.14%). Qualitative + metric, not exact.
  - 768 / 375: ribbons kept behind logo/title (no Figma frame below lg). Screenshots: reports/visual/hero/hero-{1440,768,375}.png.
- Item 3 (mobile chip bar docks at viewport top): ACCEPTED by user 2026-10-14.
- Item 4 (Homepage header wraps at 375): PRE-EXISTING — identical to 1512219 (0-pixel diff, identical banner HTML, guest + signed-in). See reports/header-375-compare.md.
- Gates after the hero change: lint 0, tsc 0, vitest 153/153, `npm run test:e2e` 59/59 (build included).
