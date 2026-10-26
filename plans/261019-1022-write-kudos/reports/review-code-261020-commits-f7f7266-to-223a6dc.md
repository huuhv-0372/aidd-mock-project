# Review: f7f7266 · ba028d0 · 8ce5ff8 · 223a6dc (Viết Kudo #12)

Ngày 2026-10-20. `tkm:review-code` mức medium, 4 reviewer song song (SQL/actions/ảnh/docs · UI · unit test · E2E).
Mọi finding Accept dưới đây đều đã được controller kiểm lại bằng code hoặc chạy thật.

## Bằng chứng chạy lại (2026-10-20)

| Lệnh | Kết quả |
|---|---|
| `npm run lint` | exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npx vitest run` | 37 file, 501/501 pass |
| `npm run test:e2e` (build + 183 test) | **181 pass, 2 fail**, 17.0 phút (máy đang tải) |
| `write-kudo.spec.ts:263 --repeat-each=5` (máy rảnh) | **3 fail / 2 pass** |
| `countdown-prelaunch-gate.spec.ts:115 --repeat-each=5` | 5/5 pass, flaky do tải, không thuộc 4 commit này |
| Đo `kudoPlainText("[".repeat(20000))` | 2.1 s; qua `writeKudoSchema` 5.5 s (refine vẫn chạy dù `.max(5000)` fail) |
| Serializer: bold + hardBreak + bold | `"**a\nb**"`, plain text vẫn còn `**` |
| Validator link | `[a [b] c](javascript:x)`, `<javascript:alert(1)>`, `[x][1]` + `[1]: javascript:…` đều **lọt** |

Kết luận: verdict SEALED 9 trong `evidence/inspection-verdict.json` (183/183) không còn đúng với code hiện tại.

## Accept: phải sửa

| # | Mức | Vị trí | Vấn đề | Cách sửa |
|---|---|---|---|---|
| A1 | High | `lib/kudos/kudo-plain-text.ts:34-36`, `lib/validation/write-kudo.ts:46-49` | Regex `\[([^\]]*)\]\(…` chạy bậc hai. zod 4 vẫn chạy refine khi chuỗi đã vượt `.max`, và bước này nằm **trước** `getClaims()` (`create-kudo-action.ts:88`). Khách chưa đăng nhập gửi body tới 26 MB là đốt được CPU. Nội dung 5000 `[` lưu được, rồi mỗi lần render card tốn khoảng 0.1–0.6 s. | `.max(KUDO_CONTENT_MAX, { abort: true })` hoặc kiểm độ dài đầu refine; giới hạn nhãn `[^\]\n]{0,200}`; cắt input card; thêm unit test giới hạn thời gian. |
| A2 | High | `tests/e2e/write-kudo.spec.ts:263-272` | Test fail lặp lại được (3/5 khi máy rảnh). `blurTo` là một lần click và phải xong trong debounce 150 ms (`recipient-picker.tsx:22`), nếu không thì request đã đi. App đúng (list không hiện lại), assertion `toHaveLength(0)` sai. | Giữ RPC tìm kiếm bằng delay của fake hoặc `page.clock`, hoặc chỉ assert "không có list/no-result hiện ra". |
| A3 | Medium | `lib/kudos/kudo-content-markdown.ts:35-38, 102` | Mark trải qua hardBreak (Shift+Enter khi đang bold) sinh `**a\nb**`, board hiện dấu `**`. | Đóng/mở lại delimiter quanh `\n`, kèm unit test hồi quy. |
| A4 | Medium | `lib/kudos/create-kudo-action.ts:135-137, 147` | Mọi lỗi RPC hoặc exception đều xoá ảnh, kể cả lỗi mạng/5xx sau khi transaction đã commit. Kudo khi đó mất ảnh vĩnh viễn. | Chỉ xoá khi `error.code === "22023"` (lỗi chắc chắn bị từ chối); các trường hợp mơ hồ để lại cho đợt dọn orphan. |
| A5 | Medium | `components/site-shell/use-dismissable.ts:19-20` | Esc khi dropdown hashtag mở mà focus đang ở nút trigger (list rỗng, hoặc Shift+Tab): dropdown đóng **và** dialog nhận `cancel`, modal đóng, mất cả form. | `preventDefault()` trong nhánh Escape (hoặc gắn listener vào root của picker). |
| A6 | Medium | `components/kudos-compose/use-write-kudo-form.ts:46` | `getHashtagOptions()` không có `.catch`; lỗi thì `[]`, dropdown rỗng, Gửi khoá mãi mà không có lời giải thích. | `.catch` kèm dòng lỗi + thử lại; nạp catalog một lần ở provider. |
| A7 | Medium | `components/kudos-compose/use-write-kudo-form.ts:89-90` | Chỉ map `fields.images`. Nội dung > 5000 (Markdown dài hơn chữ hiển thị) chỉ báo "Không gửi được…", thử lại lần nào cũng fail. Editor không có giới hạn. | Bộ đếm/giới hạn cho nội dung; map `fields.content/title/...` sang lỗi từng ô. |
| A8 | Medium | `tests/e2e/support/write-kudo-fixtures.mjs:24-26, 61-74` | Fake không đưa người gọi vào danh sách tìm (`viewer` bị lọc, `SELF` không searchable). Các test "never include the signed-in user" (`write-kudo.spec.ts:140-145`, `:209`, `:334`) không thể fail. | Thêm hồ sơ `{id: sub, "E2E User"}` vào miền tìm và lọc `id === sub` như SQL `:92, :103`. |
| A9 | Medium | `tests/e2e/write-kudo.spec.ts:606-632` | Gửi 2 ảnh xong không kiểm ảnh trên board (`data-testid="kudo-image"`, `src`). Bộ lọc origin ở tầng đọc mà hỏng thì E2E vẫn xanh. | Assert có 2 `kudo-image` với `src` chứa `{uuid}.jpg`. |
| A10 | Medium | `tests/unit/create-kudo-action.test.ts` (thiếu test) | Nhánh `catch` sau khi upload (`create-kudo-action.ts:147`) chưa có test diệt mutant; claims có `error` hoặc thiếu `sub` (`:101`) cũng chưa; code ≠ 22023 kèm message field (`:138`) cũng chưa. | Thêm 3 case: `rpc` reject → `remove` được gọi; `{claims:{}}`; `{code:"XX000", message:"invalid_title"}` → server. |
| A11 | Medium | `tests/unit/write-kudo-validation.test.ts:70-76` | Validator link chỉ có 2 case âm. Mutant bỏ `^` ở `HTTP_URL` (`write-kudo.ts:32`) và bỏ `mention &&` (`:40`) đều sống sót. | Thêm `[x](javascript:void//http://a.com)`, `[An](uuid)` không có `@`, `![x](javascript:…)`, `//evil.com`. |
| A12 | Low | `tests/unit/write-kudo-validation.test.ts:96-107` | Schema chỉ test 5 MB + 1, chưa test đúng 5 MB (mutant `>` → `>=` ở `write-kudo.ts:57` sống sót). | Thêm `File` dài đúng `KUDO_IMAGE_MAX_BYTES`. |
| A13 | Low | `tests/e2e/write-kudo.spec.ts:443` | `getByText(/Tối đa 5/)` khớp chú thích tĩnh (`messages/vi/kudos-compose.ts:91`), luôn hiện. | Xoá dòng này; các assertion `aria-disabled` phía sau đã đủ. |
| A14 | Low | `lib/kudos/create-kudo-action.ts:138` | `RPC_FIELD_BY_CODE[error.message]` tra trên object thường (`"constructor"` khớp prototype). | `Object.hasOwn`, như `kudo-image-file.ts:58`. |

## Defer: ghi vào "Deferred" của plan, không chặn

- **Validator lọt link `javascript:`** (nested brackets, autolink `<…>`, reference-style). Hiện không khai thác được vì board render plain text (gắn với L3). Nhưng docs/plan ghi "zod chặn link sai kể cả khi client giả mạo" là **sai**: sửa câu chữ ngay, sửa validator trước khi có renderer Markdown.
- `next.config.ts:7-10`: giới hạn body 26 MB áp cho mọi route, kể cả khách. Nên chặn bằng rule Cloudflare.
- `create_kudo` chưa giới hạn tần suất theo người gửi (gọi thẳng PostgREST).
- Upload thẳng vào `kudo-images` bỏ qua bước xoá metadata và tên phẳng. Docs nên ghi rõ đây là bảo vệ "best-effort, chỉ qua UI".
- `kudos_search_sunners` có thể dùng để dò email từng ký tự (khớp chuỗi con). Nên chỉ khớp email khi query có `@`.
- Strip JPEG theo deny-list (APP3–10, APP12 vẫn giữ). Nên dùng allow-list hoặc sửa câu chữ docs.
- Chưa có job dọn ảnh orphan.
- UI: kéo chọn chữ rồi thả ra ngoài nền thì modal đóng; list `@` thiếu combobox ARIA; dòng active không tự cuộn vào khung; chưa chống gửi trùng (idempotency key); ảnh vượt 5 bị bỏ không báo; không khoá cuộn nền.
- Test: fake chưa allow-list tên tham số RPC (`p_limit` chưa được assert); chưa click "+ Image" (file chooser); retry sau lỗi chưa chứng minh (`failRpc` dính mãi); chưa test chống double-send bằng Esc/backdrop khi đang gửi; Markdown italic/strike/list/link chưa kiểm tới RPC; chưa có test mobile/EN; fixture ảnh đều tự dựng (không có ảnh thật); `write-kudo.spec.ts` 775 dòng nên tách ~6 file; header "Expected RED" đã cũ.

## Reject

Không có. Mọi finding đã kiểm đều đúng với code. `countdown-prelaunch-gate:115` fail do tải, không thuộc phạm vi review.

## Làm tốt

- SQL: `security definer` + `search_path=''`, sender lấy từ `auth.uid()`, revoke `anon`/`public`, escape LIKE đúng, ownership qua `owner_id`, tên ảnh phẳng chống lộ người gửi ẩn danh; rollback chạy lại được.
- Action: zod → `getClaims()` → sniff magic bytes; đọc từng ảnh một; lỗi trả về client là thông điệp chung.
- Strippers: kiểm biên chặt, fuzz 600k đầu vào không exception, không treo.
- Unit test: chỉ mock Supabase, so byte chính xác, kiểm thứ tự gọi (`getClaims` trước `arrayBuffer`), contract `p_*` khớp SQL.
- E2E: state của fake tách theo `sub`; kiểm payload RPC, đường dẫn upload, cleanup và lỗi chung; dùng log để chứng minh những hành vi UI không nhìn thấy được.
- UI: chặn race của lượt tìm, revoke object URL, reset form khi đóng, Tiptap chỉ nạp qua `next/dynamic`, mọi file < 200 dòng.

## Thứ tự sửa

A1 → A2 → A4 → A3 → A5/A6/A7 → A8/A9 → A10–A14. Sau khi sửa: chạy lại unit + toàn bộ E2E (`write-kudo.spec.ts --repeat-each=5`), rồi chạy lại evidence gate.
