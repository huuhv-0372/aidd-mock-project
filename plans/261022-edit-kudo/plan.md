---
title: "Sửa Kudo do mình gửi"
description: "Bút chì trên thẻ Kudo của mình mở modal Viết Kudo ở chế độ sửa, dữ liệu điền sẵn; RPC update_kudo chỉ cho người gửi."
status: completed
priority: P2
effort: 6h
branch: feature.new.edit_kudo
tags: [feature, ui, figma, i18n, database]
blockedBy: []
blocks: []
created: 2026-10-22
work_type: feature
test_policy: e2e-red-first
spec_waived: "SDD mode disabled (takumi.sddMode: off)"
---

# Sửa Kudo

MoMorph `419VXmMy6I` (Figma `1949:13746`, chưa có ảnh/spec). Ảnh: `figma/sua-kudo-1949-13746.png`. Quyết định: [clarifications.md](clarifications.md). GitHub issue #19 (PR sẽ ghi `Closes #19`). Liên quan: `261019-1022-write-kudos` (modal Viết Kudo, `create_kudo`), `261021-profile` (bút chì chỉ khi `is_mine`).

| # | Phase | Owner | Effort | Status |
|---|-------|-------|--------|--------|
| 01 | E2E RED `tests/e2e/edit-kudo.spec.ts` (+ `support/edit-kudo-contract.ts`, fake `update_kudo` + Kudo của chính người dùng có ảnh/hashtag/mention trong fixtures) | tester | 1h | completed (RED 18/18 fail, exit 1; regression 158/158; [báo cáo](reports/tester-261022-red.md)) |
| 02a | UI + hành vi phía client: chế độ `edit` của modal, điền sẵn, khoá người nhận/ẩn danh, ảnh cũ, bộ đếm N/5.000 (cả Viết), nút bút chì, thay thẻ sau khi lưu, messages vi/en | momorph-ui-implementer | 2.5h | completed (kèm polish vòng 1; [báo cáo](reports/ui-261023-edit-kudo.md), [polish](reports/impl-261023-polish-1.md)) |
| 02b | Dữ liệu: migration `20261023100000_create_update_kudo_rpc` (+ down, verify), `lib/kudos/update-kudo-action.ts`, chuyển Markdown → Tiptap JSON, tách helper tải ảnh dùng chung với create, zod, unit | implementer (strong) | 1.75h | completed (SQL thật 11/11 PASS; [báo cáo](reports/impl-261023-02b-data.md)) |
| 03 | GREEN + visual 1440/375 + SQL thật + review + docs + riskGate | tester + reviewer + doc-writer | 0.75h | completed (GREEN 18/18, E2E 317/317; review SEALED 9; riskGate ký 2026-10-23; docs 4 file; commit 8873548 + f68c73d, PR #20) |

02a / 02b song song sau RED, file tách rời; không agent nào build hay chạy E2E (chỉ phase 03).

## Hợp đồng giữa các phase
- Controller viết trước, trong `components/kudos-compose/write-kudo-types.ts`: `EditableKudo`, `UpdateKudoResult = { ok: true; kudo: KudoRow } | { ok: false; error: "validation" | "server" | "not_found"; fields? }`, `WriteKudoActions.updateKudo(formData)`.
- FormData `updateKudo`: `kudoId`, `title`, `content` (Markdown), `hashtags` (lặp), `anonymousName` (chỉ Kudo ẩn danh, không trống), `keepImages` (lặp, URL ảnh cũ còn giữ, theo thứ tự), `images` (lặp, File mới). Không gửi người nhận hay `isAnonymous`.
- 02b: `kudoMarkdownToEditorJson` (`lib/kudos/kudo-content-editor-json.ts`), nghịch đảo của `kudoEditorJsonToMarkdown`; server action `updateKudo` (`lib/kudos/update-kudo-action.ts`): zod → tải ảnh mới → RPC `update_kudo` → xoá ảnh bị bỏ (best effort) → đọc lại qua `kudo_detail(p_id)` (`kudos_rows` không cấp cho `authenticated`).
- 02a: `useKudosComposer().openEditor(kudo)`; provider giữ `Map<id, KudoRow>` các Kudo đã sửa; `KudosFeedList` hiển thị theo id; sau lưu gọi `router.refresh()`. `openComposer()` không đổi.
- E2E (01): `tests/e2e/support/edit-kudo-contract.ts` là nguồn selector/chữ; 02a/02b chỉ đọc.

## Kết quả (2026-10-23)
- **Đã xong:** 01, 02a, 02b, 03, docs (README, changelog, permissions, codebase-summary), commit `8873548` + `f68c73d`, PR #20 (`Closes #19`). Trên cây: edit-kudo 18/18 (lặp ×3: 54/54, 0 flaky), full E2E 317/317, vitest 922/922, lint 0, build ok (lần đầu dừng ở cảnh báo Next 16.4.0, chạy lại thì pass), Worker gzip 2258 KiB (Profile 2259, không tăng).
- **SQL thật:** migration + verify trên Supabase 11/11 PASS (P1, U0–U9: Kudo người khác và không tồn tại cùng `not_found`, forbidden, anon 42501).
- **Review:** lượt 1 REWORK 8 (M1 link chứa mention mất link khi lưu không đổi; L2 origin ảnh) → polish vòng 1 → re-review SEALED 9, 0 Critical/High.
- **riskGate:** chủ dự án ký 2026-10-23 (`evidence/inspection-verdict.json` humanSignedOff true; `clarifications.md`).
- **Lệch kế hoạch:**
  - Đọc lại qua `kudo_detail(p_id)` thay `kudos_rows` (đã ghi trong contract).
  - Polish vòng 1 thêm vào: CRLF → LF ở schema nội dung dùng chung; mention có link; chỉ nhận và xoá ảnh thuộc origin Supabase; converter nạp trong chunk modal; hashtag rỗng báo lỗi.
  - CRLF cũng đổi Viết Kudo (create lưu LF). Dữ liệu cũ có CRLF không migrate, hiển thị như cũ.
  - Nhãn biệt danh nằm cùng hàng bên trái ô nhập ở cả Viết và Sửa, chữ "Tên ẩn danh", không dấu `*`.
  - Xoá hết hashtag hiện "Không được để trống" ở cả Viết (trước chỉ Sửa).
  - Test-only: spec chờ chip seed render trước khi xoá; sửa regex nhãn EN. Không nới assertion.
  - Effort thực tế: chưa ghi nhận.
- **Lệch visual, owner chấp nhận:** có dòng Danh hiệu; người nhận khoá, không mũi tên; bộ đếm N/5.000 (ảnh 1.000); chip 40px (ảnh 48px); link "Tiêu chuẩn cộng đồng" giữ ở cả hai chế độ; nhãn "Tên ẩn danh" (ảnh "Nickname ẩn danh*").
- **Deferred Low** (`reports/reviewer-261023-rereview-1.md`, không chặn):
  - U+E000–E008 trong nội dung bị đổi khi lưu; last-write-wins giữa hai tab.
  - Overlay `savedKudos` không hết hạn; `kudo_images.image_url` chưa index.
  - Bộ đếm chưa nằm trong `aria-describedby`; fake `update_kudo` không lọc Kudo khác (SQL U4/U6 chứng minh).
  - `hasOnlySafeLinks` bỏ qua link có nhãn chứa mention (có sẵn, chưa khai thác được); so khớp ảnh giữ/xoá theo chuỗi thô.
  - View Kudo chưa render link mention (follow-up từ polish).
- **Còn lại (chưa đóng):**
  - Commit + PR: xong (PR #20, chờ merge).
  - Docs: doc-writer, song song. Xong khi roadmap, changelog, system-architecture, code-standards cập nhật theo `update_kudo`.
  - Nâng Next 16.4.0 hay không (build dừng cảnh báo bảo mật lần đầu): chủ dự án. Xong khi có quyết định ghi vào docs.
  - 3 file test vượt 200 dòng (`kudo-content-editor-json.test.ts` 212, `update-kudo-action.test.ts` 224, `edit-kudo.spec.ts` 321): controller. Xong khi tách file hoặc ghi nhận chấp nhận.

## Ước lượng
~6h, ~25 file. Thực tế: 33 file (19 sửa, 14 mới), chưa tính docs.

## Rủi ro
- Sửa Kudo của người khác → **đóng**: SQL U6/U8 và E2E không có bút chì trên Kudo người khác đều PASS.
- Lộ người gửi ẩn danh qua ảnh → **mở**: tên `{uuid}.{ext}` phẳng như create, không đổi `is_anonymous`.
- Mất dữ liệu khi chuyển Markdown → **đóng**: unit round-trip; E2E lưu không đổi giữ nguyên byte-for-byte.
- Ảnh mồ côi trên Storage → **đóng**: unit và E2E (xoá ảnh mới khi lỗi, xoá ảnh bị bỏ sau khi thành công).
- Đổi modal dùng chung → **đóng**: E2E Viết Kudo nằm trong 317/317.
- Migration + security definer → **đóng**: SQL thật 11/11, riskGate ký.
- Cảnh báo Next 16.4.0 làm build dừng lần đầu → **mở**: chủ dự án quyết (xem Còn lại).
