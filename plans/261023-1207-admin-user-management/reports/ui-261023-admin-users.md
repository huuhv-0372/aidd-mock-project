# UI report — Admin - User (phase 02a)

Mode `screen`, policy `e2e-red-first` (RED evidence from `tester-261023-red.md`, tests read-only). Design evidence: prompt-provided
`figma/admin-user-773-26403.png` (1440 x 1777) + `figma/figma-measurements.md`; MoMorph/Figma MCP not called (quota exhausted, as stated in
the task). No build, no E2E, no dev server run (phase 03 does that). Visual comparison against the png is therefore NOT done here.

## Measurement table (from the png, sampled with sharp, plus figma-measurements.md)

| Part | Value used |
|---|---|
| Page background | #999999 (token-less, `bg-[#999]`) |
| Header | 88 tall, solid #2B2F31, content x 144..1296 (same xl:px-36 as `SiteHeader`), logo `logo-footer.png` 69x64 at x 144, divider 1 x 32 #999 at x 217, "Admin" 16/24 bold #FFEA9E at x 221 |
| Header layout | three groups with `justify-between` (png gaps 108 / 109 are equal): left 132, tabs 584, right ~219 |
| Tabs | 14/20 bold white, p-4, current = #FFEA9E + 1px underline at y 71 (reuse of `SiteHeader` tab classes), gap 48 at xl |
| Account button | 40x40, 1px #998C5F (existing `AccountMenu`) |
| Title row | x 80..1360, y 112, 52 tall; "User" 45/52 regular #00101A; Export 87x52 at x 1273, #FFEA9E, radius ~4, text 16 bold #00101A |
| Filters | row y 180, 74 tall: label 16/24 medium #00101A + 2px; field 48 tall, 1px #2E3940, white, radius ~4, placeholder 14/20 medium #999, left pad 16, black 10x5 triangle (24px box, right pad 8). Unit 259, Level 136 (hug), Role 123 (hug), gap 16; Search 259 at x 1101, magnifier 24px box right pad 8 |
| Table | x 80..1360, y 270; columns 60/120/141(flex)/126/126/84/81/116/126/116/104/80 |
| Header cells | #00101A, 12px side pad, 12 top / 13 bottom, border-b #2E3940, left divider 22 tall (not on the first cell: none at x 79 in the png), 14/20 medium white, ID / Role / Actions centred |
| Rows | odd #00070C, even #00101A (measured), 1px #2E3940 under each; 85 tall with a 3-line name (3x20 + 24 + 1), 73 with two (date cell 2x28 + 16 + 1) |
| Cell alignment | ID, numbers, dates, role, actions centred; user + email left; Total Heart #D4271D (`--color-kudos-heart`; png reddest pixel #C7251C is anti-aliased) |
| Footer | 48 tall, 1 line centred, Montserrat Alternates 700 16/24 #00101A, top at y 1729 (table bottom 1647 + 82 = `md:pb-[82px]`) |

Height sum check: 88 + 24 + 52 + 16 + 74 + 16 + 1377 + 82 + 48 = 1777 (matches the frame).

## Files (line counts)

Created: `app/[locale]/admin/layout.tsx` 27, `page.tsx` 11, `users/page.tsx` 31; `messages/vi/admin.ts` 78, `messages/en/admin.ts` 74;
`components/admin/`: admin-class-names.ts 7, admin-empty-state 38, admin-export-link 21, admin-filter-dropdown 139, admin-footer 13,
admin-header 42, admin-icons 64, admin-nav-tabs 35, admin-pagination 84, admin-search-box 81, admin-shell 23, admin-toast 42,
admin-user-actions-menu 140, admin-user-row 88, admin-users-filters 95, admin-users-table 87, admin-users-view 56, role-change-dialog 107,
sortable-header-cell 97. All under 200. Extra files beyond the phase list: admin-class-names, admin-search-box, admin-toast, admin-user-row,
admin-empty-state (kept each file single-purpose).
Modified: `messages/{vi,en}/index.ts`, `messages/{vi,en}/shell.ts` (`account.dashboard`), `components/site-shell/account-menu.tsx`
(optional `dashboardLabel` + `dashboardHref`, header comment updated), `signed-in-controls.tsx` (`isAdmin` prop), `header-session-controls.tsx`
(`getIsAdmin()` after the auth check). No asset added: icons are inline (caret-up/down from the Figma SVGs, `currentColor`), logo reuses
`public/images/home/logo-footer.png`.

`"use client"` files: admin-filter-dropdown, admin-search-box, admin-users-filters (the filters leaf); admin-user-actions-menu,
role-change-dialog, admin-toast (the actions leaf; the toast provider is needed so the status survives a row that leaves a filtered list).
Table, header, tabs, pagination, export, empty state, view are Server Components.

## Behaviour notes

- Layout: `await connection()` then `requireAdmin()`, no Suspense above; `/admin` page also gates, then `redirect(ADMIN_USERS_PATH)`; users page re-gates.
- Sort and pagination are `<Link prefetch={false}>` built by `adminUsersHref` (sort click = desc first, flips, back to page 1). Export is `<a download>`.
- Filters: `latest` ref keeps a second pick building on the first while the first navigation is pending (the E2E clears three filters back to back).
  Search: 300 ms debounce, Enter / magnifier submit now, skips a no-op, follows the URL on external change (empty-state "clear filters").
- Row menu: `fixed` panel placed from the button rect (flips above near the viewport bottom) because the table box is `overflow-x-auto`; closes on scroll / resize.
  The viewer's row: disabled button, `aria-label` = self hint. Confirm dialog: native `<dialog>`, first focus on Cancel, one generic
  error line for every refusal / failure / thrown error (per-code messages are not shown: the contract pins one text), double-submit guarded.

## Deviations from the png / contract

1. ID cell: the png wraps "10" and "14" into two lines (an artefact of the sample); the build does not.
2. Sort carets of the sorted column: active direction white, the other dimmed to 40% (Figma has one static look). Not from Figma.
3. Focus rings on the grey page are dark (`outline-login-bg`), the public yellow ring is nearly invisible on #999. Not from Figma.
4. Placeholder #999 on white is 2.8:1 (Figma colour kept).
5. Pagination, empty state, error line, confirm dialog, toast, mobile layout: not in Figma (marked in messages).
6. Contract collision worked around: `admin-users.spec.ts` finds the filter labels with `getByText("Level"/"Role", { exact: true })`
   and strict mode throws on two matches, but the table headers "Level" and "Role" would also read exactly so. The sortable header
   title therefore sits in one span with a screen-reader prefix ("Sắp xếp theo Level"), and the Role header (not sortable) carries an
   `sr-only` suffix " (User / Admin)" (`admin.table.roleHint`). `toContainText` of the header labels still passes. If the tester would
   rather drop the suffix, change `getByText` to scope to the filter row, not the component.
7. Disabled tabs are bare `<span aria-disabled="true">` with no role: Playwright treats an `aria-disabled` element with an interactive
   role as not enabled and `click()` would time out, and the spec clicks them.

## Checks

- `npx tsc --noEmit` (whole project): exit 2, only `TS2307 Cannot find module` for the not-yet-written data-layer files
  (run at the time lib/admin had only the types file): `@/lib/admin/require-admin`, `get-admin-users`, `get-admin-department-codes`,
  `parse-admin-user-filters`, `admin-users-href`, `format-admin-datetime`, `set-user-role-action`, `get-is-admin`. Nothing else, `tests/` excluded from the filter.
- Re-checked against stub declarations of the exact signatures from the task (scratchpad tsconfig, only my files + messages + site-shell): exit 0, no errors.
  The real `admin-users-href.ts`, `format-admin-datetime.ts`, `require-admin.ts` that appeared afterwards match those signatures.
- `npx eslint components/admin "app/[locale]/admin" components/site-shell messages`: exit 0, no output.
- Asset coverage: not applicable (no MM_MEDIA assets). Visual evidence: delegated to phase 03 (no actual screenshot taken here; reference = the png).
- Contract self-check: every `TID.*` testid and COPY string in `admin-users-contract.ts` has a rendering element (read by hand, not run).
  No edit to tests or lib. Contract mismatches: only item 6 above.

## Open points for phase 03

- Run the 39 specs; first suspects if red: `getByText("Role")` strictness (item 6), fixed row menu position near the page bottom, `router.refresh()` timing after a role change.
- Compare 1440 frame to the png (header x positions, table rows 85 / 73, Export and filter geometry).

## Polish 1

Mode `polish`, policy `e2e-red-first` (tests read-only, no test edited). Only `components/admin/**` touched. No build, no E2E, no server run
(per the task); the geometry below is by construction from the Figma numbers, to be confirmed by the controller's tester.

1. **Menu race (GREEN blocker)** - `admin-user-actions-menu.tsx` lines 23-30 (`placeFor`), 52-79 (effect + `toggle`), 99 (`onMenuKeyDown`).
   Root cause: the capture-phase `scroll` listener closed the menu; focusing the item (no `preventScroll`) or the runner scrolling the row into
   view fired a scroll right after the click. Now: scroll / resize schedule one `requestAnimationFrame` that re-reads the button's rect and
   re-anchors the fixed panel (`placeFor`, same below/above flip as on open). It closes only when the button is fully outside the viewport
   (`rect.bottom < 0 || rect.top > innerHeight`) - decision: stay open and anchored, since a user who scrolls the row away has left the
   context anyway. Item focus uses `focus({ preventScroll: true })` on open and on arrow keys, so opening never scrolls. Esc, outside press,
   item select and focus return are unchanged (`useDismissable`, `close`). The rAF is cancelled on cleanup.
2. **Header labels / 65px row** - `sortable-header-cell.tsx` lines 22-51 (`Lines`), 91 (`th` pb), 96 (link), 98 (span). Two-line titles now render
   as one `block whitespace-nowrap` span per line (Figma break: "∑ sent" / "Kudos (N)", "∑ Received" / "Kudos (N)", "Total" / "Heart", "Number" /
   "of Badges", "Time to get" / "6 Badges", "Last" / "Logged in"), the live sum sits on the last line; a " " text node between lines keeps the
   textContent "Last Logged in". One-line titles stay bare text (the `getByText("Level"/"Role")` collision from item 6 above). The title span is
   `shrink-0`, so the flex link can no longer squeeze it into a third line. Height: 12 + 2 x 20 + 12 + 1px border = 65 (bottom padding 13 -> 12,
   Figma's 13 is inside its border box; 86 -> 65 once the third line is gone). Width note: "Kudos (N)" has 126 - 24 padding - 8 gap - 11 sorter =
   83px; "Kudos (100)" is 83px in the png. A 4-digit N (about +8px) cannot grow the cell (`table-fixed` with Figma widths), so the nowrap text pushes
   into the 12px right padding and the sorter overlaps it visually only when N >= 1000; no wrap, no layout shift. Not widened to avoid
   moving every other column off the Figma widths.
3. **Disabled tabs / weights** - `admin-nav-tabs.tsx` 6-10: tab base `font-bold` -> `font-medium` (png: active "User" is Medium, others the same
   weight in white), `opacity-60` removed from the disabled tabs (white from `text-white`, `cursor-not-allowed`, `aria-disabled`, no href kept).
   `admin-header.tsx` 28: "Admin" label bold -> medium. `admin-footer.tsx` 3 and 10: Montserrat Alternates loaded at 500 (was 700) and
   `font-medium`. The png shows all three clearly lighter than the bold capture; exact weight 500 is inferred (png only), not read from Figma.
4. **Role filter 123px** - `admin-users-filters.tsx` 82: `md:w-[123px]` (was hug, measured ~128 in the capture because of a 4px gap).
   `admin-filter-dropdown.tsx` 104/106: the 4px `gap-1` between text and arrow removed (Figma 123 = 16 + 75 + 24 + 8, no gap) and the label
   span clips instead of ellipsizing (`min-w-0 overflow-hidden text-clip`), so a sub-pixel overflow never shows "...". Unit 259, Level 136 (min) unchanged.
5. **Touch targets** - `sortable-header-cell.tsx` 96: link `min-h-11 md:min-h-0`; 1440 row stays 65px (the link is 40px high there).
6. **Review L3** - `AdminToastProvider` moved from `admin-users-table.tsx` to `admin-users-view.tsx` (wraps the whole view: title, filters, table / empty /
   error). The toast is `fixed` and the provider renders no DOM, so layout is unchanged; "Role updated" now survives the empty state. Table comment updated.

Checks: `npx tsc --noEmit` exit 0 (whole project); `npx eslint components/admin` exit 0. Files all < 200 lines (largest 157).
Not run (by instruction): build, Playwright, visual capture. Things for the tester to eyeball at 1440: header row 65px, "Kudos (N)" fits on one line,
Role filter 123 wide, tabs white and Medium, footer Medium; `admin-users-actions.spec.ts:78` x5 for the race.

**Status:** DONE_WITH_CONCERNS
**Summary:** All six polish items are in `components/admin/**`: the row menu re-anchors on scroll instead of closing, header labels break as in Figma on nowrap lines with a 65px row, disabled tabs / Admin label / footer use Figma's white and Medium weight, Role filter is 123px, sortable headers get 44px targets below md, and the toast provider is lifted to `AdminUsersView`. tsc and eslint are clean.
**Concerns/Blockers:** (a) not visually verified (no server/capture allowed) - header height 65 and the 83px "Kudos (N)" fit are computed, not measured; (b) a sum of 1000 or more overflows the 126px column by ~8px into its right padding (no wrap); (c) weight 500 for tabs / Admin / footer is inferred from the png; (d) the footer now loads Montserrat Alternates 500 instead of 700.

## Fix round 2

Mode `polish`, policy `e2e-red-first` (tests read-only). Only `components/admin/admin-user-actions-menu.tsx` touched (170 lines).
Finding (re-review 1, Low): the rAF re-anchor closed the row menu only on a vertical exit from the viewport, so scrolling the table box
sideways until the "..." button was clipped left the `fixed` menu floating detached from its row.

- Lines 33-43: two small helpers. `isOffscreen(rect)` is the old viewport test (`bottom < 0 || top > innerHeight`, unchanged semantics).
  `isClippedByScroller(rect, button)` finds `button.closest('[data-testid="admin-table-scroll"]')` and reports true when the button rect is no
  longer fully inside that box on any side (left / right / top / bottom, 1px slack for border rounding). No container found -> false.
- Line 80: the rAF `reanchor` closes (`setPlace(null)`, same path as the other dismissals, focus not pulled back to the hidden button) when
  `isOffscreen(rect) || isClippedByScroller(rect, button)`; otherwise it re-anchors as before. Doc comment (line ~48) updated.
- Polish-1 behaviour kept: a page scroll that keeps the trigger visible moves the container and the trigger together, so the trigger stays inside
  the container rect and the menu re-anchors, not closes (`admin-users-actions.spec.ts:78` race). The scroll container is `overflow-x-auto`
  (`admin-users-table.tsx:52`), so the vertical check only matters if the table box ever gets a height cap; at 1440 it is a no-op.

Checks: `npx tsc --noEmit` exit 0; `npx eslint components/admin` exit 0. Not run (by instruction): build, Playwright, server.
For the tester: `admin-users-actions.spec.ts:78` x5 (race must stay green); manual/optional: at a narrow width scroll the table box sideways with the
menu open and confirm it closes once the "..." button is clipped.

**Status:** DONE
**Summary:** The row menu now also closes when its trigger is no longer fully inside the `admin-table-scroll` box (sideways or vertical), alongside the existing off-viewport close; page scroll that keeps the trigger visible still re-anchors. tsc and eslint are clean.
**Concerns/Blockers:** none beyond not being E2E-verified here; the check is strict containment (a partially clipped button closes the menu), with 1px slack.
