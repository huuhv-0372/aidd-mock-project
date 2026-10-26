# Phase 06 — Tích hợp 3 màn, i18n, GREEN, visual, review, docs

**Owner:** implementer + tester (+ người dùng chạy SQL) · **Status:** completed (2026-10-19: success criteria đạt — E2E 183/183, unit 501, lint 0, tsc 0, verify SQL 16/16 PASS thật, Worker gzip 2220.10 KiB < 3072, review SEALED 9 không Critical/High, riskGate ký. Bước 4 SQL thật và 9 thử thật xong (`reports/db-verify-result.md`; thử 1 ảnh + 1 ẩn danh gửi riêng). Rủi ro 5 × 5 MB: workerd local OK, owner chấp nhận chưa thử Worker deploy. Bước 10 docs do doc-writer. Còn commit, xem "Việc còn lại" trong plan.md) · Blocked by: 02–05

## Files (sở hữu)
- Tạo: `components/kudos-compose/kudos-composer-provider.tsx` (context `openComposer`/`openRules`, render `KudosRulesDialog` + `WriteKudoDialog` qua `next/dynamic({ ssr:false })`), `components/kudos-compose/widget-session-gate.tsx` (server, dưới `<Suspense>`: đọc `getIsAuthenticated()` → widget có/không `writeKudoHref=/login`).
- Sửa: `app/[locale]/page.tsx`, `app/[locale]/awards-information/page.tsx`, `app/[locale]/sun-kudos/page.tsx` (bọc provider, thay `<WidgetButton>`), `components/kudos/kudos-compose-trigger.tsx` (pill A.1 hết `aria-disabled`, gọi `openComposer`; pill tìm profile giữ nguyên), `messages/{vi,en}/kudos.ts` (+ `shell.ts` cho nhãn menu), `reports/en-localizations.md`.

## Steps
1. Provider + gate + wiring 3 page. Homepage giữ public: chỉ phần widget đọc phiên, trong `<Suspense>` (fallback = widget đóng).
2. Gửi xong: `onSent` → đóng modal + `router.refresh()`. Kiểm `AllKudosSection` (state client `initialItems`) có nhận dữ liệu mới không; nếu không, `key` theo phiên bản dữ liệu để feed reset.
3. i18n VI/EN mọi chuỗi mới (VI nguyên văn Figma).
4. Người dùng chạy migration + verify phase 02 trên Supabase thật → `reports/db-verify-result.md`.
5. GREEN: `npm run lint` · `npx tsc --noEmit` · `npm test` · `npm run test:e2e` (toàn bộ — đụng auth/DB/public interface) · kudos specs `--repeat-each=5`. Kiểm port 3100–3102 trước.
6. Visual (tester, Playwright MCP): 1440 + 375, VI + EN — modal, dropdown, Add link, menu, Thể lệ; focus thấy được; vùng chạm ≥44px; không tràn ngang; modal cuộn được trên 375.
7. `npm run build` + OpenNext build: ghi gzip Worker (mốc 2219 KiB) — Tiptap không được vào bundle server.
8. Review (template `skills/_shared/templates/reviewer-prompt-template.md`) kèm **checklist SQL**: sender lấy từ `auth.uid()`; `search_path=''`; kiểm `is_allowed_account`; không lộ email/sender ẩn danh; ảnh chỉ trong thư mục mình + object tồn tại; grants chỉ `authenticated`; policy Storage không cho UPDATE/SELECT. Kèm checklist app: không `err.message` ra client, zod trước logic, URL link chỉ http/https, magic bytes.
9. Thử thật: đăng nhập Google, gửi 1 Kudo có 2 ảnh + ẩn danh từ Homepage, thấy trên /sun-kudos (người dùng).
10. Docs: `docs/project-changelog.md`, `docs/codebase-summary.md`, `docs/system/permissions.md` (RPC + Storage policy), README nếu có lệnh mới; cập nhật plan Homepage (ID-54 xong).

## Success
Mọi ca RED của phase 01 GREEN; unit xanh; review không còn Critical/High; verify SQL PASS; Worker < 3 MiB gzip.

## Risk
- Body Server Action 5×5 MB qua proxy + Worker: thử 1 lần với 5 ảnh ~5 MB trên `npm run preview`; quá giới hạn → giảm 3 MB/ảnh (ghi clarifications).
- `router.refresh()` không reset feed client → bước 2.
- Homepage chuyển sang đọc cookie trong Suspense: kiểm không mất cache/prefetch phần tĩnh.
