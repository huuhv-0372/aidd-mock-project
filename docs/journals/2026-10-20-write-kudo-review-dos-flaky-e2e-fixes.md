# Write Kudo review: DoS trước auth, E2E flaky, và một lần sửa hook làm hỏng Esc

**Date**: 2026-10-20 13:12
**Severity**: high
**Component**: kudos / Write Kudo (commits f7f7266 → 223a6dc, fix tại 962d75f)
**Status**: resolved (phần deferred còn mở, xem Next Steps)

## What Happened

Bốn reviewer chạy song song trên bốn commit của Write Kudo (#12). Báo cáo: `plans/261019-1022-write-kudos/reports/review-code-261020-commits-f7f7266-to-223a6dc.md`. Plan đã ghi SEALED 9 và "183/183 E2E" từ hôm qua, nhưng review lật ra năm lỗi thật. Đã sửa tất cả trong 962d75f, trừ các mục deferred.

## The Brutal Truth

Plan ghi "đã sealed" mà chưa ai đo regex. Một người vẫn đọc code và thấy ổn. Điều bực nhất là lỗi DoS nằm ngay trên đường pre-auth: ai cũng gửi được body mà không cần đăng nhập. Và một E2E từng báo xanh lại fail 3/5 lần trên máy rảnh. Bằng chứng "xanh" hôm qua chỉ chạy đúng 2 lần.

## Technical Details

- **Pre-auth CPU DoS**: zod 4 vẫn chạy `.refine` sau khi `.max(5000)` đã fail, và `writeKudoSchema` chạy trước `getClaims()`. Regex `kudoPlainText` có backtracking bậc hai: 20.000 ký tự `[` mất khoảng 5,5 s chỉ để qua schema.
- **Flaky E2E**: `write-kudo.spec.ts:263` khẳng định "không gửi search" trong cửa sổ debounce 150 ms. Đo trên máy rảnh: fail 3/5.
- **Fake không đủ thật**: fake Supabase không đưa người gọi vào search pool, nên test "không gợi ý chính mình" không thể fail.
- **Serializer**: mark qua dòng ngắt bị ghi thành `**a\nb**`, Markdown không render.
- **Cleanup ảnh**: khi RPC trả lỗi mơ hồ, code xoá ảnh đã upload dù Kudo có thể đã commit.

## What We Tried

- Vòng 1 sửa Esc: `preventDefault()` trong `components/site-shell/use-dismissable.ts` để dropdown hashtag không đóng luôn modal. Hậu quả: popup nằm ngoài modal nuốt Esc của modal. Strong reviewer bắt được, implementer không bắt.
- Vòng 1 rule "cùng dialog với event.target" hỏng khi focus rơi xuống body lúc retry đang chờ.
- Vòng 2 đổi rule: so dialog của popup với `dialog:modal` đang ở trên cùng. Pass.
- Fix DoS lần đầu chỉ sửa một regex. Sau đó đo lại mới thấy hai regex quadratic nữa: bước trim cuối và `wrap()` trong serializer chạy mỗi keystroke.
- Test timing cho slice `hasOnlySafeLinks` bị bỏ: nó cần export chỉ để test. Rủi ro đã được chặn bởi abort.

## Root Cause Analysis

Gốc không phải một dòng code. Có ba thói quen sai cộng lại:

1. Không đo độ phức tạp regex chạy trên input không tin cậy hoặc mỗi keystroke. Regex "trông ổn" được coi là ổn.
2. Test được coi là đúng khi có số xanh, không phải khi đã chứng minh nó fail được. Assertion trong cửa sổ timing và fake không mô phỏng việc loại trừ người gọi đều không thể fail.
3. Sửa hook dùng chung mà không kiểm tra mọi consumer. `use-dismissable` có nhiều chỗ dùng.

## Lessons Learned

- Bấm giờ mọi regex chạy trên text không tin cậy hoặc per-keystroke, với input cỡ 20k ký tự, trước khi merge.
- SEALED cộng với chạy lặp 2 lần không chứng minh E2E không flaky. Với E2E mới, chạy lặp 5–10 lần trước khi tin.
- Đổi shared hook thì phải liệt kê tất cả consumer và test từng cái, không chỉ consumer đang sửa.
- Chỉ assert side effect mà fake thật sự có thể sai. Thay timing bằng `page.clock` hoặc RPC giữ lại kèm log marker.
- Với zod 4: đặt `.max(..., { abort: true })` trước các `.refine`.

## Next Steps

- Link validator còn lỗ: nested bracket, autolink `<javascript:...>`, reference-style link. Phải sửa trước khi bất kỳ Markdown renderer nào được thêm vào. Owner: người làm kudos, trước khi có renderer.
- Giới hạn body 26 MB là global, cần siết riêng cho route kudos.
- Chưa có rate limit cho `create_kudo`. Cần Cloudflare Rate Limiting Rule theo CLAUDE.md.
- Orphan sweep cho ảnh (chấp nhận orphan tạm thời) và tách spec `write-kudo.spec.ts` còn để sau.

Bằng chứng cuối (code đóng băng 12:42–13:12, 2026-10-20): lint 0, tsc 0, vitest 538/538, E2E 195/195, write-kudo ×5 425/425, OpenNext build 0, gzip 2220.64 KiB. Riskgate ký bởi hoang.van.huu.

**Status:** DONE
