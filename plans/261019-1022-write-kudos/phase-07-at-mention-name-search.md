# Phase 07 — "@ + tên": mention trong nội dung và tiền tố @ ở Người nhận

**Owner:** implementer (RED-first) · **Priority:** P1 · **Status:** completed (2026-10-19: unit 501, E2E 183/183, write-kudo repeat-each=2 146/146, tsc 0, lint 0; migration + verify trên Supabase thật 16/16 PASS gồm S3, B3, B5 theo chữ ký 3 tham số; re-review SEALED 9 sau fix PluginKey của mention) · Safety-critical (đổi chữ ký RPC) → test + review đầy đủ

## Context
- Spec D / D.1 (`viet-kudo-ihQ26W78P2`): "'@'+tên: gợi ý để nhắc đồng nghiệp"; ID-12 "Cảm ơn @" → hiện danh sách; ID-13/33.
- Người dùng (2026-10-19): tìm người nhận đã ổn; cần "@ + tên" theo spec ở **cả hai** chỗ (xem clarifications).
- Hiện trạng: `kudo-mention-extension.ts` `minQueryLength: 1`, không `allowSpaces`, không báo rỗng; RPC `kudos_search_sunners` trả rỗng khi chuỗi trống, khớp tên OR email.

## Thay đổi
1. SQL `supabase/migrations/20261019110000_create_kudo_write.sql`: `kudos_search_sunners(p_query text, p_limit int default 10, p_name_only boolean default false)`. `drop function if exists public.kudos_search_sunners(text, integer)` trước khi tạo (tránh overload), cấp lại grant. Chuỗi trống (sau trim) → trả tối đa `p_limit` Sunner theo `full_name, id` (bỏ người gọi, chỉ người có `full_name`). `p_name_only` → bỏ nhánh email. Giữ mọi điều khác (definer, search_path, kiểm tài khoản, escape LIKE, không trả email). Rollback + verify B5 cập nhật (rỗng → ≤10 không có người gọi; name_only không khớp email).
2. Action `lib/kudos/search-sunners-action.ts`: `searchSunners(query, options?: { nameOnly?: boolean })`; zod cho phép chuỗi rỗng (0–50 sau trim).
3. Editor `components/kudos-compose/kudo-mention-extension.ts` (+ `mention-suggestion-list.tsx`, `use-mention-popup.ts`): `minQueryLength: 0`, `allowSpaces: true`, gọi `nameOnly: true`; danh sách rỗng → hàng trạng thái "Không tìm thấy Sunner phù hợp" (dùng lại copy `noResult`), không phải option; Esc đóng danh sách.
4. Người nhận `recipient-picker.tsx`: chuỗi bắt đầu bằng `@` → bỏ `@`, `nameOnly: true` (`@` đứng một mình → danh sách đầu); không có `@` → như cũ (tên + email).
5. Fake `tests/e2e/support/write-kudo-fixtures.mjs` mirror `p_name_only` + chuỗi rỗng.

## Test (RED trước)
E2E `write-kudo.spec.ts`: ID-12 "Cảm ơn @" hiện danh sách; "@Nguyễn Văn" (có dấu cách) lọc đúng và chèn mention; "@zzz" → hàng không tìm thấy; mention không khớp theo email (gõ "@nguyen.van.an@" → không có kết quả); Người nhận "@Văn An" → gợi ý theo tên, "@" một mình → danh sách, "@nguyen.van.an" (email) → không gợi ý; không "@" vẫn khớp email. Unit: zod query rỗng, action truyền `p_name_only`.

## Success
E2E full + unit + tsc + lint xanh; re-review scoped; người dùng chạy lại migration + verify (B5) PASS.
