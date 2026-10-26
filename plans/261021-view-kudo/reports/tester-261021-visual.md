# Tester report: View Kudo visual validation (Phase 03)

Target: `/sun-kudos/{id}` (fixture `c1000000-0000-0000-0000-0000000000d1`), Figma 520:18779.
Build: existing `.next` (not rebuilt). Server: `next start -p 3103` with the authed env from `playwright.config.ts`, fake Supabase on 54398.
Scope: read-only on app code. No test or app file edited. Servers stopped; ports 3100-3104 and 54398 verified free.

## Screenshots (plans/261021-view-kudo/reports/visual/)

| File | What |
|---|---|
| detail-1440-full.png | 1440 full page, fixture copy |
| detail-1440-frame.png | `[data-testid=kudo-detail]` alone, fixture copy |
| detail-1440-overlay-full.png / -overlay-frame.png | 1440, Figma sample copy swapped into the DOM (names, title, content, hashtags, count, 5 thumbs). Measurement only |
| detail-375-full.png, detail-768-full.png, detail-1280-full.png | Full pages, fixture copy |
| detail-1440-liked-frame.png | Liked kudo (red heart) |
| detail-1440-close-focus-frame.png | Keyboard focus on Đóng |
| board-card-default.png, board-card-focus-content.png, board-card-hover-content.png | All Kudos card: default, keyboard focus, hover |
| board-focus-ring-clip2.png | Focus ring on the card content link |
| crop-*.png | 2x crops used for the bottom row, content, and mobile review |
| measure-1440/mobile/tablet/laptop.json | Raw DOM rects and computed styles |

Method: DOM measurement via getBoundingClientRect/getComputedStyle; pixel scans with sharp against the two reference PNGs (frame ref is 680x1365, page ref 1440x1521). The actual frame top is 80 in the DOM and the reference frame top is 79 in pixels; the table uses the pixel values.
Overlay caveat: the "overlay" captures replace text and clone nodes in the DOM. This is for like-for-like geometry only. The 5-thumbnail row and the 6-hashtag row do not exist in any fixture (max 1 image on feed, 3 on detail, 2 hashtags on detail), so they were produced by cloning.

## 1440 comparison

Δ = actual − reference. Verdict: match = |Δ| ≤ 2px; minor = 3-4px or cosmetic; mismatch = larger, or wrong colour/weight/style.

| Element | Reference | Actual | Δ | Verdict |
|---|---|---|---|---|
| Frame x / width | 380 / 680 (x 380–1059) | 380 / 680 | 0 | match |
| Frame top (pixel) | y 79 (header ends 79) | y 80 | +1 | match |
| Frame height | 1365 | 1367 | +2 | match (cause: content box, see below) |
| Frame bottom (page) | y 1443 | y 1446 | +3 | minor (follows the content box) |
| Frame radius | corner row 0 at x 403 | x 404 (24px) | +1 | match |
| Frame background | #FFF8E1 (255,248,225) | #FFF8E1 | 0 | match |
| Top padding / top divider | divider y 40, #FFEA9E | y 40, #FFEA9E | 0 | match |
| Sender avatar | 64px, y 57–120, x 126–189 | 64px, bottom 120, x 126–189 | 0 | match (ours is an empty grey placeholder; fixture has no avatar_url) |
| Send icon | glyph 25x21, x 328–352, y 79–99 | box x 324–356, y 73–105 (centre 340,89) | ~0 | match (pixel scan contaminated; visual crop agrees) |
| Names (16px bold) | band y 140–155, x 52–636 | band y 139–153, x 53–636 | −1 | match |
| Dept + "New Hero" badge | badge band y 160–179 | badge y 160.5–179.5 | ~0 | match |
| Time | band y 201–214 | band y 200–214 | −1 | match |
| Title (16px bold, centred) | band y 238–253, x 218–461 (w 243) | y 238–252, x 218–461 (w 243) | 0 | match |
| Content box top border | y 276, #FFEA9E | y 276 | 0 | match |
| Content box fill | #FFF2C6 | #FFF3C6 | ~0 | match |
| Content box bottom border | y 1107 | y 1109 | +2 | match, but see padding row |
| Content box vertical padding | ~15px (glyph top 297 with border at 276) | 16px (glyph top 299) | ~+1 to +2 | minor: inferred ref padding 15px, ours `py-4` |
| Content text size / line pitch | 20px, pitch 32.0 (297→1001 over 22 lines) | 20px, pitch 32 | 0 | match |
| Content text edges | x 65–614 justified | x 66–613 | 0 | match |
| Content text colour | core (0,16,26) | (0,16,26) | 0 | match |
| Content text weight | core-dark px 73,896; ink mean 58.3 | core-dark px 60,474; ink mean 50.2 | +22% ink | mismatch (probable): ref looks ExtraBold 800; ours 700. Title/names differ by only 2–4%, so this is not a renderer difference. Figma spec not confirmed (MCP out of quota) |
| Thumbnails size / gap | 88px, pitch 104 (16px gap) | 88px, pitch 104 | 0 | match |
| Thumbnails top | y 1124 | y 1126 | +2 | match (follows content box) |
| Thumbnail border / radius | 1px #FFEA9E, radius ~4px (corner inset 2,1,0,0) | outer 1px rgb(153,140,95), radius 18px (inset 13,10,8,7,6,5) | colour + radius | mismatch (visible) |
| Hashtag row | 6 tags on one line, right edge x 1011 | 6 tags overflow the 600px row; last tag truncated with "…" | — | mismatch (P1, content hidden) |
| Hashtag gap | ~4–5px (plain space) | 8px (`mr-2`) | +3 to +4 per gap | mismatch (minor) |
| Hashtag font / width | "#Dedicated" 103px, 16px bold red | 103px, 16px bold rgb(212,39,29) | 0 | match |
| Hashtag band y | 1233–1248 | 1234–1249 | +1 | match |
| Bottom divider | y 1268 | y 1270 | +2 | match (follows content box) |
| Count "10" | x 420, band y 1301–1324 (row) | same x; row +2 | +2 | match |
| Heart icon | x ~457, red (212,39,29) | x ~453, grey (liked = false in fixture) | −4 x; state | minor. Red = liked token, which matches exactly. Ref shows liked state |
| Copy Link (text + icon) | text x ~425, icon x ~896–915 | same | ~0 | match |
| Đóng | text right edge ~1004 | 1004 | ~0 | match |
| Bottom row height | 56 (approx) | 56 (min-h-14) | — | match |
| Page base (below art) | (0,16,26) | (0,16,26) | 0 | match |
| Top art, left margin (y 90–370) | mean (2,21,32) | mean (18,28,30) | R +16, G +7, B −2 | known deviation (reference circuit art vs reused KV art) |
| Header band (y 0–78) | mean (5,20,28) | mean (22,26,29) | R +17 | known deviation (art behind header) |

## Other viewports (fixture copy)

| Viewport | Horizontal scroll | Frame | Result |
|---|---|---|---|
| 375x812 | none (docSW 375) | x 16, w 343 (16px gutters), y 188 | Pass with one defect (below) |
| 768x1024 | none (docSW 768) | x 44, w 680, y 140 (header wraps 2 rows) | Pass |
| 1280x800 | none (docSW 1280) | x 300, w 680, y 80 | Pass |

Touch targets at 375 (all ≥ 44px): sender/recipient link 48px tall, heart button 44px, hashtags 44px, Copy Link 56px, Đóng 56px, thumbnails 88px.
Clipping/overlap at 375: names wrap to two lines, and the dept row (y 336) overlaps the second name line (name box ends y 344). Visible as cramped text in detail-375-full.png. Cause: `-my-2.5` on the name link.
Header: all viewports OK, no overlap with the frame.

## All Kudos card (/sun-kudos, 1440)

The content box is now a link. Computed style of the link:

- display block; background rgba(255,234,158,0.4); border 1px #FFEA9E; radius 12px; padding 16px 24px: identical to the old div classes.
- text-decoration none; the `<p>` keeps colour rgb(0,16,26), 20px/32px, weight 700, 5-line clamp. No underline and no colour change.
- Keyboard focus-visible: solid 2px rgb(78,73,55), offset 2px. Visible in board-focus-ring-clip2.png.
- Hover: background goes from 0.4 to 0.6 alpha with a 200ms colour transition (motion-safe). This is a new affordance, not in the old card. Judged acceptable per the brief.
- Visual parity with the old card: class-level identical. No pre-change screenshot exists, so the comparison is by computed style, not by pixel.

## Prioritized fixes (controller routes)

P1
1. Hashtags truncate at six tags (ref shows six on one line). `components/kudos/kudo-hashtag-list.tsx:28`: the `truncate` row clips the tail with "…". On the detail frame, let the row wrap (drop `truncate`, add `flex flex-wrap`). Shared with the feed card, so check the board after the change.
2. Thumbnail frame wrong. `components/kudos/kudo-image-gallery.tsx:88`: `rounded-[18px] border border-home-border bg-white` → `rounded border border-login-accent` (≈4px radius, #FFEA9E 1px). Line 91: drop the second `border border-login-accent` on the `<Image>` so only one ring shows. Shared with the board thumbs.

P2
3. Mobile name/dept overlap at 375. `components/kudos/kudo-person.tsx` (name link): remove `-my-2.5` on the name `<a>` (or add `mb-1` to the dept row). Re-check 375 at two-line names.
4. Content box padding. `components/kudos/kudo-detail-card.tsx`: the box class `px-6 py-4` → `px-6 py-[15px]`. Brings frame to 1365 and the bottom row to match. Inferred from pixels (±1px).
5. Content weight (probable). The reference content looks ExtraBold (800). Montserrat is loaded with weights 400/500/700 in `app/[locale]/layout.tsx:11`. Before changing: confirm the Figma spec (MCP out of quota). If 800 is confirmed, add "800" to that array and use `font-extrabold` on the content div in `kudo-detail-card.tsx`. Shared with the board's content text: check the board after.
6. Hashtag gap: `kudo-hashtag-list.tsx:35` `mr-2` → `mr-1` (4px) to match the ref ~4–5px rhythm. The 6-tag line then fits in 600px (≈587px).
7. Heart-to-count gap ~4px short. `components/kudos/kudo-hearts.tsx:49` `gap-1`. Shared with the board. Low priority; only if the Figma spec says so.

Not a fix: the top art (known deviation), the empty avatars (fixture has no avatar_url; same placeholder component as the board), the liked/unliked heart (fixture state).

## Test notes
- Stable repeatable: each capture re-signs-in with a fresh fake-Supabase mint. No flake observed in the 4 captures or 2 interaction runs.
- Not run: the Playwright suite (not asked; last reported GREEN 15/15 detail, 244/244 full).

**Status:** DONE_WITH_CONCERNS
**Summary:** Frame geometry at 1440 matches the reference within 2px (x 380, w 680, radius 24, bg #FFF8E1, top divider, avatars, title width, content line pitch and edges, thumbnail pitch, Copy Link and Đóng). Four real mismatches: hashtag row truncates at six tags, thumbnail ring and radius are wrong, mobile name/dept overlap at 375, and content text looks heavier in the reference (probably 800 vs 700). Content padding is ~1px off (15 vs 16).
**Concerns/Blockers:** (a) Figma MCP is out of quota, so the content weight, the hashtag gap, and the padding are inferred from pixels; confirm in Figma before changing the shared components. (b) The 5-thumbnail and 6-hashtag rows were produced by DOM cloning, not a fixture. (c) The fixed fixture has no avatar_url, so avatar photos could not be compared. (d) Hashtag and thumbnail fixes touch components shared with the board, so re-check the All Kudos card after the change.
