# Visual check — Sun* Kudos Live board (phase 07 step 3)

**Status: BLOCKED for the Figma comparison. Automated measurements done; no PASS is claimed.**

## Why the design comparison did not run

- No MoMorph (`get_frame_image`) or Figma (`get_screenshot`) tool is available in this tester session, so the reference frame for `MaZUn5xHXZ` (node 2940:13431) could not be fetched.
- The repo has no reference image for this screen. `plans/momorph-specs/sun-kudos-live-board-MaZUn5xHXZ/` holds only `specs.csv` and `test-cases.csv`.
- Consequence: no section-by-section spacing, size, colour or typography match against Figma. Every value below is measured from the running build only.

To close this: re-run the comparison with the frame image (or the Figma tool) in hand, against the captures in `reports/visual/`.

## Captures (authed server 3103, fake Supabase, full page, mouse parked at 0,0)

- `reports/visual/1440-vi-full.png`, `reports/visual/1440-en-full.png`
- `reports/visual/375-vi-full.png`, `reports/visual/375-en-full.png`

Note: the sticky header appears mid-page in the full-page capture. That is a capture artifact, not a layout bug.

## Measured (all four captures, HTTP 200)

| Check | 1440 VI | 1440 EN | 375 VI | 375 EN |
|---|---|---|---|---|
| Horizontal overflow (scrollWidth vs clientWidth) | 1440 / 1440 | 1440 / 1440 | 375 / 375 | 375 / 375 |
| Keyboard focus ring (25 Tab stops) | visible on all 25 | visible on all 25 | visible on all 25 | visible on all 25 |
| Interactive elements under 44px | 52 | 52 | 50 | 50 |

Section geometry (px, y from top of page):

| Section | 1440 VI | 375 VI |
|---|---|---|
| KV | y 80, h 402 | y 172, h 359 |
| Highlight | y 546, h 823 | y 595, h 1046 |
| Spotlight | y 1625, h 548 (x 144, w 1152) | y 1882, h 420 |
| All Kudos | y 2237, h 6144 | y 2366, h 7882 |
| Stats sidebar | x 874, y 2406, w 422 | x 16, y 9296, w 343 |
| Footer | h 193 | h 361 |

Heading typography (Montserrat, colour `rgb(255,234,158)` = #FFEA9E):

| Heading | 1440 | 375 |
|---|---|---|
| H1 KV title | 36px / 700 / 44px line | 24px / 700 / 32px line |
| H2 section titles | 57px / 700 / 64px line | 36px / 700 / 40.3px line |
| H3 "10 SUNNER NHẬN QUÀ MỚI NHẤT" | 22px / 700 / 28px | 18px / 700 / 28px |

## Touch targets under 44px (project rule: min 44px on mobile)

Measured at 375 VI, which has the same set as 1440 minus layout-dependent differences:

1. **Hashtag links** `a[data-testid=kudo-hashtag]`, 19px tall (widths 86–218px). Owner: `components/kudos/kudo-hashtag-list.tsx`. Change: raise the hit area to `min-h-11` (the visible pill can stay small with padding).
2. **Spotlight nodes** `a[data-testid=spotlight-node]`, 16–29px tall. Owner: `components/kudos/spotlight-node.tsx`. Change: enlarge the invisible hit area to 44px, or document a canvas exception and get it accepted explicitly.
3. **Spotlight search** input 16–19px tall, search button 16×16. Owner: `components/kudos/spotlight-search.tsx`. Change: `min-h-11 min-w-11` on both.
4. **Header buttons** `notification-button` and `account-menu-button`, 40×40. Owner: shared header, outside the Kudos block. Change: `min-h-11 min-w-11`. Flag only; this predates the kudos change, so confirm before editing.

## Qualitative concerns from the captures (not measured, confirm at zoom)

1. **Spotlight ticker overlap** (1440 VI, lower-left of the Spotlight canvas): ticker text appears to sit over canvas names. Owner: `components/kudos/spotlight-ticker.tsx` / `spotlight-board.tsx`.
2. **Empty white square** on the last All Kudos card (1440 VI): an attachment thumbnail renders blank. Likely an image that did not load or a missing fallback. Owner: `components/kudos/kudo-image-gallery.tsx`. Check the demo image paths in fixtures.
3. **Sidebar stat rows**: `specs.csv` D.1 lists 6 rows, the build renders 5. Already logged as an open item in `reports/e2e-red-evidence.md`. Owner: `components/kudos/kudos-stats-panel.tsx`.

## Copy discrepancy (affects a test, see the e2e green evidence)

- The KV title reads "Hệ thống ghi nhận **và** cảm ơn" in code and in `tests/e2e/support/kudos-contract.ts`.
- `specs.csv` item A and `test-cases.csv` both say "Hệ thống ghi nhận **lời** cảm ơn".
- The implementer cites Figma node 2940:13439 for the new wording. I could not check that node. Needs confirmation against Figma before this stands.

## Verdict

- Overflow, focus visibility: pass on the measured captures.
- Touch targets: fail the 44px rule in the four groups above.
- Figma pixel match: not evaluated (blocked, see top).

## Fix round 1 (tester re-temper, 2026-10-15 ~12:35 ICT)

Captures: `reports/visual/{1440,375}-{vi,en}-full.png` overwritten. Feed scrolled until page height stopped growing, then walked again so lazy thumbnails loaded. Figma reference downloaded from `momorph.ai/api/images/9ypp4enmFmdK3YAFJLIu6C/2940:13431/...png` (1440x5862) and compared by eye against a 1440 VI top-section clip. Fixture data differs (names, card count, feed length), so only layout is judged.

### Checks

| # | Check | Result | Evidence |
|---|---|---|---|
| (a) | 1440: no name node over title/total, search, ticker, Pan/Zoom; no hard right edge | PASS (1440 VI and EN) | 23 nodes, 0 overlaps against 6 overlay boxes; crop shows clean space around the total, search, ticker and Pan/Zoom; right edge fades to dark, column-step max 11.7 (inside content, not at edge) |
| (a) | 375: same overlap rule | FAIL, residual | 2 nodes overlap the ticker box by 9px vertically (VI: "Phạm Thu Hà" 01:00 row, "Lý Tuấn Kiệt" 01:00 row; EN: "Phạm Thu Hà", "Lý Tuấn Kiệt"). Visible crop: ticker's top row sits against node labels. Owner: `lib/kudos/spotlight-layout.ts` (375 placement vs ticker box) |
| (b) | 1440: Highlight sender/recipient names one line | PASS | All 10 visible names: inner span 24px, 1 line, `nowrap` + ellipsis. (Outer link is `min-h-11` = 44px, so the link height is not a line count.) |
| (b) | 375: names one line | N/A | Names wrap to 1–3 lines by design (`sm:truncate` only from sm up) |
| (c) | Hashtag links at 375 | PASS | 25/25 at 44px tall (inline-block with negative margins) |
| (c) | Spotlight search input and button at 375 | PASS | input 173.7x44, button 44x44 |
| (c) | Header buttons (notification, account menu) | Not an exception at 375 | 44x44 at 375; 40x40 at 1440 (desktop, outside the 375 rule) |
| (c) | Spotlight nodes at 375 | Documented exception | 11 size groups, 16–29px tall link boxes, 23 elements. Not 44px |
| (c) | Other interactive elements under 44px at 375 | None | Full scan of a, button, input, select, textarea, role=button/link: only spotlight nodes remain |
| (d) | Last All Kudos card thumbnails render | PASS | Feed has 28 cards and 4 images at both widths and both locales; 4/4 `complete` with natural size > 0. The earlier empty square was a lazy-load timing miss, not a broken asset (`public/images/kudos/demo/kudo-photo-03.jpg` exists) |
| (e) | No horizontal scroll at 375 | PASS | scrollWidth 375 = clientWidth 375, VI and EN; same at 1440 |

### Figma comparison (qualitative, not exact)

- KV, Highlight, Spotlight and All Kudos are in the same order and column layout as the reference. Spotlight is the same 1152px card with the 388 KUDOS total at the top centre.
- Differences are fixture data: Highlight carousel has 5 slides in both (Figma 2/5, build 1/5); the All Kudos feed is longer in the build (28 cards, page ~19400px vs 5862px frame), because the feed is paginated and the Figma frame shows 4 cards; sidebar stat values differ; the gift list shows 5 rows (the `specs.csv` item already logged as open).
- No deterministic pixel metric was computed, so no "exact" claim is made.

### Verdict

- Fixed in this round and verified: (b) names, (c) hashtags and search at 375, (d) thumbnails, (e) overflow, (a) at 1440.
- Still open: (a) at 375, 2 nodes touch the ticker box by 9px. Owner `lib/kudos/spotlight-layout.ts`. Request correction or explicit acceptance.
- Documented exceptions (not 44px): Spotlight nodes at 375.

## Fix round 1 — final (tester re-temper, 2026-10-15 ~13:20 ICT)

Captures overwritten: `reports/visual/{1440,375}-{vi,en}-full.png`. Authed server on 3103 with fake Supabase (54398), feed scrolled to the bottom and walked back so lazy images loaded (all 4 runs: 28 cards, 0 broken images; the last-card thumbnail is complete at natural size in all 4. `lazyPendingBeforeCapture` was 0 at 1440 and 2 at 375 in both locales, so the 375 captures may still show 2 unloaded thumbnails. Not verified further). Servers stopped after the run.

| # | Check | Result | Evidence |
|---|---|---|---|
| (a) | No Spotlight node over total / search / ticker / Pan-Zoom at 375 | PASS | 23 nodes, 0 overlaps at 375 VI and EN; also 0 at 320 and 430 (`a11y-overlap-check.cjs`). The 9px ticker residual from the previous round is gone |
| (a) | Same rule at 1440 | PASS | 23 nodes, 0 overlaps (VI and EN); crop checked by eye, clean space around total, search, ticker, Pan-Zoom |
| (a) | Same rule at 1280 / 1024 (not required) | FAIL (out of scope widths) | Pan-Zoom button overlapped by a node at initial pan at 1280 and 1024. Owner `lib/kudos/spotlight-layout.ts`. Flag for a follow-up, not a blocker for the requested widths |
| (b) | Spotlight board renders, skeleton gone | PASS | 1440 and 375: board present, 23 nodes, 0 pulse skeleton elements left in the section |
| (c) | Filter dropdown, one Tab stop inside the open list | PASS | Departments list: 50 options, `tabindex=0` on exactly 1 option on open and after ArrowDown x2; End and Home move focus to last and first; Tab leaves the list; Escape closes and returns focus to the trigger |
| (d) | No horizontal scroll at 375 | PASS | documentElement scrollWidth 375 = clientWidth 375 in VI and EN; same at 1440 |

Figma comparison, qualitative only (no deterministic metric, so no "exact" claim): layout order and column structure match. Remaining differences are fixture data (names, card count, feed length, stat values) and the already-logged gift-list row count.

Verdict: (b), (c), (d) PASS. (a) PASS at 320, 375, 430 and 1440. Open: (a) at 1280 and 1024 (Pan-Zoom overlap), owner `lib/kudos/spotlight-layout.ts`.

## Background fix (2026-10-15)

Status: PARTIAL. E2E and capture done. MoMorph reference comparison NOT done: `figma-reference.png` could not be fetched (the `mcp__momorph__get_frame_image` tool was not available in this session). No PASS/FAIL is claimed against Figma for this round.

**E2E (`npm run test:e2e`, next build + playwright):** 94 passed, 0 failed, 0 skipped, exit 0 (3.8 min). Build clean. Log shows `getClaims failed ... Invalid JWT signature` warnings from the server; these come from the garbage-cookie and forged-session tests, not failures.

**Capture (authed server :3103, fake Supabase, NEXT_LOCALE cookie):** 1440-vi, 1440-en, 375-vi, 375-en full-page PNGs overwritten in `visual/`. All four: HTTP 200, no horizontal overflow, 0 broken images, 28 All Kudos cards, 23 Spotlight nodes, 0 Spotlight overlaps.

| Run | Doc height | KV band | Spotlight board | Stats panel |
|-----|-----------|---------|-----------------|-------------|
| 1440-vi | 19384 | y 0-480, starts at top, behind header | x144 y1600 1152x548 | x874 y2381 422x407 |
| 1440-en | 19336 | y 0-480 | same | 422x471 |
| 375-vi | 22886 | y 172-531 | x16 y1882 343x420 | x16 y21412 343x423 |
| 375-en | 22950 | y 172-531 | same | 343x487 |

Qualitative read of the 1440-vi capture (no reference, so these are observations, not comparisons):
- KV band: the gradient darkens the left column behind the title, search pill and "KUDOS" logo. Header text stays legible. The art reads through on the right.
- Spotlight board: leaves wash visible in the bottom-left, network layer visible. The first (faded) ticker line over the orange leaves has low contrast. Lines 2-4 read fine. This is a candidate contrast issue to check against the Figma overlay, not confirmed.
- Spotlight pan-zoom and search pill: clear, no overlap with nodes.

Open items for the next round:
1. Run the MoMorph comparison (sections KV, Highlight, Spotlight, All Kudos, stats, gift list, footer) once `figma-reference.png` is downloaded (node MaZUn5xHXZ, 1440x5862).
2. Confirm the Spotlight ticker contrast over the leaves wash against the Figma overlay values.

### Addendum: section-by-section comparison vs MoMorph reference (2026-10-15)

`visual/figma-reference.png` is now saved (frame MaZUn5xHXZ, 1440x5862, fetched via `get_frame_image`). This replaces open item 1 above; the status is no longer PARTIAL. Comparison done on crops of `figma-reference.png` against `1440-vi-full.png` (median-luminance numbers are reference / actual).

| Section | Result |
|---------|--------|
| KV band | Match. Band is 1440x512 from y=0 behind the translucent header (was 432px under it). Cover = Figma gradient `25deg #00101A 14.74% -> rgba(0,19,32,0) 47.8%` on a 957px box bottom-aligned to the band. Title/logo/compose row positions equal Figma (title y=184, pills y=408-480). Mean luminance left column 35.4 / 35.6, title area 94.9 / 98.2. Right/bottom-right art is ~10 brighter (72 / 82): the Figma image is also scaled 101.245% and its gradient is likely not a pure CSS 25deg; a free fit of the angle/stops reduced the error only from 10.8 to 7.9 rms, so the exact Figma values were kept. Title and logo are no longer washed out. |
| Compose + search pills | Fixed: widths now 738 / 381 with a 32px gap (were 728 / 392: flex-basis 0 plus padding), height 72 (was 73-74). |
| Highlight header/filters/cards | Match. Left carousel arrow moved to Figma x=80 (was 120, icon centre 160 vs Figma 120). Sender/recipient columns 235px hugging the card edges (centres 301.5 / 666.5 like Figma; were 314 / 654). Neighbour cards show the same dim+fade. Avatars are blank in the fake data. |
| Spotlight board | Match. Two raw art layers at Figma offsets (-64,0 / -35,-35): leaves under a 70% black wash, network with `mix-blend-mode: screen` (hard right edge at 1065px, same as Figma). The mask-image dark band is gone. Bottom-left mean luminance 42.5 / 40.9, top-left 23.1 / 29.5. Centre/right differ (14.9 / 8.8, 14.0 / 18.4) because the reference has ~85 names and the fake data has 23. Total, search pill, names and ticker paint above both layers. The faded first ticker line over the leaves is also faded in the reference (same look). |
| All Kudos cards | Match for layout, radii and colours; differences are data (text, liked state, image count). |
| Stats sidebar | Fixed: the flame now sits next to the label (x 1161-1192, value box 80px) like Figma instead of hugging the number. Panel colours/radius match. |
| Gift list | Match (title, 64px avatars, 22px names, 2px grey scrollbar). Avatars blank in fake data. |
| Footer | Not owned here (shared shell `components/site-shell/`). Figma shows one row (logo, links, copyright at right) with the active "Sun* Kudos" link highlighted; the app wraps the copyright to a second row and does not highlight it. Same for the header nav: Figma links are 16px-wide-spaced ("Award Information", 276/470/667) vs 14px ("Awards Information") in the shell. Reported to the controller. |

### Spotlight network opacity (2026-10-15)

Change under test: `components/kudos/spotlight-board-backdrop.tsx` network layer (`2940:14181`) now has `opacity-30` on top of `mix-blend-screen`, matching the ~30% Figma image fill.

- Capture: `visual/1440-spotlight-board.png` (element shot of `[data-testid="spotlight-board"]`, 1152x548, authed server, fake data with 23 names). Full page: `visual/1440-vi-full.png` (overwritten, same run).
- Figma crop: `figma-reference.png` at x=142..1299, y=1658..2206 (1158x549).
- Mean grayscale luminance (Rec.601, 0-255): Figma 24.79, ours 22.93 (gap -1.86, about 7.5%). Median 9.06 for both.
- p95: Figma 101.6, ours 72.2. p99: Figma 239.7, ours 251.0 (the white title and names, which are not the network layer).
- Qualitative (not a deterministic match, so not "exact"): network lines are faint and sit under the names; names read clearly above them, including the ticker. Data differs (Figma about 85 names, fake data 23), so the mean includes name-text density and is not a pure opacity measure. The mid-tone line brightness is a little lower than Figma, which is consistent with the lines being slightly under-lit, not over-lit. Left as-is; a tweak to `opacity-40` is the candidate if the team wants closer mid-tones. Not a discrepancy requiring correction.
