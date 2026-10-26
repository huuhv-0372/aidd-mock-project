# Visual check — VI/EN language switch (Stage 4)

Date: 2026-10-14. Final working tree. Servers: `next start` on 3101 (guest, past event) and 3103 (authed, fake Supabase on 54398).
Screenshots: `reports/visual/` (`{page}-{width}-{locale}-{guest|authed}.png`, `dropdown-1440-{vi|en}.png` + `-crop.png`).
Pixel metric available (sharp raw diff), so no "exact" label is claimed anywhere below.

## 1. Response headers and html lang (curl against :3101)

| Request | Result |
|---|---|
| GET / (no cookie) | 200, `html lang="vi"`, `cache-control: private, no-cache` |
| GET / with `NEXT_LOCALE=en` | 200, `html lang="en"`, `cache-control: private, no-cache` |
| GET /login with `NEXT_LOCALE=en` | 200, `html lang="en"` |
| GET /vi/login, /en, /en/login (guest) | 307 -> /login (default-deny, no working page at a locale URL) |
| GET /en/login or /vi with cookie | 307 -> /login |
| GET /awards-information (guest) | 307 -> /login |

**DISCREPANCY (cache correctness):** the response to GET / with `NEXT_LOCALE=en` does NOT carry `Vary: Cookie`. The `Vary` header is only `rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding`. `lib/supabase/update-session.ts:77` appends `vary: Cookie` on the rewrite, but the value does not reach the delivered response (Next's own Vary appears to overwrite it on the prerendered path). Impact: a shared cache (Cloudflare edge) could serve the VI HTML to EN-cookie users or the reverse. Cache-Control is `private, no-cache` (private, not `no-store`). Requires a fix by the implementer and a re-check. Not fixed here (read-only run).

## 2. Visual captures

Widths 1440 and 375, VI and EN.

- **Overflow (scrollWidth vs viewport):** no page-level horizontal scroll at any width or locale (scrollWidth == viewport everywhere).
- **Login 1440:** decorative background image and overlay sit at x=-400..2206 (absolute, clipped by the container). Present in both locales, not an EN issue.
- **Awards 375, VI and EN:** the award category chips (Top Project Leader, Best Manager, Signature 2025 - Creator, MVP) extend past 375px. They sit inside a horizontal scroller, so the page does not scroll. Same in VI and EN; pre-existing behavior, not a language regression.
- **Header 375:** the nav "Sun* Kudos" wraps to a second line in VI and EN alike. Present before this change (see the baseline `home-375-top.png`).
- **EN wrapping at 375:** the nav ("About SAA 2025", "Awards Information", "Sun* Kudos"), the CTA buttons ("ABOUT AWARDS", "ABOUT KUDOS", "LOGIN With Google"), award card titles, and footer links all wrap or fit cleanly. No clipped text found in `home-375-en-guest.png`, `login-375-en-guest.png`, or `awards-information-375-en-authed.png`. EN is slightly longer in the Recognition paragraph but reads without overlap.
- **Awards VI vs baseline (`plans/261013-1554-awards-information/reports/visual/`):** dimensions match exactly (375x9240 and 1440x6426). Pixel diff is NOT zero:
  - 1440: 725,184 of 9,253,440 pixels differ (7.8%), max channel delta 248.
  - 375: 266,184 of 3,465,000 pixels differ (7.7%), max channel delta 255.
  - Top-700px crop compared visually: nav, title "Hệ thống giải thưởng SAA 2025", and copy are identical. The hero background art is cropped/positioned differently (ribbon placement shifted, baseline has a ~2px left strip). Cause not established (could be capture conditions of the older baseline or a background-position change). **Reported as a discrepancy for the controller to decide: correct it or accept it explicitly.** Homepage VI baseline is absent (`261012-1549-homepage-saa` folder does not exist), so no homepage VI diff was possible; `home-375-top.png` is an authed 812px viewport capture, not comparable with the full-page guest capture.

## 3. Dropdown (1440, open on /, VI and EN) vs Figma export

Reference: `scratchpad/flags/export.png`, 122x124.

| Attribute | Figma export | Ours (VI and EN) | Verdict |
|---|---|---|---|
| Panel size | 122x124 | listbox 108x122 (options 106x56 each) | DISCREPANCY (-14px width, -2px height) |
| Option order | VN then EN | VN then EN | Match |
| Flags | VN flag, UK flag (Figma vector) | VN flag and UK flag, each with code | Match (visual) |
| Selected row bg (sampled) | rgba(51,53,42) olive-grey | rgba(26,40,49) blue-slate | DISCREPANCY (hue differs) |
| Unselected row bg (sampled) | rgba(0,7,12) | rgba(0,16,26) | DISCREPANCY (minor) |
| Panel backdrop | solid | semi-transparent, hero art visible behind | DISCREPANCY (visual) |
| Selected state follows locale | n/a | VI: VN selected (aria-selected=true); EN: EN selected | Match |

Sampling used approximate pixel positions, so the colour values are indicative; the size difference is measured from the DOM. Judgment is qualitative for colours.

## 4. Findings summary (ranked)

1. **Missing `Vary: Cookie` on the locale-rewritten response** (see section 1). Blocks the cache-correctness guarantee. Needs implementer fix.
2. **Dropdown geometry and colours differ from Figma** (108x122 vs 122x124; selected highlight hue). Needs correction or explicit acceptance.
3. **Awards VI hero background crop differs from baseline** (7.7% pixel diff, text identical). Needs correction or explicit acceptance.
4. Pre-existing, not from this change: awards chip scroller overflow at 375, header "Sun* Kudos" wrap at 375, login decorative bg bleed at 1440.
