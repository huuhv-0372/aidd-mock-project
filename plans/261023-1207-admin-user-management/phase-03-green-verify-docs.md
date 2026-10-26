# Phase 03 — GREEN, visual, SQL thật, review, docs

## Context Links
- [plan.md](plan.md), [clarifications.md](clarifications.md), báo cáo 01/02a/02b trong `reports/`
- Mẫu: `plans/261022-edit-kudo/plan.md` phase 03; `.claude/skills/_shared/templates/reviewer-prompt-template.md`; rule `development-rules.md` (Scope Contract), `documentation-management.md`
- Bài học (memory): không chạy build và E2E song song; server cũ trên 3100-3103 làm nhiễu E2E; "all green" của subagent phải kiểm lại; evidence gate lặp lại từng tiêu chí; riskGate hỏi lại tường minh sau "no"; chủ dự án (controller) xuất asset Figma.

## Overview
- Priority: P2. Status: completed (2026-10-23; commit `78a17b6` + `cad306e`, PR #22). Owner: tester + reviewer + doc-writer (controller điều phối). Effort: 1.5h. Phụ thuộc: 01, 02a, 02b xong.
- Hợp nhất, build, E2E xanh, so ảnh 1440, SQL thật, review, docs, commit/PR.
- Kết quả (2026-10-23): GREEN 3 vitest 1054/1054, tsc 0, lint 0, build ok sau thử lại (Next 16.4.0), `admin-users-actions` ×10 50/50, `admin-users` ×3 117/117, E2E 356/356 0 flaky; review SEALED 9; riskGate ký. Lệch: Worker gzip 2347.94 KiB, vượt ngưỡng 2258 đã đặt (Requirement 4); tên báo cáo ghi 261023. Chi tiết và việc còn lại: plan.md mục Kết quả.

## Scope Contract
- **Changed**: cột `profiles.role`; `is_admin`, `admin_list_users`, `admin_set_user_role`; `app/[locale]/admin/**`; `components/admin/**`; `lib/admin/**`; `lib/validation/admin-users.ts`; `account-menu`, `signed-in-controls`, `header-session-controls`; `messages` (admin, shell); `lib/navigation/routes.ts`; tests/e2e support.
- **Impacted**: mọi trang có header đăng nhập (menu tài khoản thêm mục điều kiện); trigger đăng nhập (`profiles` có cột mới); `[...rest]` catch-all vs route admin; từ điển i18n (thiếu khoá = lỗi build); kích thước Worker.
- **Will verify**: (1) SQL verify thật 100% PASS (RBAC + migration: chạy đầy đủ); (2) `admin-users*.spec.ts` GREEN + lặp ×3; (3) **E2E đầy đủ** vì đổi header dùng chung và migration/RBAC (danh sách an toàn trọng yếu, không rút gọn); (4) `vitest run` đầy đủ; (5) `npm run lint`, `npm run build`, kích thước Worker gzip; (6) so ảnh 1440 và chụp 375; (7) một lần đăng nhập Google thật sau migration.
- **Deliberately skipped**: không kiểm tải RPC với dữ liệu lớn (vài trăm người); không kiểm Overview/Review content/Settings (không có trang); không kiểm trình duyệt ngoài Chromium; không kiểm email nội dung thông báo (không có).

## Key Insights
- Phase này là nơi duy nhất build + chạy E2E toàn bộ. Phải dọn cổng 3100-3103 và 54398 trước khi chạy.
- SQL thật là bằng chứng duy nhất cho RBAC; fake chỉ là hợp đồng đôi. Chủ dự án chạy migration + verify trên Supabase thật (như update_kudo, 11/11 PASS) rồi mới ký riskGate.
- Review phải nhận mã, không nhận kết luận của controller (đưa diff + plan, không đưa "đã ổn").

## Requirements
Cổng nghiệm thu (đều phải có bằng chứng ghi vào báo cáo, lặp lại từng tiêu chí trong evidence gate):
1. `npx vitest run` xanh, số ca ghi lại.
2. `npm run lint` 0 lỗi; `npm run build` qua (cảnh báo Next 16.4.0 lần đầu: chạy lại; ghi nhận, không "cho xanh").
3. `admin-users.spec.ts` + `admin-users-actions.spec.ts` GREEN, lặp ×3 không flaky; E2E đầy đủ xanh (so số 317 trước đó + ca mới).
4. Worker gzip ≤ 2258 KiB + mức tăng hợp lý (không thư viện mới); ghi số.
5. SQL thật: file migration + verify chạy, mọi dòng PASS (chụp ảnh `reports/sql-verify-261024-admin-users.png`); sau đó chủ dự án chạy lệnh gán admin đầu tiên và kiểm `is_admin()` bằng chính tài khoản mình.
6. Visual 1440 so ảnh (cùng viewport; ghi lệch có chủ đích: phân trang, tổng "(N)", màu/số đo ước lượng); chụp 375 và 768.
7. Tay: đăng nhập Google thật (trigger không hỏng), người thường mở `/admin/users` thấy 403, admin đổi vai trò một người rồi đổi lại, xuất CSV mở bằng Excel thấy tiếng Việt đúng và ô `=...` không chạy công thức.
8. Review (`reviewer-prompt-template.md`) không còn Critical/High; riskGate (RBAC + migration + đổi dữ liệu) do chủ dự án ký sau SQL thật, hỏi tường minh lại nếu trả lời "no".

## Architecture
```
hợp nhất 02a + 02b -> vitest -> lint -> build -> E2E (3100-3103 sạch) -> visual 1440/375
   -> chủ dự án: migration + verify trên Supabase thật -> gán admin -> kiểm tay
   -> review -> riskGate -> docs -> commit + PR (Closes #N)
```

## Related Code Files
- Đọc: toàn bộ file của 01/02a/02b. Sửa chỉ để vá lỗi do kiểm chứng (ghi lại từng vá, không nới assertion).
- **Docs (doc-writer)**: `README.md` (mục Admin, lệnh gán admin đầu tiên, lệnh export), `docs/project-changelog.md`, `docs/system/permissions.md` (thêm vai trò Admin, cổng `/admin`, bỏ câu "chưa có vai trò" và "không có Admin Dashboard"), `docs/codebase-summary.md` (bảng cấu trúc: `components/admin/`, `lib/admin/`, `app/[locale]/admin/`, `account-menu` có Dashboard, migration mới, tests mới, chú thích "Chưa có" về `admin.ts`), `docs/system-architecture.md` nếu có mục RBAC/RPC cần cập nhật, `docs/development-roadmap.md` nếu tồn tại.
- Tạo: `reports/tester-261024-green.md`, `reports/reviewer-261024-admin-users.md`, `evidence/` (ảnh, verdict).

## Implementation Steps
1. Controller: kiểm 02a/02b không chạm file của nhau (diff theo danh sách sở hữu); đọc báo cáo, **không** tin "all green" mà chưa chạy.
2. Dọn cổng; `npx vitest run`; `npm run lint`; `npm run build`.
3. Chạy `admin-users*.spec.ts` ×3, rồi E2E đầy đủ; sửa lỗi thật (không sửa assertion để xanh); ghi bất kỳ lệch hợp đồng.
4. Visual 1440 so ảnh; polish vòng 1 nếu lệch ngoài danh sách chấp nhận.
5. Chủ dự án chạy SQL thật + gán admin; chụp kết quả.
6. Review bằng mẫu reviewer; polish → re-review đến khi SEALED.
7. riskGate; doc-writer cập nhật docs; commit theo conventional (`feat(admin): …`, `docs: …`), nhánh `feature.new.admin_user`; tạo issue trên `huuhv-0372/aidd-mock-project` (`gh … -R huuhv-0372/aidd-mock-project`, `gh` mặc định trỏ upstream) **sau khi chủ dự án duyệt plan**, PR `Closes #N`.

## Todo
- [x] vitest, lint, build xanh
- [x] E2E mới ×3 + đầy đủ xanh
- [x] Visual 1440/768/375
- [ ] SQL thật PASS + gán admin + đăng nhập thật: SQL PASS 24/24; gán admin và đăng nhập Google thật chưa ghi nhận (chủ dự án)
- [x] Review SEALED, riskGate ký
- [x] Docs, commit, issue, PR: docs xong, issue #21, commit `78a17b6` + `cad306e`, PR #22

## Success Criteria
Đủ 8 cổng ở Requirements, mỗi cổng có số/ảnh/exit code ghi lại; không tiêu chí nào "xanh nhờ nới".

## Risk Assessment
- Fake lệch SQL nên E2E xanh nhưng thật hỏng (Trung × Cao): SQL verify thật + kiểm tay là cổng bắt buộc.
- Build dừng ở cảnh báo Next 16.4.0 (đã gặp, Thấp): chạy lại, ghi nhận; nâng Next là việc chủ dự án.
- Đăng nhập thật hỏng sau migration (Rất thấp × Rất cao): file down sẵn; chạy ngoài giờ cao điểm; kiểm một lần đăng nhập ngay sau khi chạy.
- Không có admin nào sau migration → không ai vào `/admin`: chủ dự án chạy SQL gán admin; ghi rõ trong README và báo cáo.
- Kích thước Worker tăng (Thấp): đo; không thêm thư viện.
- Ai đó hạ nhầm admin duy nhất qua SQL tay: ghi trong README cách gán lại.

## Security Considerations
Xác nhận lại bằng bằng chứng, không bằng suy diễn: người thường không đọc được email qua `/admin/**`, RPC, route CSV; `role` không ghi được qua API; hạ quyền có hiệu lực ngay; CSV không chạy công thức; lỗi không lộ `err.message`/stack; không secret nào vào repo.

## Next Steps
Sau merge: cập nhật `status: completed` và mục "Kết quả" trong `plan.md`; việc tách (không làm lần này): trang Overview/Review content/Settings, audit đổi vai trò, nhập phòng ban cho profile, mở rộng `next` sau đăng nhập cho `/admin`.
