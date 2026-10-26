# EN localizations not from Figma — Sun* Kudos Live board

Lists EN text that is not a Figma localization (`list_file_localizations`, fileKey `9ypp4enmFmdK3YAFJLIu6C`).
Each section belongs to the phase that wrote it; UI-string sections are added by phase 07.

## Catalog names: hashtags and gifts (phase 02, `supabase/migrations/20261015100000_create_kudos.sql`)

Source of the VI names: spec `JWpsISMAaM` (`plans/momorph-specs/dropdown-hashtag-filter-JWpsISMAaM/specs.csv`, item A, 13 hashtags).
`list_file_localizations` returns no entry for any of the 13 names, with or without the `#` prefix.
The Figma dropdown samples show English placeholder labels: `#Dedicated`, `#Inspring` (frame `JWpsISMAaM`) and `#High-perorming` (frame `p9zO-c4a4x`).
Three EN names below follow those labels, with the typos fixed. The rest are our own translations.
To change one later: run `update public.hashtags set name_en = ... where slug = ...`. The migration's `on conflict do nothing` never overwrites it.

| sort | slug | name_vi (Figma) | name_en | Basis |
|---:|---|---|---|---|
| 1 | `well-rounded` | Toàn diện | Well-rounded | translated |
| 2 | `professional` | Giỏi chuyên môn | Professional | translated |
| 3 | `high-performing` | Hiệu suất cao | High-performing | Figma sample `#High-perorming` (typo fixed) |
| 4 | `inspiring` | Truyền cảm hứng | Inspiring | Figma sample `#Inspring` (typo fixed) |
| 5 | `dedicated` | Cống hiến | Dedicated | Figma sample `#Dedicated` |
| 6 | `aim-high` | Aim High | Aim High | already English in Figma |
| 7 | `be-agile` | Be Agile | Be Agile | already English in Figma |
| 8 | `wasshoi` | Wasshoi | Wasshoi | already English in Figma (Japanese loanword) |
| 9 | `goal-oriented` | Hướng mục tiêu | Goal-oriented | translated |
| 10 | `customer-focused` | Hướng khách hàng | Customer-focused | translated |
| 11 | `process-compliant` | Chuẩn quy trình | Process-compliant | translated |
| 12 | `creative-solutions` | Giải pháp sáng tạo | Creative solutions | translated |
| 13 | `excellent-management` | Quản lý xuất sắc | Excellent management | translated |

Slugs are taken from the EN name. The URL filter `?hashtag=<slug>` stays the same in both languages.

| gift name_vi | name_en | Basis |
|---|---|---|
| 1 áo phông SAA | 1 SAA T-shirt | derived from the Figma localization "Nhận được 1 áo phông SAA" → "Received 1 SAA T-shirt" |

The UI adds the prefix "Nhận được" / "Received" (Figma localization above) in front of the gift name.

Departments have no EN text: the codes are the same in both languages (clarifications.md).
Source: node-tree spec of `WXK5AYB_rG`, 50 codes. `database-design.md` estimated about 49.

## UI strings (phase 07, `messages/en/kudos.ts`)

Lookup: `list_file_localizations`, fileKey `9ypp4enmFmdK3YAFJLIu6C`. The lines below had no entry; each is marked `/* not from Figma */` in the file.
Everything else in `messages/en/kudos.ts` is a Figma localization. Proper names are identical in VI and EN (Sun* Kudos, SAA 2025, Sun* Annual Awards 2025, HIGHLIGHT KUDOS, SPOTLIGHT BOARD, ALL KUDOS, Secret Box, New/Rising/Super/Legend Hero).

Figma has VI text but no EN entry (translated by us, keys in `messages/vi/kudos.ts`):

| key | VI | EN |
|---|---|---|
| `*.empty` | Hiện tại chưa có Kudos nào. | There are no Kudos yet. |
| `card.person.anonymous` | Ẩn danh | Anonymous |
| `card.person.heroTips.new.headline` | Có 1–4 người gửi Kudos cho bạn | 1–4 people send you Kudos (pattern of the other three tiers) |
| `card.person.heroTips.super.body` | Bạn đã trở thành biểu tượng được tin tưởng… | You have become a trusted and beloved symbol, always ready to help and remembered by many teammates. |
| `card.person.starTips[0..2]` | Sunner đã nhận được 10 / 20 / 50 Kudos… | This Sunner has received 10 / 20 / 50 Kudos… (3 sentences) |
| `card.hearts.label` | {count} lượt thả tim | {count} likes ("likes" as in the Figma label "Number of likes you received") |
| `spotlight.panZoomLabel` | Pan/Zoom | Pan/Zoom |
| `spotlight.tickerSuffix` | đã nhận được một Kudos mới | received a new Kudos |
| `allKudos.gifts.title` | 10 SUNNER NHẬN QUÀ\nMỚI NHẤT | 10 LATEST GIFT\nRECIPIENTS |
| `allKudos.gifts.empty` | Chưa có dữ liệu | No data yet |

Not in Figma at all (VI also ours): `highlight.filters.hashtagList/departmentList`, `highlight.carousel.*`, `highlight.error`,
`spotlight.noResults/loadError`, `allKudos.error`, `allKudos.feed.*`, `allKudos.card.gallery.*`, `allKudos.stats.error`,
`allKudos.gifts.listLabel/error`.

Kept identical in both languages: toast "Link copied — ready to share!" (Figma text is already English), `Copy Link`, the `KUDOS` unit, `Sunner`.
`gifts.receivedPrefix` "Received" is the Figma localization of "Nhận được". The KV title follows Figma node 2940:13439: VI "Hệ thống ghi nhận và cảm ơn", EN "The system records and thanks".
