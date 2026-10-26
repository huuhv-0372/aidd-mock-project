# Visual check — Viết Kudos (#12)

Date 2026-10-19, tester, policy `e2e-red-first` (phase 06 step 6). Final code, `next start -p 3103` + fake Supabase 54398 (same setup as `playwright.config.ts` authed server), signed in as a minted JWT, page `/sun-kudos`. Playwright MCP, Chromium. Four scripted runs: 1440x900 and 375x812, VI and EN, 21 states each. Screenshots: `reports/visual/{vi|en}-{1440|375}-NN-*.png` (53 files).

## Limits (read first)

- **No MoMorph reference images were compared.** This agent has no MoMorph / Figma tool (`get_frame_image` not available), and no reference PNG exists in the repo for `ihQ26W78P2`, `b1Filzi9i6`, `Sv7DFwBw1h`, `OyDLDuSGEa`, `p9zO-c4a4x`. What I checked: copy against `track-a-copy-phase-04/05.md` (VI text from Figma), structure against `plans/momorph-specs/*/specs.csv` + clarifications, and the objective checks below. The result is a **qualitative judgment, not a pixel comparison**; nothing here is "exact". The controller (Figma access) should diff the screenshots against the five frames.
- Error state (`5c7PkAibyD`), anonymous (`p9vFVBE_tc`) and recipient dropdown (`QIMJNgFb8K`) have no reference at all (clarifications: no image); judged for consistency only.
- Guest homepage widget was not captured (covered by E2E: link to /login, Thể lệ opens/closes). Hover states not captured.

## Objective checks (measured in the page)

| Check | 1440 VI/EN | 375 VI/EN |
|---|---|---|
| Horizontal overflow (`scrollWidth - innerWidth`) | -15 in every state = only the 15 px vertical scrollbar, no overflow | same, no overflow |
| Modal inside viewport | dialog 752x862 at (337,19) in 900 high | dialog 359x774 at (1,19) in 812 high, full width, no clipping |
| Modal scrolls | inner scroller 996 > 884 (scrolls even at 900 high) | 1224 (VI) / 1232 (EN) > 796, scrolls, footer reachable |
| Rules panel | right drawer 553 px, scroller 1266 > 740, scrolls to bottom, Đóng + Viết KUDOS footer fixed | full-screen, scroller 1624 > 684, scrolls |
| Rules badges | 6 images loaded, natural 64 px | same |
| Widget menu | Thể lệ + Viết KUDOS + red ✕, all >= 44 px | same |
| Errors after blur | 4 errors shown (recipient, title, content, hashtags), red border + "Không được để trống" / "This field cannot be empty" | same |
| Hashtag dropdown | 13 options, opens below "+ Hashtag", dark panel | same |
| Recipient list | 3 matches for "Nguyễn", no email | same |
| Mention list | 2 matches for "@Trần", inserts highlighted chip | same |
| Add link | VI title "Thêm đường dẫn" + "Nội dung" / "URL"; EN "Add link"; nested over the modal, dims it | same, full width |
| 5 images | 5 thumbnails 80 px, "+ Image" hidden, each with a red x | wraps 3 + 2, fine |
| Anonymous | checkbox on -> alias field "Tên ẩn danh" appears | same |
| Console | 0 errors; 1 warning: `kv-bg.webp` preloaded but unused (page hero, not from this change) | same |
| Language | `html lang` follows `NEXT_LOCALE` (vi / en); all new strings translated, no VI text leaks into EN modal/menu/rules | same |

## Findings, ranked

No layout-breaking bug found: nothing overflows, nothing is unreachable, modal and panel scroll, copy is right in both languages. Items 1-2 break a stated checklist item (focus visible / 44 px) and should be fixed or explicitly accepted.

### Should fix before accept (accessibility, not blocking function)

1. **Rich-text editor has no visible focus indicator.** Tab order reaches it (`DIV "Nội dung lời cám ơn"`), but outline is `none`, no box-shadow, border colour stays `rgb(153,140,95)` (checked on the editor and 4 ancestors). Every other control shows a focus ring (inputs: box-shadow ring; buttons/links: 2 px solid outline). Fails "focus visible" for this one control (WCAG 2.4.7); CLAUDE.md asks for `focus-visible:`. Suggest `focus-within` ring on the editor box (`h-[200px] overflow-y-auto rounded-b-lg border ...`, `components/kudos-compose/kudo-editor-styles.ts`).
2. **Touch targets below 44 px on 375**: hashtag-chip remove (20x20) and image remove x (20x20, 5 of them), and the anonymous checkbox input (24x24, label text beside it is larger). CLAUDE.md: `min-h-11 min-w-11` for interactive elements on mobile. Suggest keeping the 20 px glyph and padding the hit area to 44 px (`before:absolute before:-inset-3`).

### Cosmetic / judgment calls (need the Figma frames)

3. Hashtag dropdown (332 px tall) opens downward and runs past the modal bottom at both widths (at 1440x900 only 4 of 13 options are visible until the modal is scrolled; at 375 it covers Image + anonymous + footer). Works, but the user has to scroll the modal. Check the frame `p9zO-c4a4x` for the intended max height / direction.
4. Footer Hủy/Gửi sit at the end of the scrolled content, not pinned: at 1440x900 the default state hides them below the fold (996 vs 884). Check against `ihQ26W78P2` whether the modal is meant to be taller than 900 or pinned.
5. Rules panel body text is justified with no right padding next to the scrollbar: wide word gaps ("Mỗi lời Kudos bạn gửi…") and the last glyphs touch the scrollbar at 1440 (VI and EN). 375 is fine.
6. VI modal title wraps with an orphan "đội" at 1440 (752 px dialog); the Danh hiệu placeholder is cut ("Dành tặng một danh hiệu cho…") at 375. Toolbar buttons are 58x40 and the "Tiêu chuẩn cộng đồng" link 40 high at 1440 (desktop only, below 44 but the 44 px rule is mobile); on 375 they are >= 44.
7. After a blur error on Danh hiệu the 2-line hint is replaced by the one-line error, leaving a blank band above the toolbar (layout jump of about 40 px). Intended per the error frame? Unknown.
8. Widget menu at 375 overlays the page headings ("Sun* Annual Awards", "HIGHLIGHT KUDOS") — expected for a floating menu; no overlap among its own three controls.

## Evidence files

States per run: 00-page, 01-menu, 02-rules-top, 03-rules-bottom, 10-modal-default, 12-errors, 13-hashtag-dropdown, 15-recipient-list, 16-mention-list, 17-add-link, 18-images, 19-anonymous, 20-focus-ring (+ `en-375-21-editor-focus.png`, element crop of the editor). Measurements printed by the script are summarised above; raw numbers were not stored.

## Polish round (2026-10-19, tester)

Final code after the 7 presentational edits in `components/kudos-compose/`. Same stack as above (authed `next start -p 3103` + fake Supabase 54398, minted JWT, `/sun-kudos`), but captured with a scripted Playwright Chromium run instead of the MCP, **scrollbars visible** (default headless hides them, which would fake the scrollbar-gap check). Runs: VI 1440x900, VI 375x812, EN 1440x900 (EN only for measurements). Overwritten in `reports/visual/`: `vi-1440-02-rules-top`, `vi-1440-03-rules-bottom`, `vi-375-02-rules-top`, `vi-1440-13-hashtag-dropdown`, `vi-375-13-hashtag-dropdown`, `vi-375-18-images`, `vi-375-19-anonymous`, `vi-1440-21-editor-focus` (new, element crop with 40/70 px margin). Console errors: 0 in all three runs. No MoMorph reference compared; judgments are qualitative, numbers are `getBoundingClientRect`.

| # | Item | Measured | Result |
|---|---|---|---|
| 1 | Hashtag chip remove >= 44x44 | 44x44 (x2) at 1440 and 375; inner dot 20x20 | PASS |
| 2 | Image remove >= 44x44 | 44x44 (x5) at 1440 and 375; inner dot 20x20 | PASS |
| 3 | Anonymous checkbox >= 44x44 | input 44x44 at both widths; label row 446x44 (1440 VI) / 304x56 (375 VI); keyboard focus (Shift+Tab, Tab) draws a 2 px solid ring on the drawn box; checking it reveals the alias field | PASS |
| 4 | Legend Hero row on one line at 1440 (badge top vs text top, +-4 px) | VI: badge top 513, text top 512, delta -1 px (all four rows -1) | PASS |
| 4b | same row at 375 | delta 26 px, text wraps under the badge in every row (flex-wrap, column 355 px) | not required at 375, by design |
| 4c | same row, EN at 1440 | New/Rising/Super -1 px, **Legend 26 px: "More than 20 people send you Kudos" wraps below the badge** | observation (item names VI only); see Concerns |
| 5 | Rules text right edge >= 8 px from the scrollbar | 1440: scrollbar 15 px, scrollbar left edge 1410, widest text right edge 1385, **gap 25 px** (also 25 px at the bottom); 375: scrollbar left 345, text right 329, **gap 16 px**; no horizontal overflow | PASS |
| 6 | Hashtag dropdown bottom <= dialog visible bottom, 375x812, button scrolled into view | dropdown 243.6 px (30dvh) bottom 756.6 vs dialog visible bottom 793 (dialog bottom 793, scroller 815, viewport 812); identical for scrollIntoViewIfNeeded, block=center, block=end | PASS |
| 6b | same at 1440x900 (not part of the item) | dropdown 332 px, bottom 1073 vs visible bottom 881 (scroller scrollTop 0), still 961 > 881 with the button centered; only ~4 options visible without scrolling the modal | unchanged from finding 3 above |
| 7 | Editor focus indicator (new) | focus-within on the editor box: border rgb(0,16,26) + 1 px ring rgb(0,16,26) (computed `box-shadow ... 0 0 0 1px`); identical at 375; shot `vi-1440-21-editor-focus.png` shows an ink outline around the editor body, gold toolbar border kept | PASS (closes finding 1) |
| 8 | Remove-button visual size | circles still 20 px (chip, thumbnail), thumbnails 80 px, chip row layout unchanged (screenshots 18) | PASS |

Resolved from the earlier findings: 1 (editor focus), 2 (touch targets), 5 (rules text vs scrollbar). Still open: 3 at 1440, 4, 6, 7, 8 from the first list (all need the Figma frames).

Test-data note: the thumbnails in `vi-375-18-images.png` are 1x1 PNG stand-ins scaled to 80 px (blue squares), not real photos.
