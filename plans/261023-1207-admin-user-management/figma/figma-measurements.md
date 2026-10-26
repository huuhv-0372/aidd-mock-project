# Figma measurements — Admin - User (`773:26403`, fileKey `9ypp4enmFmdK3YAFJLIu6C`)

Pulled by the controller on 2026-10-23 through the Figma MCP before the View-seat quota ran out.
Authoritative where it overlaps the png; anything not listed here is measured from
`admin-user-773-26403.png` (1440 x 1777, 1x).

## Frame geometry (`get_design_context` sparse metadata, frame-relative px)

| Node | Name | x | y | w | h |
|------|------|---|---|---|---|
| 773:26403 | Admin - User (frame) | 0 | 0 | 1440 | 1777 |
| 773:26405 | Header - Admin (instance) | 0 | 0 | 1440 | 88 |
| 773:26404 | Bìa (cover frame, behind content; not visible in the png = page background) | 0 | 78 | 1440 | 280 |
| 773:26406 | Content column | 80 | 112 | 1280 | 1535 |
| 773:26407 | Title (row with "User" + Export) | 80 | 112 | 1280 | 52 |
| 773:26408 | Filter row | 80 | 180 | 1280 | 74 |
| 773:26411 | Filter Unit (label + field) | 80 | 180 | 259 | 74 |
| 773:26412 | Filter Level | 355 | 180 | 136 | 74 |
| 773:26410 | Filter Role | 507 | 180 | 123 | 74 |
| 773:26413 | Search (field only, no label) | 1101 | 206 | 259 | 48 |
| 773:27567 | Table - User | 80 | 270 | 1280 | 1377 |
| 773:27568 | Table header row | — | — | 1280 | 65 |
| 773:27679… | ROW - User | — | — | 1280 | 85 (3 text lines) / 73 (2 lines) |
| 773:26441 | 7_Footer | 0 | 1729 | 1440 | 48 |

Gaps: title → filters 16; filters → table 16; filter-to-filter 16; field height 48 (74 − label 26).
Table bottom 1647 → footer 1729.

## Column widths (header cells, left → right, sum 1280)

ID 60 · User 120 · Email 141 (flex: takes the remainder) · ∑ sent Kudos 126 · ∑ Received Kudos 126 ·
Total Heart 84 · Level 81 · Number of Badges 116 · Time to get 6 Badges 126 · Last Logged in 116 ·
Role 104 · Actions 80.

## Header cell (`Table-Cell/Header`, high-fidelity)

- Background `#00101A` (token `details/background`), bottom border 1px `#2E3940` (`details/divider`).
- Padding 12px left/right, 12px top, 13px bottom; gap 4px.
- Text: Montserrat Medium 14/20, letter-spacing 0.1px, white (`details/text-secondary-1`), nowrap,
  two-line labels break exactly as: "∑ sent / Kudos (100)", "∑ Received / Kudos (100)",
  "Total / Heart", "Number / of Badges", "Time to get / 6 Badges", "Last / Logged in".
  ID label centred; Role cell content centred; others left.
- Sortable cells: label + 8px gap + sorter 11px wide holding caret-up (centre −3.5px) and caret-down
  (centre +4.5px), each 11x11, fill `#D9D9D9` → `caret-up.svg`, `caret-down.svg` in this folder.
- Each cell has a vertical divider at its left edge: 1px `#2E3940`, 22px tall, vertically centred
  (`divider.svg` is the 22x1 line before rotation).
- Sortable: sent, received, Total Heart, Level, Number of Badges, Time to get 6 Badges, Last Logged in.
  Not sortable: ID, User, Email, Role, Actions.

## Not retrieved (quota)

Header - Admin, Title/Export button, Filter fields, ROW - User cells, Footer: measure from the png.
Reuse the existing header pieces (logo, LanguageSelector, NotificationButton, AccountMenu) and their
tokens from `components/site-shell/*` and `app/globals.css` before inventing values.
