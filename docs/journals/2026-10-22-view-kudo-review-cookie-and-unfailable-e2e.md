# View Kudo review: cookie sau đăng nhập không bị xoá thật, và E2E từng không thể fail

**Date**: 2026-10-22 10:37
**Severity**: medium
**Component**: kudos / View Kudo (commits 005620a, 652d469, fix tại 2c01105)
**Status**: resolved (còn hai mục mở, xem Next Steps)

## What Happened

Bốn reviewer chạy song song trên 005620a và 652d469 (trang View Kudo, `kudo_detail`, allow-list `next` sau đăng nhập). Không có lỗi Critical, không có XSS, open redirect hay ReDoS. Nhưng có loạt lỗi Accept: renderer tốn CPU trên link sai, dòng bắt đầu bằng `2025.` bị mất thành list rỗng, `@` đi kèm link bị nuốt thành mention, focus ring gần như vô hình, chữ đậm không hiện, và changelog tự mâu thuẫn. Đã sửa trong 2c01105. Khi sửa, phát hiện thêm hai chỗ review không bắt được.

## The Brutal Truth

Chỗ đau nhất không nằm trong danh sách review. Cookie `next` sau đăng nhập được "xoá" bằng `Max-Age=0`. Unit test gọi GET trực tiếp đều xanh, vì test nhìn object `NextResponse`, không nhìn trình duyệt. Trong runtime thật cookie vẫn còn. Chỉ E2E PKCE-stub mới khẳng định cookie biến mất ở tầng browser.

Bực hơn là E2E cũ có payload `javascript:alert(1)` nhưng payload đó không bao giờ tới `safeHref`, vì regex LINK loại `(` trong target. Test báo xanh mà không thể fail.

## Technical Details

- `new URL()` throw trên link sai: 42 ms cho 5000 ký tự, so với 2 ms khi đổi sang `URL.canParse`.
- Focus ring dark card `#ffea9e` trên `#fff8e1` ≈ 1.13:1, dưới ngưỡng 3:1 của WCAG cho thành phần UI.
- Chữ đậm: content dùng weight 700 nhưng Montserrat chỉ load tới 700. Thêm 800/900 theo quyết định owner; font variable nên payload không tăng.
- Cookie: `@edge-runtime/cookies` `compact()` bỏ `maxAge: 0` vì coi là falsy. Next 16.4 còn parse lại `Set-Cookie` của chính route handler sau khi `cookies()` đã được ghi. Fix: xoá qua `cookies()` trong `lib/auth/clear-post-login-next-cookie.ts`.
- Bundle: HEAD 2241.61 KiB, sau khi import `next/headers` thẳng vào `app/auth/callback/route.ts` thành 2243.72 KiB với một chunk server ~296 KB bị nhân đôi (+62.8 KiB gzip). Đưa import sang module riêng thì về mức trên.
- Regression parser do fix B2: serializer viết ra list item rỗng đầu tiên và quote rỗng, parser mới không đọc lại được. Strong reviewer bắt được.

Bằng chứng cuối (2026-10-22): lint 0, tsc 0, vitest 778/778, E2E 267/267, kudo-detail ×5 190/190, review SEALED 9.0, evidence gate hard SEALED, riskGate owner ký.

## What We Tried

- Đoán chỗ phình bundle là page đổi. Sai. Bisect bằng stash HEAD với tree rồi wrangler dry-run mới ra `next/headers` trong route callback.
- Assert cookie ở unit test trên object trả về: không đủ. Chỉ E2E đọc browser mới thấy cookie còn sống.
- Test open-redirect dùng `"/\evil.example"`: JS đọc thành `/evil.example`, nên test không kiểm đúng điều nó khẳng định. Phải sửa chuỗi.

## Root Cause Analysis

Không có một dòng code gây ra hết. Bốn thói quen cộng lại:

1. Test nhìn sai tầng: object trong bộ nhớ thay vì browser, và parser chạy trên chuỗi không đi qua đường serializer thật.
2. Fake không từ chối những gì backend thật từ chối. `kudo_detail` nhận mọi id, nên E2E không biết id sai.
3. Payload kiểm thử không khớp grammar của parser, nên assertion an toàn rỗng.
4. Đổi import trong route mà không đo bundle so với HEAD, dựa vào trực giác.

## Lessons Learned

- Payload XSS phải là thứ parser thật sự match. Trước khi tin test, in ra output để xem nó có đi tới sink không.
- Fake phải từ chối đúng những gì backend thật từ chối.
- Assert xoá cookie ở browser, không assert trên `NextResponse`.
- Sau mọi thay đổi import trong route handler, đo bundle so với HEAD trước khi commit.
- Fuzz generator phải sinh khối rỗng. Serializer viết ra gì thì parser phải đọc lại được.

## Next Steps

- `lib/supabase/update-session.ts:49` (`copySession`) có thể mất `Max-Age=0` theo cùng cơ chế. Chưa kiểm chứng. Owner: người làm auth, kiểm bằng E2E cookie ở browser trước khi merge.
- Owner dán output SQL verify thật vào `plans/261021-view-kudo/reports/db-verify-result.md`. Chưa có file này. Owner: hoang.van.huu.
- Các mục deferred còn ghi trong `plans/261021-view-kudo/phase-04-review-fix-round-261022.md`, giữ mở cho đến khi có người nhận.

**Status:** DONE
