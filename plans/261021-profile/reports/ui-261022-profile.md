# Phase 02a UI report: Profile (own + another Sunner)

Mode: screen. Test policy: e2e-red-first (RED evidence: `reports/tester-261021-red.md`, exit 1, `GET /profile must answer 200`, 27/30 failed). GREEN is not self-certified: the controller runs build + E2E in phase 03.

Design evidence: MoMorph `get_overview`, `get_media_files`, `get_frame_image` (3FoIx6ALVb), `query_section` on `362:5050`, `362:5065`, `362:5056`, `362:5089`; the two Figma PNG exports; the user image of `w4WUvsJ9KI` (cropped with sharp to measure). `get_frame_node_tree` was not called: `query_section` returned the same branch with styles, and no section agents were spawned (the whole job is ~600 lines in 8 small files).

## Files and line counts

New:
- `components/profile/profile-view.tsx` 77
- `components/profile/profile-page-layout.tsx` 61
- `components/profile/profile-hero.tsx` 51
- `components/profile/profile-icons.tsx` 26
- `components/profile/profile-write-bar.tsx` 26 (client)
- `components/profile/profile-kudos-section.tsx` 107 (client: direction state, loading/error)
- `components/profile/profile-kudos-body.tsx` 94 (client: empty / loading / error / `KudosFeedList`)
- `components/profile/profile-direction-dropdown.tsx` 134 (client: client-state listbox)
- `components/profile/fill-template.ts` 4 (`{name}` / `{count}` filler, function replacer so `$&` in a name stays literal)
- `messages/vi/profile.ts` 28, `messages/en/profile.ts` 24

Edited (additive, board behaviour unchanged):
- `messages/vi/index.ts`, `messages/en/index.ts`: `profile` registered.
- `components/kudos/kudo-person.tsx`: `HeroTitle` and `Stars` now exported; their `align` accepts `"center"` as well as `"start" | "end"` (`TIP_ALIGN` map, same classes for the old two values).
- `components/kudos/kudos-feed-list.tsx`: new exported type `KudosFeedLoadMore` replaces `typeof loadMoreKudos` for the `loadMore` prop. `loadMoreKudos` (input: unknown) still fits, so `all-kudos-section.tsx` is untouched and compiles.

## Exported signatures

```ts
ProfileView({ data, locale, dict, loadMore }: {
  data: Extract<ProfilePageData, { status: "ok" }>; locale: Locale; dict: Dictionary; loadMore: LoadMoreProfileKudos })   // server
ProfilePageLayout({ locale, shell, children }: { locale: Locale; shell: Dictionary["shell"]; children: ReactNode })      // server
```
Composition in `ProfileView`: `KudosComposer` (copy = `dict.kudosCompose`) > `ProfilePageLayout` > `KudoHeartsProvider setHeart={setKudoHeart}` > hero, icons, statistics card (self) or write bar (other), KUDOS section. `ProfilePageLayout`: `SiteHeader` and `SiteFooter` both `activeHref={SUN_KUDOS_PATH}`; `<Suspense fallback={<HeaderControlsPlaceholder/>}><HeaderSessionControls/></Suspense>`; `bg-login-bg`; no widget; a direct-child `<p role="alert">` is styled as the cream card (same rule as `KudoDetailLayout`).

## dict.profile keys

`metaTitleSelf`, `metaTitleOther` ("{name} | SAA 2025"), `loadError`, `unknownName` ("Sunner", fallback when `full_name` is null), `icons.{titleSelf, titleOther}`, `writeBar`, `kudos.{eyebrow, title, received, sent, sentNoCount, receivedStatic, directionList, emptySent}`. Templates use `{name}` / `{count}`. Non-Figma strings are marked `// not from Figma`; strings that exist only in the user image for the "other" face are marked as such in the VI file.

## Measurements used (1440 frame, MoMorph unless noted)

- Column: every block 680 wide, centred (`max-w-[680px]`), `px-4` mobile, `md:px-12`.
- Key-visual band: 1440x512 at page top (432 below lg), image + Cover gradient copied from `KudosKvBanner` / `KudoDetailLayout`. Avatar top at y=184: header 80 + `lg:pt-[104px]`; `pt-10` below lg.
- Avatar 200 (160 on phone), 4px white ring, placeholder `#eee`. Name 36/44 gold bold (24/32 on phone). Info column gap 32; name block gap 8.
- Detail row: department 22/28 white bold, dot 4px `#999` at 0.4, Hero badge 109x19 (`HeroBadge` small), stars (board's 14px star). Row gap 10.
- Icon cells: 6 x (80 wide, 64 circle, 2px white ring, `#323231`), gap 16, row 560 wide; heading 22/28 white, 32 below the row. Phone: 6-column grid, gap 8, circles shrink.
- Own profile: 64 gap from the heading to the statistics card (362:5073: 716 - 652). Card = existing `KudosStatsPanel` at 680.
- Other profile (from the user image 1440x4384, measured): write bar 680x72 (x 380..1060, y 740..810), pill radius, 1px home-border, 10% gold tint, pencil 24 + centred 16px bold text, gap 16; 32px between the heading and the bar (heading bottom ~708).
- KUDOS block: 120 below the card / bar (362:5083), eyebrow 24/32, 1px `#2E3940` divider, title 57/64 gold with -0.25 tracking (existing `KudosSectionHeader`), gaps 16, 40 to the list, 24 between cards.
- Direction trigger (362:5089): padding 16x24, gap 8, 1px `#998C5F`, bg `rgba(255,234,158,.10)`, radius 4, text 16/24 bold, chevron 24, min height 56.
- Other profile static count: 22/28 bold white, right aligned (measured from the user image: ~220 wide for "Đã nhận: 5 Kudos").
- Footer: existing `SiteFooter`, "Sun* Kudos" current.

Values taken from the user image, not MoMorph: write bar size / style / copy, 32px gap above it, the static "Đã nhận: N Kudos" size, the possessive icons heading.

## Behaviour notes

- Hero: avatar `next/image` `fill` + `sizes`, `unoptimized` (Google/demo URLs, same as the card avatar); no `avatar_url` gives the grey circle (fixed size, never zero). Badge from `distinct_senders` (none at 0), stars from `kudos_received` (none under 10). No department drops the text and the dot. `profile-hero-badge` / `profile-hero-stars` wrap the board's tooltip pieces.
- KUDOS own: trigger text = current option; listbox of two `option`s with `aria-selected`; the other option calls `loadMore({ profileId, direction, cursor: null })` and replaces the list (feed remounted by direction key) with loading / error+retry states; a stale answer from an older pick is ignored; re-picking the current option only closes the list (no request). Sent label without a number when `stats` is null. `feed === null` shows the board's generic list error with a retry button.
- Infinite scroll stays on the injected server action: `KudosFeedList` gets a closure `({cursor}) => loadMore({profileId, direction, cursor})`.
- KUDOS other: `<p>Đã nhận: N Kudos</p>`, no dropdown; "Đã gửi"/"Sent" is never rendered on that face (the sent copy is only used by the self dropdown).
- The KUDOS section is keyed by `person.id` + first feed row id so `router.refresh()` after sending a Kudo from the write bar restarts it on the new first page.

## Checks

- `npx tsc --noEmit -p .`: no errors. (The expected cross-phase error on `openComposer({ recipient })` did not occur: phase 02c's `ComposerOptions` change is already in the tree.) The board compiles unchanged.
- `npx eslint components/profile messages/{vi,en}/profile.ts messages/{vi,en}/index.ts components/kudos/kudo-person.tsx components/kudos/kudos-feed-list.tsx`: clean, exit 0.
- Asset coverage: not applicable. The MoMorph media nodes of 3FoIx6ALVb are the header/footer logo and the card avatars, all already in the repo or user data; new UI uses existing `kv-bg.webp`, `icon-pen.svg`, `icon-chevron-down.svg`. No new asset.
- Not run (per dispatch): `next build`, E2E, any server, visual capture.

## Deviations from Figma and why

1. Statistics card padding is 24 (`KudosStatsPanel` as on the board), Figma has 40 and a 600 content width at 680. The component was to be reused unchanged; a `className`/padding prop would be a 1-line additive change if the owner wants pixel parity.
2. Footer top gap is `SiteFooter`'s own `mt-20 xl:mt-[125px]` (Figma 120): 5px more at xl.
3. Icon circles are grey `#323231` and unlabelled on both faces (Secret Box not built); the user image shows artwork + labels.
4. Cards: no Spam chip and no edit pencil (clarifications); the self image shows both.
5. The key-visual band markup is a third copy (`KudosKvBanner`, `KudoDetailLayout`, `ProfilePageLayout`); extracting it was out of the owned files.
6. Write bar pill is built from the same classes as the board's pill (copied string; that file is owned by 02c).
7. Mobile values (hero 160px avatar, 24/32 name, 80px gap above KUDOS, 6-column shrinking icon grid) are not in Figma; they follow the board's responsive pattern.
8. The self image shows "Đã gửi (5)" as the selected option; per clarifications the default is "Đã nhận".
9. `overflow-x-clip` on the page wrapper stops the hidden hero tooltips from widening a phone page (the board scopes tooltips per side instead); it is not a scroll container, so the sticky header is unaffected.

## Risks for phase 03

- Visual check at 1440/375 is still to do: the 104px top padding, the sticky header height and tooltip placement are computed from the measurements above, not captured.
- `HeroTitle` / `Stars` tooltips are focusable (`tabIndex=0`) in the hero as on the card; the E2E only inspects the wrappers' content.
