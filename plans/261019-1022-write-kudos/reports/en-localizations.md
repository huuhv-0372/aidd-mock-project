# EN localizations not from Figma — Write Kudos

File: `messages/en/kudos-compose.ts` (keys under `kudosCompose`). Source for the rest of the English text:
`list_file_localizations`, fileKey `9ypp4enmFmdK3YAFJLIu6C` (queried 2026-10-19). Every string below is our own
translation (or a fix of a Figma localization) and waits for the organizers' review, like the Live board strings in
`plans/261015-1010-sun-kudos-live-board/reports/en-localizations.md`. VI source: `track-a-copy-phase-04.md` / `-05.md`.

## Differences from the Figma localization

| Key | VI | EN used | Figma EN | Why |
|---|---|---|---|---|
| `rules.giftNote` | Những Sunner thu thập trọn bộ 6 icon… | Sunners who collect all 6 icons will receive a mysterious gift from SAA 2025. | "Sunnercollecting all 6 icons will receive…" | Typo in the localization (missing words). |
| `rules.nationalHeading` | KUDOS QUỐC DÂN | NATIONAL KUDOS | "NATION KUDOS" | The body text of the same panel says "National Kudos". |
| `write.addLink.title` | Thêm đường dẫn (Figma) | Add link | "Add path" | Spec CSV and E2E contract name the dialog "Add link". |
| `write.addLink.textLabel` | Nội dung (Figma) | Text | "Content" | Spec CSV (B.1) "Text". |
| `write.addLink.linkLabel` | URL (Figma) | Link | "URL" | Spec CSV (C.1) "Link". |

## Not in Figma (our translation)

| Key | VI | EN |
|---|---|---|
| `widget.rules` | Thể lệ | Rules |
| `widget.close` / `rulesDialog.close` | Đóng | Close |
| `rules.heroes[2].description` | Bạn đã trở thành biểu tượng được tin tưởng và yêu quý, người luôn sẵn sàng hỗ trợ và được nhiều đồng đội nhớ đến. | You have become a trusted and beloved icon, always ready to help and remembered by many teammates. |
| `write.required` / `addLink.errors.required` | Không được để trống | This field cannot be empty |
| `write.recipient.listLabel` | Danh sách người nhận | Recipient list |
| `write.recipient.noResult` | Không tìm thấy Sunner phù hợp | No matching Sunner found |
| `write.recipient.pickFromList` | Hãy chọn người nhận trong danh sách gợi ý | Please choose a recipient from the suggestions |
| `write.kudoTitle.hint` | Ví dụ: Người truyền động lực cho tôi.⏎Danh hiệu sẽ hiển thị làm tiêu đề Kudos của bạn. | e.g. The person who motivates me.⏎The title will be shown as your Kudos headline. |
| `write.toolbar.bold` | In đậm | Bold |
| `write.toolbar.italic` | In nghiêng | Italic |
| `write.toolbar.strike` | Gạch ngang | Strikethrough |
| `write.toolbar.orderedList` | Danh sách đánh số | Numbered list |
| `write.toolbar.link` | Chèn liên kết | Insert link |
| `write.toolbar.quote` | Trích dẫn | Quote |
| `write.editor.label` | Nội dung lời cám ơn | Kudos message |
| `write.editor.mentionListLabel` | Gợi ý đồng nghiệp | Colleague suggestions |
| `write.hashtag.add` | + Hashtag | + Hashtag |
| `write.hashtag.max` / `write.image.max` | Tối đa 5 | Max 5 |
| `write.hashtag.listLabel` | Danh sách hashtag | Hashtag list |
| `write.hashtag.remove` | Xóa hashtag | Remove hashtag |
| `write.image.add` | + Image | + Image |
| `write.image.remove` | Xóa ảnh | Remove image |
| `write.anonymous.aliasLabel` | Tên ẩn danh | Anonymous name |
| `write.errors.imageFormat` | Định dạng file không hợp lệ | Invalid file format |
| `write.errors.imageSize` | Ảnh tối đa 5 MB | Image must be 5 MB or smaller |
| `write.errors.sendFailed` | Không gửi được lời cám ơn, vui lòng thử lại. | Couldn't send your Kudos, please try again. |
| `write.errors.contentTooLong` (phase 08, A7) | Nội dung tối đa 5000 ký tự | Content can be at most 5000 characters |
| `write.errors.invalid` (phase 08, fix round 1) | Giá trị không hợp lệ, vui lòng kiểm tra lại | Invalid value, please check and try again |
| `write.hashtag.loadFailed` (phase 08, A6) | Không tải được danh sách hashtag | Couldn't load hashtags |
| `write.hashtag.retry` (phase 08, A6) | Thử lại | Retry |
| `write.addLink.errors.textTooLong` | Tối đa 100 ký tự | Maximum 100 characters |
| `write.addLink.errors.linkTooShort` | Tối thiểu 5 ký tự | Minimum 5 characters |
| `write.addLink.errors.linkTooLong` | Tối đa 2048 ký tự | Maximum 2048 characters |
| `write.addLink.errors.linkInvalid` | Link không hợp lệ (chỉ nhận http hoặc https) | Invalid link (only http or https) |

## Taken from Figma localizations (no action)

Rules panel title, hero ranges and descriptions (except Super), badge/section headings and bodies, modal title, field labels
and placeholders (Recipient, Title, Search, Hashtag, Image), editor placeholder and mention hint, anonymous checkbox,
Cancel / Send / Save, "Community Standards", "Write KUDOS". Hero names and badge names stay identical in both languages.
