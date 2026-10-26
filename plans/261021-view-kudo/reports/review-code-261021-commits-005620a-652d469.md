# Review: 005620a · 652d469 (View Kudo)

Ngày 2026-10-21. `tkm:review-code` mức medium, 4 reviewer song song: auth/SQL (strong) · renderer/UI · unit test · E2E.
Mọi finding Accept đều được controller kiểm lại bằng code hoặc chạy thật.

## Bằng chứng chạy lại (HEAD 652d469, nhánh `feature.new.view_kudos`)

| Lệnh | Kết quả |
|---|---|
| `npm run lint` · `npx tsc --noEmit` | exit 0 · exit 0 |
| `npx vitest run` | 46 file, 725/725 |
| `npm run test:e2e` (build + toàn bộ) | 245/245, 7.1 phút |
| `kudo-detail.spec.ts --repeat-each=5` | 80/80 |
| Thử `parseKudoContent` | `"2025."` thành `list` rỗng (mất chữ); `Nhờ @[Sun](https://…)` thành mention, mất link; 5000 ký tự link không hợp lệ mất 42 ms, link hợp lệ 2 ms |
| Reviewer unit test | khoảng 90 mutant trên allow-list `next`, callback, cookie, `kudo_detail` và scheme link: đều bị test bắt |

Kết luận: không có lỗi Critical. Không lỗ hổng open redirect, XSS hay ReDoS; quy tắc ẩn danh của `kudo_detail` giống board. Các lỗi còn lại nằm ở độ trung thực của renderer, a11y, docs, và test E2E/unit không thể fail ở một số chỗ.

## Accept: phải sửa

| # | Mức | Vị trí | Vấn đề | Cách sửa |
|---|---|---|---|---|
| B1 | Medium | `lib/kudos/kudo-content-blocks.ts:51-58` | `safeHref` gọi `new URL()` rồi bắt exception cho từng link không phải http(s). 5000 ký tự `[a](x)` tốn 42 ms parse (khoảng 20 lần link hợp lệ), render tới 180 ms, và người xem nào cũng phải trả chi phí này. `[a](https://:)` lọt validator nên đi qua app được. | Kiểm `URL.canParse(raw)` trước khi tạo `URL`. |
| B2 | Medium | `lib/kudos/kudo-content-blocks.ts:40-41`, `lib/kudos/kudo-content-markdown.ts:20` | Chữ thường bắt đầu dòng bằng `N.` hoặc `> ` bị đọc thành list hoặc quote. Dòng chỉ có `2025.` thành list rỗng và mất chữ. Board hiện khác trang chi tiết. | Serializer escape `N.` và `>` ở đầu dòng; parser và `stripLine` hiểu escape đó; list item rỗng giữ nguyên văn bản. |
| B3 | Medium | `lib/kudos/kudo-content-blocks.ts:42` | `@` đứng ngay trước link (`@[Sun](https://…)`, serializer sinh ra hợp lệ) bị hiện thành mention, mất link. | Chỉ coi là mention khi target có dạng uuid (như `pgUuid` của validator); còn lại đọc `@` là chữ, `[` mở link. |
| B4 | Medium | `components/kudos/kudo-detail-card.tsx:17-18`, `kudo-detail-close-button.tsx`, `kudo-post-card.tsx` | Viền focus `#ffea9e` trên nền thẻ `#fff8e1` có tương phản khoảng 1.13:1, người dùng bàn phím gần như không thấy. | Dùng viền tối (ví dụ `outline-login-bg`) trên nền kem. |
| B5 | Medium | `docs/project-changelog.md:17` | Cùng một mục changelog vừa ghi "verify 6/6 PASS trên Supabase thật" vừa ghi "SQL chưa ghi nhận đã chạy". | Xoá dòng cũ; lưu output verify vào `reports/db-verify-result.md` và link tới đó. |
| T1 | High (test) | `tests/e2e/support/kudos-fixtures.mjs:140`, `tests/e2e/kudo-detail.spec.ts:104-106` | Payload `[mở ngay](javascript:alert(1))` có `(` trong target nên regex LINK không khớp, test không bao giờ chạm `safeHref`. Bỏ kiểm scheme thì E2E vẫn xanh. | Thêm payload không có ngoặc (`javascript:alert%281%29`, `JaVaScRiPt:x`, `data:…`, `vbscript:x`) và một dòng HTML thô; assert không có `<a>` nào, nhãn hiện dạng chữ. |
| T2 | High (test) | `tests/e2e/support/kudos-fixtures.mjs:301-305` | Fake `kudo_detail` nhận mọi `p_id` và so sánh phân biệt hoa thường. PostgREST thật trả 22P02 cho id sai dạng, còn uuid thì không phân biệt hoa thường. Bỏ bước kiểm id ở app thì E2E vẫn xanh. | Fake trả 400/22P02 khi `p_id` không có dạng guid, so sánh không phân biệt hoa thường; thêm test id viết hoa và assert nội dung trang 404 khi id sai dạng. |
| T3 | High (test) | `tests/e2e/kudo-detail.spec.ts:122-145` | Cả 3 test nút Đóng đều đi từ `/sun-kudos` rồi về `/sun-kudos`, nên không phân biệt được "quay lại" với "push /sun-kudos". | Mở board kèm `?hashtag=…`, vào chi tiết, bấm Đóng, kỳ vọng còn bộ lọc; thêm ca trang trước khác origin thì về `/sun-kudos`. |
| T4 | High (test) | `tests/e2e/kudo-detail.spec.ts:157-166` | E2E chỉ phủ việc proxy chuyển hướng và ô ẩn `next`. Người đã đăng nhập mở `/login?next=…` (nơi thực sự chuyển hướng) không có E2E. | Đăng nhập rồi `goto /login?next=/sun-kudos/<id>` thì tới Kudo. Các biến thể `//evil.com`, `/\evil.com`, `%2F%2F…`, `https://evil`, `…/../x`, `?x=1` thì về `/` cùng origin. Bắt redirect authorize để assert thuộc tính cookie và `redirect_to` không chứa `next`. |
| T5 | High (test) | `tests/e2e/kudo-detail.spec.ts` (thiếu test), `tests/e2e/support/kudos-fixtures.mjs:202` | Chưa có test mở trang chi tiết của Kudo ẩn danh. Nếu thẻ render `kudo.sender` không điều kiện thì E2E vẫn xanh. | Mở Kudo ẩn danh: chỉ hiện biệt danh, tên và id người gửi không có trong DOM hay payload; thêm chế độ fake trả row ẩn danh mà vẫn kèm sender, để chứng minh lớp chặn thứ hai ở trang. |
| T6 | Medium (test) | `tests/unit/kudo-content-blocks.test.ts` (thiếu test) | Giới hạn độ sâu list (`kudo-content-blocks.ts:133`, `nested &&`) chưa có test: bỏ đi thì `"1. ".repeat(20000)` gây RangeError mà unit vẫn xanh. Biên của `LIST_MARKER` (`:40`) cũng chưa có test, nên `1.5 apples` hay `2024.01.02` thành list cũng không bị phát hiện. | Thêm `not.toThrow` cho list và quote lồng 20.000 tầng; thêm các ca `1.5 apples`, `2024.01.02 x`, `1234567890. x` phải là paragraph. |
| T7 | Low (test) | `tests/unit/resolve-auth-redirect.test.ts:78` | `"/\evil.example"` thực chất là `"/evil.example"` (JS hiểu `\e` là `e`), nên không có ca backslash nào ở lớp này. | `"/\\evil.example"`; thêm `/login/x` và `/loginx` vào danh sách người đã đăng nhập không bị chuyển hướng. |
| T8 | Low (test) | `tests/unit/auth-callback-next.test.ts` | Đổi `exchangeCodeForSession(query.code)` thành `("")`, hoặc hard-code origin, thì test vẫn xanh. Khi xoá cookie, test cũng không kiểm `Secure` và `SameSite`. | Assert `exchange` được gọi với `"abc"`; thêm một ca với origin khác; kiểm `Secure` và `SameSite` khi xoá cookie. |
| L1 | Low | `app/[locale]/sun-kudos/[id]/page.tsx` (`createSupabaseServerClient()` gọi trước `getKudoDetail`) | Client tạo ngoài try/catch. Env hỏng thì cả id sai dạng cũng ra 500 thay vì 404 hoặc lỗi chung trong khung như docs hứa. | Để `getKudoDetail(id)` tự tạo client bên trong try, sau bước kiểm id. |

## Cần owner quyết định

- **Chữ đậm không thấy được** (`kudo-detail-card.tsx`, khối nội dung `font-bold`; Montserrat chỉ nạp 400/500/700): `<strong>` trong chữ 700 trông như chữ thường, mention chỉ khác nhờ dấu `@`. Plan ghi "giữ đậm". Có hai cách: nạp thêm weight 800/900 và dùng `[&_strong]:font-extrabold`, hoặc đánh dấu `strong` bằng cách khác.

## Defer (ghi vào plan, không chặn)

- Allow-list `next` là regex tự viết, chưa là schema zod trong `lib/validation/` (đúng chức năng, lệch quy ước CLAUDE.md).
- Cookie `saa_post_login_next` chưa có tiền tố `__Host-` (tác động thấp: chỉ chuyển hướng trong site).
- Test E2E còn thiếu: tài khoản không được phép bị 404 (fake chưa mint được email khác); fake chưa trả 42501 cho người gọi chưa đăng nhập; trang lỗi khi RPC hỏng; Copy Link trên trang chi tiết; `toPass` cho cú click trước khi hydrate (80/80 khi lặp 5 lần nên chưa thấy flaky); spec 226 dòng nên tách; test tim sau reload thực chất chứng minh fake.
- Unit: test dùng chung fixture E2E; tên test "ẩn người gửi" nói quá phạm vi; round-trip serializer còn mỏng; `getKudoDetail(id, client?)` là seam cho test.
- Renderer: dòng trống trong list nằm trong quote làm tách item; đoạn thụt 3 dấu cách bị nhập vào item cuối của list; fallback `document.referrer` dùng `push` (nên đổi thành `replace`); hashtag trên trang chi tiết giữ `scroll={false}`; trang không có `<h1>`; ký tự U+E000–E006 hiện thành delimiter; `keepAllowedKudoImages` nhận `%2e%2e`; nhãn link có thể khác đích.

## Reject

Không có.

## Làm tốt

- Allow-list `next` khớp chính xác và trả đường dẫn chuẩn, được kiểm lại ở mọi chặng (proxy, trang login, Server Action, callback đọc cookie). `redirectTo` cố định. Cookie `httpOnly` và `Lax`, bị xoá ở mọi lối ra. Bảng test bypass khoảng 65 ca.
- `kudo_detail`: `security definer` với `search_path=''`, kiểm tài khoản trước, revoke `anon`, dùng lại `kudos_rows` nên ẩn danh giống board; verify có kiểm ACL và kiểm `strpos` id người gửi.
- Renderer không ném lỗi, regex tuyến tính, giới hạn độ sâu, chỉ cho link http(s), không có HTML thô, `rel` và `target` đúng.
- `notFound()` gọi trước Suspense nên 404 thật. Id kiểm bằng `z.guid()`. Lỗi trả về client là thông báo chung.

## Thứ tự sửa

B1 → B3 → B2 → T1 → T2 → T5 → T4 → T3 → B4 → B5 → T6–T8 → L1. Owner chốt chữ đậm. Sau khi sửa: unit, E2E toàn bộ, `kudo-detail.spec.ts --repeat-each=5`, re-review, evidence gate.
