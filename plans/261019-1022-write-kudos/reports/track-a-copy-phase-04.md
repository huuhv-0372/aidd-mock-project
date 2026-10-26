# Track A copy (phase 04) — VI strings for phase 06 (messages/vi, messages/en)

Source: MoMorph `Sv7DFwBw1h` (widget menu) and `b1Filzi9i6` (Thể lệ UPDATE), text nodes verbatim.

## WidgetCopy (`components/site-shell/widget-button.tsx`, type `WidgetCopy`)

| key | VI | node |
|---|---|---|
| `rules` | Thể lệ | I313:9140;214:3799;186:1568 |
| `writeKudo` | Viết KUDOS | I313:9140;214:3732;186:1568 |
| `close` | Đóng | not in the menu frame (red ✕ has no label); reuses the panel's "Đóng" (I3204:6093;186:2760) as the aria-label |

`label` (closed button name) stays the existing `dict.shell.widgetLabel`.

## KudosRulesDialogCopy (`kudos-rules-dialog.tsx`, type `KudosRulesDialogCopy`)

| key | VI | node |
|---|---|---|
| `close` | Đóng | I3204:6093;186:2760 |
| `writeKudo` | Viết KUDOS | I3204:6094;186:1568 |

## KudosRulesCopy (`kudos-rules-content.tsx`, type `KudosRulesCopy`)

| key | VI | node |
|---|---|---|
| `title` | Thể lệ | 3204:6055 |
| `receiverHeading` | NGƯỜI NHẬN KUDOS: HUY HIỆU HERO CHO NHỮNG ẢNH HƯỞNG TÍCH CỰC | 3204:6132 |
| `receiverIntro` | Dựa trên số lượng đồng đội gửi trao Kudos, bạn sẽ sở hữu Huy hiệu Hero tương ứng, được hiển thị trực tiếp cạnh tên profile | 3204:6133 |
| `heroes[0].label` | New Hero | I3204:6163;3007:17508 |
| `heroes[0].range` | Có 1-4 người gửi Kudos cho bạn | 3204:6162 |
| `heroes[0].description` | Hành trình lan tỏa điều tốt đẹp bắt đầu – những lời cảm ơn và ghi nhận đầu tiên đã tìm đến bạn. | 3204:6168 |
| `heroes[1].label` | Rising Hero | I3204:6172;3007:17511 |
| `heroes[1].range` | Có 5-9 người gửi Kudos cho bạn | 3204:6171 |
| `heroes[1].description` | Hình ảnh bạn đang lớn dần trong trái tim đồng đội bằng sự tử tế và cống hiến của mình. | 3204:6173 |
| `heroes[2].label` | Super Hero | I3204:6181;3007:17514 |
| `heroes[2].range` | Có 10–20 người gửi Kudos cho bạn | 3204:6180 (en dash) |
| `heroes[2].description` | Bạn đã trở thành biểu tượng được tin tưởng và yêu quý, người luôn sẵn sàng hỗ trợ và được nhiều đồng đội nhớ đến. | 3204:6182 (Figma has a hard line break after "quý,"; use a plain space, the panel wraps by width) |
| `heroes[3].label` | Legend Hero | I3204:6190;3007:17519 |
| `heroes[3].range` | Có hơn 20 người gửi Kudos cho bạn | 3204:6189 |
| `heroes[3].description` | Bạn đã trở thành huyền thoại – người để lại dấu ấn khó quên trong tập thể bằng trái tim và hành động của mình. | 3204:6191 (en dash) |
| `senderHeading` | NGƯỜI GỬI KUDOS: SƯU TẬP TRỌN BỘ 6 ICON, NHẬN NGAY PHẦN QUÀ BÍ ẨN | 3204:6077 |
| `senderIntro` | Mỗi lời Kudos bạn gửi sẽ được đăng tải trên hệ thống và nhận về những lượt ❤️ từ cộng đồng Sunner. Cứ mỗi 5 lượt ❤️, bạn sẽ được mở 1 Secret Box, với cơ hội nhận về một trong 6 icon độc quyền của SAA. | 3204:6078 |
| `badgeNames[0]` | REVIVAL | I3204:6082;737:20342 |
| `badgeNames[1]` | TOUCH OF LIGHT | I3204:6087;737:20365 |
| `badgeNames[2]` | STAY GOLD | I3204:6086;737:20358 |
| `badgeNames[3]` | FLOW TO HORIZON | I3204:6083;737:20664 |
| `badgeNames[4]` | BEYOND THE BOUNDARY | I3204:6084;737:20352 |
| `badgeNames[5]` | ROOT FURTHER | I3204:6088;737:20392 (node name says "FUTHER", the text is "ROOT FURTHER") |
| `giftNote` | Những Sunner thu thập trọn bộ 6 icon sẽ nhận về một phần quà bí ẩn từ SAA 2025. | 3204:6089 |
| `nationalHeading` | KUDOS QUỐC DÂN | 3204:6090 |
| `nationalBody` | 5 Kudos nhận về nhiều ❤️ nhất toàn Sun* sẽ chính thức trở thành Kudos Quốc Dân và được trao phần quà đặc biệt từ SAA 2025: Root Further. | 3204:6091 |

Arrays are fixed tuples: `heroes` = New, Rising, Super, Legend; `badgeNames` = the grid order Revival, Touch of Light, Stay Gold, Flow to Horizon, Beyond the Boundary, Root Further (the six PNGs under `public/images/kudos/rules/` follow the same order via a slug table in the component).
The `Rising/Super/Legend` pills are the `hero-*.png` artwork (text is baked in); `heroes[i].label` is the visible text of the CSS "New Hero" pill and the `alt` of the other three.
