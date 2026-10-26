# Track A copy (phase 05) — Viết Kudo modal + Add link

Type: `WriteKudoCopy` / `AddLinkCopy` in `components/kudos-compose/write-kudo-copy.ts`. Phase 06 supplies one object per locale (this file lists the VI values; EN from `list_file_localizations`, unknown strings translated and logged in `en-localizations.md`).

Source column: **Figma** = verbatim from MoMorph node text (`ihQ26W78P2` / `p9zO-c4a4x` / `OyDLDuSGEa`); **Contract** = fixed by the read-only E2E contract (`kudos-contract.ts`, `write-kudo.spec.ts`); **Added** = not in Figma or the contract, written by this phase (UI chrome only), needs a content owner's OK.

## WriteKudoCopy (vi)

| Key | VI value | Source |
|---|---|---|
| `title` | Gửi lời cám ơn và ghi nhận đến đồng đội | Figma mm:I520:11647;520:9870 (also dialog name in Contract) |
| `required` | Không được để trống | Contract (`REQUIRED_MSG`) |
| `recipient.label` | Người nhận | Figma 520:9872;416:5534 |
| `recipient.placeholder` | Tìm kiếm | Figma 520:9873;186:2760 |
| `recipient.listLabel` | Danh sách người nhận | Added (a11y name of the listbox) |
| `kudoTitle.label` | Danh hiệu | Figma 1688:10436;416:5534 |
| `kudoTitle.placeholder` | Dành tặng một danh hiệu cho đồng đội | Figma 1688:10437;186:2760 |
| `kudoTitle.hint` | Ví dụ: Người truyền động lực cho tôi.⏎Danh hiệu sẽ hiển thị làm tiêu đề Kudos của bạn. (two lines, `\n`) | Figma 1688:10447 |
| `toolbar.bold` | In đậm | Contract |
| `toolbar.italic` | In nghiêng | Contract |
| `toolbar.strike` | Gạch ngang | Contract |
| `toolbar.orderedList` | Danh sách đánh số | Contract |
| `toolbar.link` | Chèn liên kết | Contract |
| `toolbar.quote` | Trích dẫn | Contract |
| `toolbar.standards` | Tiêu chuẩn cộng đồng | Figma 3053:11621 |
| `editor.label` | Nội dung lời cám ơn | Added (a11y name of the contenteditable) |
| `editor.placeholder` | Hãy gửi gắm lời cám ơn và ghi nhận đến đồng đội tại đây nhé! | Figma 520:9886;186:2760 (Figma has a trailing space; the Contract attribute has none, so none here) |
| `editor.mentionHint` | Bạn có thể “@ + tên” để nhắc tới đồng nghiệp khác | Figma 520:9888 |
| `editor.mentionListLabel` | Gợi ý đồng nghiệp | Added (a11y) |
| `hashtag.label` | Hashtag | Figma 520:9891;416:5534 |
| `hashtag.add` | + Hashtag | Contract (accessible name of the button; visible text is `hashtag.label` + `hashtag.max` + a plus icon, as in Figma 662:8911) |
| `hashtag.max` | Tối đa 5 | Figma 662:8911;186:2760 (second line) |
| `hashtag.listLabel` | Danh sách hashtag | Added (a11y) |
| `hashtag.remove` | Xóa hashtag | Added (chip x; Contract: name matches /Xóa/, full name is `Xóa hashtag {name}`) |
| `image.label` | Image | Figma 520:9897;416:5534 |
| `image.add` | + Image | Contract |
| `image.max` | Tối đa 5 | Figma 662:9133;186:2760 |
| `image.remove` | Xóa ảnh | Contract (/Xóa ảnh/; full name `Xóa ảnh {n}`) |
| `anonymous.label` | Gửi lời cám ơn và ghi nhận ẩn danh | Figma 520:14099;520:14095 |
| `anonymous.aliasLabel` | Tên ẩn danh | Contract (name of the alias textbox; also its placeholder, Figma has no frame for it) |
| `actions.cancel` | Hủy | Figma 520:9906;186:2760 |
| `actions.send` | Gửi | Figma 520:9907;186:1568 |
| `errors.imageFormat` | Định dạng file không hợp lệ | Added (Contract: must match /định dạng/i; test-case text "Hiển thị thông báo lỗi định dạng file không hợp lệ") |
| `errors.imageSize` | Ảnh tối đa 5 MB | Added |
| `errors.sendFailed` | Không gửi được lời cám ơn, vui lòng thử lại. | Added (one generic line, never the server message) |

## AddLinkCopy (vi)

| Key | VI value | Source |
|---|---|---|
| `title` | Add link | Contract (heading + dialog name, exact) and spec A_Title |
| `textLabel` | Text | Contract (textbox name, exact) and spec B.1 |
| `linkLabel` | Link | Contract (textbox name, exact) and spec C.1 |
| `cancel` | Hủy | Figma 1002:12544 |
| `save` | Lưu | Figma 1002:12545 |
| `errors.required` | Không được để trống | Added (same wording as the modal) |
| `errors.textTooLong` | Tối đa 100 ký tự | Added |
| `errors.linkTooShort` | Tối thiểu 5 ký tự | Added |
| `errors.linkTooLong` | Tối đa 2048 ký tự | Added |
| `errors.linkInvalid` | Link không hợp lệ (chỉ nhận http hoặc https) | Added |

**Discrepancy to settle (not mine to decide):** the MoMorph image/text of frame `OyDLDuSGEa` reads "Thêm đường dẫn" (title), "Nội dung" (Text label), "URL" (Link label), while the spec CSV names them 'Add link' / 'Text' / 'Link' and the E2E contract needs `Add link`, `Text`, `Link` as exact accessible names. The code follows the contract/spec; if the owner wants the Figma wording, the contract and the six Add link tests must change first.

## Values guessed (no Figma image: frames `5c7PkAibyD`, `p9vFVBE_tc`, `QIMJNgFb8K`; or no node)

Re-measure these when the images exist:
- Error state: red `#CF1322` (the asterisk red) for the field border (1px + 1px ring), the error line (14px/20px bold) placed under the field. Title: the error replaces the grey hint (hint kept invisible so nothing moves). Errors are taken out of the flow on purpose (absolute, in the 24-32px gap) so an error appearing on blur never shifts the control being clicked.
- Anonymous alias field: same 56px white field as the other inputs, placeholder = "Tên ẩn danh", under the checkbox row.
- Recipient dropdown rows + the "@" mention list: the hashtag dropdown look (#00070C panel, 1px #998C5F border, 6px padding, rows 44px min, white bold 16px, hover/active gold 10-20%); no avatar (only the name is shown).
- Hashtag chip (selected tag): white pill, 1px #998C5F border, `#name` + red 20px round x (Figma has no chip frame).
- Check mark of a selected hashtag row: Material filled check-circle (Figma node 1002:13201 exports no asset).
- Toolbar pressed state: gold `#FFEA9E` fill; hover gold 40%.
- Gửi disabled: same gold at 60% opacity (Figma frame only shows the default look).
- Editor body text is medium weight (500) so bold stays visible; Figma uses 700 everywhere.
- Mention chip in the editor: bold, gold 60% background.

## Integration notes for phase 06

- `WriteKudoDialog` (named + default export) props: `{ open, onClose, onSent(id), locale: "vi" | "en", copy: WriteKudoCopy, actions: { searchSunners, getHashtagOptions, createKudo }, serializeContent }`. On success it calls `onSent(id)` then `onClose()`.
- `serializeContent`: `lib/kudos/kudo-content-markdown.ts` exports `kudoEditorJsonToMarkdown(doc: KudoEditorNode)` (not `toMarkdown`): pass `(doc) => kudoEditorJsonToMarkdown(doc as KudoEditorNode)`.
- FormData sent to `createKudo` (matches `readForm` in `lib/kudos/create-kudo-action.ts`): `recipientId`, `title` (trimmed), `content` (Markdown), `hashtags` (repeated catalog slug), `isAnonymous` ("true" | "false"), `anonymousName` (only when anonymous and not blank), `images` (repeated `File`, file order).
- The dialog mounts its form only while `open`, so each open starts empty; keep it under `next/dynamic(..., { ssr: false })` or mount it on demand.
- Hủy is disabled and Esc / backdrop clicks are ignored while a send is in flight.
