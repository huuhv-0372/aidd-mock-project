# Hồ sơ quy trình AIDD (`plans/`)

Thư mục này ghi lại cách từng màn hình được làm bằng quy trình AI-driven (Claude Code + bộ kit Takumi, dữ liệu thiết kế từ MoMorph): kế hoạch, các câu hỏi đã chốt với chủ dự án, test đỏ trước khi code, kết quả review và bằng chứng kiểm thử. Code nằm ở gốc repo; tài liệu sản phẩm ở [`README.md`](../README.md) và [`docs/`](../docs/).

## Một plan gồm những gì

| File / thư mục | Nội dung |
|---|---|
| `plan.md` | Tổng quan: mục tiêu, các phase, ai làm, trạng thái, rủi ro |
| `phase-XX-*.md` | Từng bước: yêu cầu, file sở hữu, các bước làm, tiêu chí xong, Scope Contract |
| `clarifications.md` | Câu hỏi đã hỏi chủ dự án và câu trả lời (nguồn quyết định, không mở lại) |
| `reports/` | Biên bản: E2E đỏ/xanh, đo hình so với Figma, verdict của reviewer qua từng vòng, báo cáo của từng agent |
| `evidence/` | Bằng chứng cho evidence gate: `study-context.json` (tiêu chí nghiệm thu), `temper-results.json` (lệnh kiểm thử + exit code thật), `inspection-verdict.json` (kết luận review), log chạy test |
| `spec/` | Bản nháp spec (chỉ ở vài plan đầu, trước khi tắt SDD) |

Thư mục chung:

- [`momorph-specs/`](momorph-specs/): spec và test case MoMorph của từng frame (CSV tải về), dùng làm đầu vào cho plan và E2E.
- [`reports/`](reports/): nghiên cứu ban đầu (Cloudflare Workers, Supabase + Next.js, OWASP, Tailwind v4).

**Không commit:** ảnh chụp PNG (khoảng 124 MB, chỉ giữ trên máy) và danh sách media thô của MoMorph (`media_files.json`, có URL ký sẵn). Vì vậy link ảnh trong một số báo cáo không mở được trên GitHub; số đo vẫn được ghi bằng chữ trong báo cáo.

## Quy trình cho mỗi màn

1. Đọc spec + test case MoMorph, hỏi chủ dự án những điểm spec không nói, ghi vào `clarifications.md`.
2. Viết plan: phase E2E đỏ, phase giao diện (MoMorph UI agent) song song với phase dữ liệu/logic, phase tích hợp.
3. Tester viết E2E từ test case và chạy cho **đỏ đúng lý do** trước khi có code.
4. Hai track code song song, mỗi track sở hữu file riêng.
5. Tích hợp, chạy E2E cho xanh (kèm toàn bộ suite), đo hình 1440/375 so với Figma.
6. Reviewer (model mạnh) đọc toàn bộ thay đổi; sửa theo vòng cho tới khi verdict `SEALED`.
7. Evidence gate kiểm ba file trong `evidence/`; thay đổi chạm vùng nhạy cảm (auth, dữ liệu) cần chủ dự án ký (`riskGate`).
8. Cập nhật docs, mở issue và PR (`Closes #N`).

Màn đầu tiên (Countdown) chạy đầy đủ cả bước spec; từ 2026-10-09 tắt SDD (`takumi.sddMode: off`) để giữ ngân sách thời gian, spec + test case MoMorph đóng vai trò spec.

## Danh sách plan

Trước 2026-10-22 code được commit thẳng vào `main`, issue tạo bù; từ #15 trở đi mỗi việc có issue và PR riêng.

| Plan | Nội dung | Issue | PR / commit chính | Trạng thái |
|---|---|---|---|---|
| [261008-1631-project-foundation-setup](261008-1631-project-foundation-setup/plan.md) | Nền tảng: Cloudflare Workers, Supabase, bảo mật cơ bản | #1 | làm dần trong plan Countdown/Login | cancelled (một phần đã làm, xem plan) |
| [261009-1222-countdown-prelaunch-page](261009-1222-countdown-prelaunch-page/plan.md) | Trang đếm ngược trước giờ mở (F001 / SCR001) | #2 | `5917d02` | completed |
| [261012-0926-login-google-supabase-auth](261012-0926-login-google-supabase-auth/plan.md) | Đăng nhập Google qua Supabase | #3 | `68eb213` | completed |
| [261012-1330-user-profiles-supabase](261012-1330-user-profiles-supabase/plan.md) | Bảng `profiles`, chỉ cho email `@sun-asterisk.com` | #4 | `d2ce141` | completed |
| [261012-1549-homepage-saa](261012-1549-homepage-saa/plan.md) | Trang chủ SAA (sau đó mở công khai) | #5 | `80d4baa`, `0d296b8` | completed |
| [261013-1554-awards-information](261013-1554-awards-information/plan.md) | Hệ thống giải thưởng | #6 | `2eccaa8` | completed |
| [261014-1115-multi-language-vi-en](261014-1115-multi-language-vi-en/plan.md) | Đa ngôn ngữ VI/EN | #7 | `f0f4354` | completed |
| [261015-1010-sun-kudos-live-board](261015-1010-sun-kudos-live-board/plan.md) | Sun\* Kudos: bảng Live | #8 | `d263e43`, `257cc99` | completed |
| [261019-0855-kudos-review-fixes](261019-0855-kudos-review-fixes/plan.md) | Sửa sau review bảng Live | #8 | `b727fe8` | completed |
| [261019-1022-write-kudos](261019-1022-write-kudos/plan.md) | Viết Kudo + widget + Thể lệ | #9 | `f7f7266`, `ba028d0` | completed (còn mở: so bố cục 2 frame Figma) |
| [261020-1429-like-kudos](261020-1429-like-kudos/plan.md) | Thả tim Kudo | #10 | `c67c6ea`, `fd812d0` | completed |
| [261021-community-standards](261021-community-standards/plan.md) | Trang Tiêu chuẩn chung | #11 | `4ef955b` | completed |
| [261021-error-pages](261021-error-pages/plan.md) | Trang lỗi 404 / 403 | #12 | `6eaafdf` | completed |
| [261021-view-kudo](261021-view-kudo/plan.md) | Xem chi tiết Kudo | #13 | PR #15 | completed |
| [261021-profile](261021-profile/plan.md) | Hồ sơ của mình / người khác | #14 | PR #16 | completed |
| [261022-edit-kudo](261022-edit-kudo/plan.md) | Sửa Kudo đã gửi | #19 | PR #20 | completed |
| [261023-1207-admin-user-management](261023-1207-admin-user-management/plan.md) | Khu Admin, màn Admin - User | #21 | PR #22 | completed |
| [261026-0834-kudos-profile-search](261026-0834-kudos-profile-search/plan.md) | Ô tìm kiếm profile Sunner | #24 | PR #25 | completed |

Việc không có plan riêng: bug dropdown người nhận (#17, PR #18), nâng Next 16.4.3 (PR #23), vá gói phụ thuộc (#26, PR #28), viết lại docs (#27, PR #29).
