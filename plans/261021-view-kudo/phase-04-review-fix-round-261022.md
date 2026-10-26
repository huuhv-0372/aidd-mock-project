# Phase 04 — Sửa theo review 2026-10-21 (B1–B5, T1–T8, L1, chữ đậm)

**Owner:** implementer L (lib + unit) ‖ implementer U (UI + E2E) → tester → reviewer · **Priority:** P2 · **Status:** completed (2026-10-22)
Large: renderer chạy trên dữ liệu không tin cậy, đổi định dạng nội dung lưu (escape mới), test auth → unit + E2E toàn bộ, review strong.
Nguồn: [reports/review-code-261021-commits-005620a-652d469.md](reports/review-code-261021-commits-005620a-652d469.md).

## Trạng thái từng mục (2026-10-22)

| Mục | Trạng thái | Bằng chứng / ghi chú |
|---|---|---|
| B1 `URL.canParse` trước `new URL` | done | 50.000 ký tự link không hợp lệ: 355 → 10 ms; unit có ngưỡng thời gian |
| B2 escape `N.` và `>` đầu dòng | done | Serializer, parser, `kudoPlainText` cùng bảng escape; board chỉ bỏ marker serializer sinh ra; round-trip fuzz |
| B3 `@[x](target)` chỉ là mention khi target là uuid | done | Unit; `@` không phải uuid thì là chữ, `[` vẫn mở link |
| B4 viền focus tối trên nền kem | done | `kudo-card-focus-ring.ts`, tương phản ≥ 3:1 (trước 1.13:1); áp cho link nội dung, Đóng, Copy Link, tim, hashtag, link thẻ All Kudos |
| Chữ đậm: Montserrat 800/900 | done (owner chốt 2026-10-22) | Variable woff2, không đổi payload; `<strong>` trong khối 700 thấy đậm |
| B5 xoá dòng "SQL chưa ghi nhận…" ở `docs/project-changelog.md:17` | done | doc-writer xoá dòng cũ; mục 6/6 PASS trỏ tới `clarifications.md`. Không có output verify giả |
| L1 client tạo trong `try`, sau kiểm id | done | `getKudoDetail` tự tạo client |
| T1 payload XSS không có ngoặc, HTML thô | done | E2E hardening: không có `<a>` nào, nhãn hiện dạng chữ |
| T2 fake `22P02`, so sánh không phân biệt hoa thường | done | Test id viết hoa; id sai dạng → 404 |
| T3 Close giữ `?hashtag=`; trang trước khác origin → `/sun-kudos` | done | E2E |
| T4 `/login?next=` khi đã đăng nhập; biến thể xấu → `/` | done | E2E login-next; bắt redirect authorize (cookie, `redirect_to`); PKCE callback stub |
| T5 Kudo ẩn danh; chế độ fake rò sender | done | Sender không có trong DOM hay payload; chứng minh lớp chặn thứ hai ở trang |
| T6 list/quote lồng 20.000 tầng; biên `LIST_MARKER` | done | Unit `not.toThrow`; `1.5 apples`, `2024.01.02 x`, `1234567890. x` là paragraph |
| T7 `"/\\evil.example"`; `/login/x`, `/loginx` | done | Unit `resolve-auth-redirect` |
| T8 `exchange("abc")`; origin khác; `Secure`/`SameSite` khi xoá cookie | done | Unit `auth-callback-next` |
| Review | done | Pass 1 REVISE 8.4 (3 Low Accept, 2 regression chạm tới được) → fix round 1 → re-review SEALED 9.0, criticalCount 0, humanSignedOff true (`evidence/inspection-verdict.json`) |
| Evidence gate hard exit 0 | done | `evidence-gate.cjs --stage hard` → SEALED (hard), exit 0 |
| `reports/db-verify-result.md` (output SQL thật) | follow-up (chủ dự án, không chặn) | Owner báo 6/6 PASS (2026-10-21 14:08), chưa dán output vào file |

## Kết quả kiểm chứng

| Lệnh | 2026-10-21 (trước sửa) | 2026-10-22 (code đóng băng, 09:40–10:13 ICT) |
|---|---|---|
| `npm run lint` · `npx tsc --noEmit` | 0 · 0 | 0 · 0 |
| `npx vitest run` | 46 file, 725/725 | 48 file, 778/778 |
| `npm run test:e2e` | 245/245 | 267/267, 0 flaky |
| `kudo-detail*` `--repeat-each=5` | 80/80 (1 spec) | 190/190 (4 spec) |
| OpenNext build | exit 0 | exit 0 |
| `wrangler deploy --dry-run` gzip | HEAD 2241.61 KiB | 2243.72 KiB (giới hạn 3072 KiB) |
| Renderer, link không hợp lệ | 5.000 ký tự: 42 ms; 50.000 ký tự: 355 ms | 50.000 ký tự: 10 ms |

## Quyết định đã chốt (controller)

- **B1**: `safeHref` kiểm `URL.canParse(raw)` trước khi tạo `URL`, rồi vẫn so khớp đúng `http:`/`https:`. Unit test thời gian: 50.000 ký tự link không hợp lệ phải chạy dưới ngưỡng rộng (đo trước/sau, ngưỡng ≥ 5 lần thời gian sau khi sửa).
- **B3**: `@[x](target)` chỉ là mention khi target có dạng uuid (cùng quy tắc `pgUuid` của validator). Không phải uuid thì `@` là chữ, `[` mở link như bình thường. Board (`kudoPlainText`) giữ nguyên.
- **B2**:
  - Serializer escape các marker đầu dòng mà parser sẽ hiểu thành cấu trúc: `N.` (theo `LIST_MARKER`) thành `N\.`, `>` thành `\>`, ở đầu mọi dòng văn bản, kể cả sau hard break.
  - Parser và `kudoPlainText` thêm `.` và `>` vào bảng escape.
  - Dòng chỉ có marker mà không thuộc một list đang chạy thì hiện thành chữ, không bao giờ mất chữ. Nội dung cũ chưa có escape vẫn hiện được.
  - `stripLine` của board chỉ bỏ đúng các marker mà serializer sinh ra (`N. `, `> `), để board và trang chi tiết đọc giống nhau.
  - Round-trip fuzz: serializer → parser khớp cấu trúc.
- **B4**: viền focus trên nền kem (`--color-kudos-card` #fff8e1) dùng màu tối có tương phản ≥ 3:1 (ví dụ `login-bg` #00101a). Áp cho link nội dung, nút Đóng, Copy Link, tim, hashtag trong thẻ chi tiết, và link nội dung mới của thẻ All Kudos.
- **Chữ đậm (owner chốt 2026-10-22)**: Montserrat nạp thêm weight `800` và `900`. Khi đó `<strong>` trong khối 700 (`bolder` = 900) có mặt chữ thật, nên in đậm và mention thấy được.
- **B5**: xoá dòng "SQL chưa ghi nhận đã chạy…" ở `docs/project-changelog.md:17` (doc-writer, ở bước Deliver). Không bịa output verify: changelog dẫn tới `clarifications.md` (owner xác nhận 6/6 PASS). File `db-verify-result.md` chờ owner dán output thật.
- **L1**: trang không tạo client bên ngoài. `getKudoDetail(id)` tự tạo client trong `try`, sau bước kiểm id.
- **T1–T5 (E2E)**:
  - **T1**: kudo XSS riêng với payload không có ngoặc (`javascript:alert%281%29`, `JaVaScRiPt:x`, `data:text/html,x`, `vbscript:x`) và một dòng HTML thô.
  - **T2**: fake `kudo_detail` trả 400/22P02 cho id không có dạng guid, so sánh id không phân biệt hoa thường. Thêm test id viết hoa; assert nội dung trang 404 khi id sai dạng.
  - **T3**: nút Đóng từ `/sun-kudos?hashtag=…` quay lại vẫn còn bộ lọc; trang trước khác origin thì về `/sun-kudos`.
  - **T4**: đã đăng nhập mở `/login?next=` hợp lệ thì tới Kudo; các biến thể xấu thì về `/` cùng origin. Bắt redirect authorize để kiểm cookie (`httpOnly`, `Lax`) và `redirect_to` không chứa `next`. Callback PKCE stub làm nếu khả thi; nếu không, ghi lý do (unit đã phủ).
  - **T5**: trang chi tiết của Kudo ẩn danh, cộng chế độ fake trả row rò sender để chứng minh lớp chặn thứ hai ở trang.
  - Không sửa các dòng `DETAIL_KUDO` hiện có (unit test đang import fixture này); chỉ thêm seed mới.
- **T6–T8 (unit)**:
  - **T6**: list hoặc quote lồng 20.000 tầng không ném lỗi; biên `LIST_MARKER` (`1.5 apples`, `2024.01.02 x`, `1234567890. x` là paragraph).
  - **T7**: sửa `"/\\evil.example"`; thêm `/login/x` và `/loginx` vào danh sách người đã đăng nhập không bị chuyển hướng.
  - **T8**: assert `exchange` được gọi với `"abc"`; thêm một ca origin khác; kiểm `Secure` và `SameSite` khi xoá cookie.
- **Defer**: giữ danh sách Defer của báo cáo review.

## Sở hữu file

- L: `lib/kudos/{kudo-content-blocks,kudo-content-markdown,kudo-plain-text,get-kudo-detail}.ts`, `app/[locale]/sun-kudos/[id]/page.tsx`, `tests/unit/**`.
- U: `app/[locale]/layout.tsx`, `components/kudos/**`, `tests/e2e/**`.
- Không agent nào chạy `next build`/Playwright khi L chưa xong; U viết E2E trước (RED) rồi chờ.

## Xong khi

Lint 0 · tsc 0 · unit xanh (có test mới cho B1–B3, L1, T6–T8) · E2E toàn bộ xanh · `kudo-detail*.spec.ts --repeat-each=5` xanh · OpenNext build exit 0 · review strong SEALED · evidence gate hard exit 0.

**Kết quả:** 8/8 tiêu chí đạt. Evidence gate SEALED (hard), exit 0. Phase 04 completed.

## Việc còn lại (follow-up, không chặn đóng phase)

| # | Việc | Owner | Trạng thái / xong khi |
|---|---|---|---|
| 1 | Dán output 6/6 SQL verify (D1, D2, D3, D4, D5, D1b, anon 42501) vào `plans/261021-view-kudo/reports/db-verify-result.md` | chủ dự án | Mở. Xong khi file có đủ dòng PASS, kèm ngày, output không sửa |
| 2 | B5 xoá dòng "SQL chưa ghi nhận…" trong changelog | doc-writer | Xong. Dòng cũ đã xoá |
| 3 | Evidence gate hard exit 0 | controller | Xong. SEALED (hard), exit 0 |
| 4 | Verdict review 2026-10-22 và số đo | controller | Xong. `evidence/inspection-verdict.json`, `evidence/temper-results.json` |
| 5 | Row 03 plan.md | controller | Xong. Khôi phục claim gốc, dẫn `reports/reviewer-261021-final-verdict-sealed-9.6.json` |
| 6 | riskGate | chủ dự án | Xong. Ký bởi hoang.van.huu 2026-10-22, ghi trong `clarifications.md` |
| 7 | Quyết định chữ đậm 800/900 vào `clarifications.md` | controller | Xong. Session 2026-10-22 |
| 8 | Kiểm `lib/supabase/update-session.ts:49` xoá cookie `Max-Age=0` đúng trên workerd (`npm run preview`) | debugger, qua controller | Mở, không chặn. Lỗi có sẵn, ngoài phạm vi phase. Xong khi có kết quả: cookie bị xoá, hoặc Defer kèm bằng chứng |
| 9 | Commit | chủ dự án duyệt, controller thực hiện | Chờ duyệt. Theo phạm vi (renderer, auth, test, docs), conventional, không có secret. `.github/` untracked là template issue/PR, không thuộc feature, loại khỏi commit. Không push |

## Scope drift (vòng sửa 2026-10-22)

| Lệch khỏi kế hoạch | Lý do | Chi phí |
|---|---|---|
| Vòng sửa lớn: 2 lượt implementer (L, U), 1 lượt debugger, 2 lượt review (8.4 REVISE → 9.0 SEALED), controller tự sửa bundle | Review 2026-10-21 có 14 mục Accept (B1–B5, T1–T8, L1), trong đó có lỗi auth | Chưa đo giờ. Độ trễ thật là 2 vòng review và 2 vòng implementer |
| Cookie `saa_post_login_next` không bị xoá trên runtime thật: Next 16.4 gọi `@edge-runtime/cookies` `compact()`, bỏ `Max-Age=0` khi `cookies()` đã ghi. Sửa: xoá qua `cookies()` trong `lib/auth/clear-post-login-next-cookie.ts`; E2E assert cookie đã mất | Lỗi lọt qua E2E 2026-10-21, chỉ thấy khi chạy runtime thật | Thêm 1 file ngoài kế hoạch. Cookie sống 10 phút nên tác động thấp, nhưng là lỗi auth thật |
| `app/auth/callback/route.ts` import `next/headers` trực tiếp làm nhân đôi chunk server ~296 KB (+62.8 KiB gzip). Chuyển vào helper | Giữ bundle trong giới hạn | Còn +2.11 KiB so HEAD (2243.72 so 2241.61 KiB) |
| Chữ đậm: owner đổi quyết định 2026-10-21 "giữ 700 như thẻ board" (`clarifications.md` dòng 31) sang nạp 800/900 | Owner chốt 2026-10-22: `<strong>` trong khối 700 không thấy đậm | Thêm font weight, không đổi payload. `clarifications.md` chưa ghi (việc 7) |
| Mở rộng test: `kudo-detail*` từ 1 lên 4 spec; thêm fake, helper, 2 unit file, `focus-contrast.ts`, `kudo-card-focus-ring.ts` | T1–T8 và B4 yêu cầu | E2E 245 → 267 (+22), unit 725 → 778. Thời gian E2E chưa đo lại |
| Fix round 1 (trong vòng sửa): item rỗng đầu list, quote `>` rỗng, race ở helper `clickCloseUntil` | Phát hiện khi chạy lại sau sửa | Một vòng sửa nhỏ, nằm trong lượt implementer |

## Deferred (không chặn, ghi lại)

Gồm danh sách Defer của review 2026-10-21 và mục mới của vòng 2026-10-22 (đánh dấu "mới"). Mục đã sửa trong vòng này (escape `2025.` và `>`, round-trip mỏng) đã bỏ khỏi danh sách.

**Auth và cookie**
- Allow-list `next` là regex tự viết, chưa là schema zod trong `lib/validation/` (đúng chức năng, lệch CLAUDE.md).
- Cookie `saa_post_login_next` chưa có tiền tố `__Host-` (tác động thấp, chỉ chuyển hướng trong site).
- Comment ở callback nói "return await" quá mức: nếu `cookies()` ném trong catch thì kết quả là 500. (mới)

**E2E**
- Chưa phủ: tài khoản không được phép → 404 (fake chưa mint được email khác); fake chưa trả 42501 cho người chưa đăng nhập; trang lỗi khi RPC hỏng; Copy Link trên trang chi tiết.
- `toPass` cho cú click trước hydrate: 80/80 khi lặp 5 lần, chưa thấy flaky.
- Test tim sau reload thực chất chỉ chứng minh fake.
- `kudo-detail.spec.ts` (226 dòng trước đây): đã tách trong vòng 2026-10-22, cần kiểm lại kích thước từng file.

**Unit**
- Test dùng chung fixture với E2E; tên test "ẩn người gửi" nói rộng hơn phạm vi; `getKudoDetail(id, client?)` là seam cho test.
- Test thời gian dùng wall-clock (`kudo-content-blocks.test.ts:92`) có thể flaky khi máy tải cao. (mới)
- Ca bold bằng computed weight không thể fail; test font-face mới là chốt thật. (mới)
- Validator nhận content `>`, còn UI không gửi được giá trị đó. (mới)

**Renderer**
- Quote chỉ có khoảng trắng in `>` thừa (`kudo-content-markdown.ts:117`), sửa bằng `line.trim()`. (mới)
- Item rỗng giữa list hiện `2.` trên thẻ. Quyết định sản phẩm, chờ chủ dự án. (mới)
- Board và trang chi tiết khác nhau với marker thụt đầu dòng hoặc lồng quá sâu. (mới)
- Dòng trống trong list nằm trong quote làm tách item; đoạn thụt 3 dấu cách bị nhập vào item cuối.
- `keepAllowedKudoImages` nhận `%2e%2e`; U+E000–E008 hiện thành ký tự delimiter; nhãn link có thể khác đích.

**UI, điều hướng, a11y**
- Fallback `document.referrer` đang dùng `push`, nên đổi thành `replace`.
- Hashtag trên trang chi tiết giữ `scroll={false}`; trang chưa có `<h1>`.
- Feed card: accessible name là toàn bộ nội dung; nên thêm `aria-label` hoặc `aria-describedby`.
- Feed card dùng prefetch mặc định: mỗi card có thể gọi một request RSC qua proxy trên Worker; `spotlight-node` dùng `prefetch={false}`.

**SQL verify**
- Anon fixture không có ảnh nên D3 chưa kiểm `images`. Hiện an toàn vì `create_kudo` chỉ nhận tên `{uuid}.{ext}`.
