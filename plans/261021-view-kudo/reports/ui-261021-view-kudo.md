# UI report: View Kudo (Figma 520:18779, MoMorph onDIohs2bS)

Mode: screen (composed in one pass, no sub-agents) | testPolicy: e2e-red-first (RED evidence: tester-261021-red.md, 12/15 fail, exit 1; GREEN is the orchestrator's integration run)

## Files
| File | Lines | State |
|---|---|---|
| components/kudos/kudo-detail-layout.tsx | 55 | new |
| components/kudos/kudo-detail-card.tsx | 80 | new |
| components/kudos/kudo-detail-close-button.tsx | 43 | new ("use client") |
| components/kudos/kudo-post-card.tsx | 102 | modified: content box is a `next/link` |
| messages/vi/kudos.ts | 133 | modified: `postCard`, `close` consts + `detail` |
| messages/en/kudos.ts | 139 | modified: same |

`Dictionary` is `typeof vi`, so adding `detail` to vi is the type sync; en is typed `Dictionary["kudos"]` and compiles.

## Design evidence
Two user PNGs (680x1365 frame, 1440x1521 page), measured with sharp pixel scans (scratchpad scripts). No MoMorph/Figma MCP calls (no node tree for this frame; prompt-provided screenshots are the oracle).

## Measurements
| Element | Measured (px) | Class used |
|---|---|---|
| Frame width, centring | x 380..1060 at 1440 = 680, centred | `w-full md:max-w-[680px]` in `items-center` main |
| Frame top vs header | top edge y=79/80 = header bottom, gap 0 | `lg:pt-0` (below lg `pt-4`: header is not sticky there) |
| Frame bottom to page end | 77 (1444 -> 1521) | `md:pb-20` (`pb-10` mobile) |
| Frame fill | rgb(255,248,225) = #fff8e1 | `bg-kudos-card` |
| Frame border | none (frame edge pixel = fill) | no border |
| Corner radius | row 0 starts at x=17, x=0 from y=20 => ~24 | `rounded-3xl` |
| Padding | content x 40..639 (600 wide), top divider at y=40 | `px-4 md:px-10 pt-6 md:pt-10` |
| Bottom padding | button row 1285..1341, frame ends 1365 => 24 | `pb-6` |
| Top divider / bottom divider | 1px at y=40 and y=1268, rgb(255,234,158) | `h-px bg-login-accent` |
| Row gap | divider 41 -> avatar 57 (16); box 1107 -> images 1124 (16) | `gap-4` |
| Avatars | 64px, centres x 157.5 / 521.5 (235px columns at 40 / 405) | KudoPersonInfo (unchanged) |
| Time | glyph 200..215 (16px bold #999) | `text-base leading-6 font-bold tracking-[0.5px] text-kudos-muted` |
| Title | glyph 238..254, centred, no pen icon | `text-center text-base ... text-login-bg` |
| Content box | y 276..1107, x 40..639, 25 lines at 32px pitch | `rounded-xl border border-login-accent bg-[rgb(255_234_158/0.4)] px-6 py-4`, text `text-xl leading-8 font-bold text-justify` |
| Content box fill | rgb(255,242,198), edge rgb(255,234,158) | same tint as the cards |
| Thumbnails | 88px squares, x 40..543 = 5x88 + 4x16 | KudoImageGallery (unchanged) |
| Hashtags | glyph 1233..1249, red | KudoHashtagList (unchanged) |
| Heart row | "10" + 32px heart at left; Copy Link ~409..552, "Dong" text 577..622, right edge 640 | `justify-between`, right group `gap-2` of Copy Link + Close, both `min-h-14 p-4` |
| Page art | brightest art pixel ~rgb(49,52,47) over #00101a, cutoff near y=375, flat #00101a below | KV `kv-bg.webp` at `opacity-[0.18]` in a 380px band + 96px fade to `login-bg` |

## Behaviour
- Close: `canGoBackInSite()` uses `window.navigation.canGoBack` (Navigation API: same-origin entries of the tab, counts client navigations); fallback is a same-origin `document.referrer`. True -> `router.back()`, else `router.push("/sun-kudos")`. Board -> "Xem chi tiet" -> Dong goes back to /sun-kudos; a fresh `page.goto` (about:blank is not same-origin, `signInAs` navigates nothing) goes to /sun-kudos. Both mentally traced against the "close and entry points" spec group; not executed.
- All Kudos card: content box is `<Link href=kudoDetailHref(id)>` wrapping `<p data-testid="kudo-content">` (line-clamp-5 kept). Accessible name is the text. Existing board specs: `kudo-content` is only read by write-kudo.spec.ts (`toContainText`), which still holds; the profile-link assertions use `a[href^="/profile/"]`, unaffected; Highlight card untouched. New spec expects exactly one `a[href=/sun-kudos/{id}]` per feed card: it is the only one.
- Detail card: nothing between `kudo-content` and `kudo-detail` has overflow/line-clamp (article, content box and wrapper are plain blocks); `kudo-title`, `kudo-time`, hearts (`kudo-hearts`, aria-label, disabled when own) all reused.
- Rich content styles on the `kudo-content` wrapper: `[&>*+*]:mt-2`, `p` pre-line, `ol` decimal + `pl-8`, `blockquote` 4px left border (`login-bg/30`) + italic, links underlined with a focus-visible ring.
- Layout wraps `{children}` so Track B's bare `<p role="alert">` renders as a cream rounded card (`[&>[role=alert]]:` variants).

## Deviations
1. Background art: the reference art is a different composition from the KV ribbons (grey circuit/vein lines, golden swoosh at the right) and is at most ~20% bright. Per the brief I reused `kv-bg.webp` darkened to 18%; the pattern differs but tone, extent (top ~380px) and fade match. No new asset invented.
2. Hashtags: `KudoHashtagList` caps at 5 tags (board rule); the screenshot shows 6 (sample data repeats). Not owned, not changed.
3. `allKudos.card.openDetail` from plan.md "Contratos" is NOT added: the brief says no aria-label, name = content text.
4. Header height: the 1440 shot has the frame at y=80; the real header's height is whatever `SiteHeader` renders (comments in the KV banner say 80); not measurable without a server.
5. Frame is slightly more padded on mobile (`px-4`, `pb-6`) and content text stays `text-xl` at 375 as the cards do.

## Checks
| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 (whole tree, incl. other tracks' current files) |
| `npx eslint` on the 4 components + 2 message files | exit 0 |
| Tailwind class compile (scratchpad @tailwindcss/node + oxide Scanner on the 4 components) | every arbitrary variant resolves (`[&>*+*]:mt-2`, `[&>[role=alert]]:*`, `md:max-w-[680px]`, `bg-linear-to-b`, `opacity-[0.18]`, ...) |
| `npx vitest run` | 712 tests pass; 1 suite fails to load: tests/unit/get-kudo-detail.test.ts (Track B's `lib/kudos/get-kudo-detail` not written yet, not mine) |
| build / E2E / servers | not run (per brief) |
| Asset coverage | not applicable (no new assets; existing `kv-bg.webp`) |
| Visual comparison | delegated: reference = the two PNGs in plans/261021-view-kudo/figma/; actual screenshot comes from the tester at integration (needs Track B's page) |

## GREEN handoff
`npm run test:e2e -- tests/e2e/kudo-detail.spec.ts` (tester, after build with all three tracks), then screenshot at 1440x1521 and 680x1365 frame for comparison, plus 375 / 768 / 1280 polish check.
