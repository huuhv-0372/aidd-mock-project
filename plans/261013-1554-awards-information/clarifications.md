# Clarifications — Hệ thống giải (Awards Information)

MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/zFYDgyj_pD (fileKey `9ypp4enmFmdK3YAFJLIu6C`, screenId `zFYDgyj_pD`, Figma node 313:8436)
Specs: plans/momorph-specs/he-thong-giai-zFYDgyj_pD/specs.csv (23 rows) · Test cases: plans/momorph-specs/he-thong-giai-zFYDgyj_pD/test-cases.csv (15 cases, ID-0..14)

## Session 2026-10-13

- Q: Route — test cases ID-0/1 use /he-thong-giai, Homepage already links /awards-information (header + 6 award cards as /awards-information#<slug>, covered by unit + E2E). Options: keep /awards-information / switch to /he-thong-giai / new URL + redirect. → A: Keep /awards-information. Test cases ID-0/1 are executed against /awards-information; no Homepage change.
- Q: Left award menu behaviour while scrolling (spec only defines click → smooth scroll + gold/underline active)? Options: sticky + scroll-spy / click + #slug only. → A: Sticky menu + active item follows the card in view (scroll-spy). Landing with #<slug> (from Homepage cards) scrolls to that card and activates its item. Click also updates the URL hash.
- Q: Mobile layout (Figma is desktop 1440 only)? Options: horizontal scrollable chip bar sticky under header / hide menu below md. → A: Horizontal scrollable bar, sticky under the header; award cards stack (image on top, content below).
- Q: ID-14 — "Chi tiết" points to /sun-kudos (not built → 404). Options: SAA-styled friendly 404 / Next default. → A: Add a simple SAA-styled app/not-found.tsx (dark background, Vietnamese message, link back to Homepage); shared by every unbuilt route.

## Defaults chosen by orchestrator (override if wrong)

- Access: login required (ID-1). Default-deny proxy already redirects anonymous users on /awards-information to /login; no proxy change. A guest clicking an award card on the public Homepage lands on /login.
- Header / footer / widget button are reused from Homepage with "Awards Information" as the active nav item (header active href becomes a prop). Components used by a second page move out of `components/home/` per the CLAUDE.md "second use" rule.
- Award images (D.x.1) reuse the Homepage award assets (award-bg + award-name PNGs) when the Figma node matches; otherwise export from MoMorph. Sun* Kudos block (D1) reuses Homepage `KudosSection` if Figma is identical, else a variant — implementer verifies against MCP data.
- All copy (award descriptions, quantities, prize values, units) is taken verbatim from the Figma node tree, never from spec prose.
- ID-13 (invalid section id): unknown hash → no JS error, page stays at top, no item activated beyond the default (first).
- ID-10 hover highlight is a visual-contract check (tester screenshot), not E2E.
- Test policy: e2e-red-first (navigation, scroll + active state transitions, auth redirect).

## Session 2026-10-14

- Q: Mobile — chip bar docks at the viewport top (header is not sticky below lg), not "under the header". Keep, or make the header sticky too? → A: Keep as is.
- Q: Hero keyvisual approximated (MoMorph get_figma_image 500 / get_media_file 401). Accept or re-export? → A: Re-export via tkm:momorph-implement-design. Node 2167:5138 is not an MM_MEDIA node and MoMorph export still 500s; exported through the Figma MCP (download_assets, same fileKey) at 2x → public/images/awards/keyvisual-bg.webp (2880x1094).
- Q: Homepage header wraps to 2 rows at 375px — pre-existing or regression of the shell move? → A: Compare against the pre-move build (1512219) to confirm (see reports/header-375-compare.md).
