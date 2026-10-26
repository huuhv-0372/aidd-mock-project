---
phase: 07
title: "Tích hợp dữ liệu thật, i18n VI/EN, GREEN, visual, review, docs"
status: completed
owner: implementer + tester
effort: 1.5h
test_policy: e2e-red-first
blocked_by: [02, 03, 04, 05, 06]
---

# Phase 07 — Tích hợp + GREEN

## Goal
Nối UI (04–06) với tầng dữ liệu (03), thêm từ điển VI/EN, chạy lại đúng lệnh RED của 01 cho GREEN, so ảnh với Figma, review, cập nhật docs.

## Owned files
- Edit: `app/[locale]/sun-kudos/page.tsx` (đọc `searchParams` → `parseKudosFilters`; mỗi khu bọc `<Suspense>` + skeleton; truyền `loadMoreKudos`), các component 04–06 chỉ ở chỗ nhận props/chuỗi; `messages/vi/index.ts`, `messages/en/index.ts`.
- Create: `messages/vi/kudos.ts`, `messages/en/kudos.ts` (`satisfies` kiểu VI), `reports/en-localizations.md` (bổ sung mục Kudos).
- Delete: mọi `*.fixtures.ts` dựng UI của 04–06.

## Steps
1. Gom chuỗi giao diện vào `messages/*/kudos.ts`; EN qua `list_file_localizations(fileKey, sourceTexts)`; chuỗi không có → tự dịch + `/* not from Figma */`. Tên hashtag/quà chọn cột `name_vi`/`name_en` theo locale.
2. Nối dữ liệu: `getKudosBoardData(filters)` một lần ở page; khối `null` → thông điệp lỗi chung tại khối đó (không vỡ cả trang).
3. `npm run lint`, `npx tsc --noEmit`, `npm test`, rồi **một lần** `npm run test:e2e` (đúng `redCommand` của 01 + toàn bộ spec cũ). Không sửa assertion để cho xanh; sửa selector sai thì ghi log trong `reports/e2e-green-evidence.md`. Spec nhạy thời gian (carousel, infinite scroll) chạy `--repeat-each=5`.
4. Visual (tester, Playwright MCP): 1440 và 375, VI + EN, so với `get_frame_image(MaZUn5xHXZ)`; lưu `reports/visual/*.png`; lệch đáng kể → trả về `momorph-ui-implementer` sửa đúng phần đó.
5. Kiểm trên dữ liệu thật: chạy migration + seed (02) trên Supabase, đăng nhập Google, mở `/sun-kudos`, thử lọc, cuộn, copy link. Ghi kết quả.
6. `npm run preview` (OpenNext): trang `/sun-kudos` không lỗi 1101, avatar Google hiện; kiểm kích thước Worker sau build.
7. Review 1 lượt (template `skills/_shared/templates/reviewer-prompt-template.md`), tập trung: RPC definer, RLS, Server Action, không lộ lỗi. Sửa → chạy lại bước 3.
8. Docs: `docs/project-changelog.md`, `docs/codebase-summary.md` (mục Sun* Kudos + DB), cập nhật `plan.md` (status, effort thực tế).

## Scope Contract
- **Changed:** route `/sun-kudos`, `components/kudos/*`, `lib/kudos/*`, `lib/validation/kudos.ts`, `routes.ts`, `messages/*/kudos.ts`, migration Kudos (+FK `profiles.department`), fake Supabase.
- **Impacted:** đăng nhập (FK trên `profiles`), header (link active), từ điển (`Dictionary` type), fake Supabase dùng chung với spec homepage/awards/language.
- **Will verify:** unit (logic thuần), E2E toàn bộ (fake Supabase đổi → chạy hết spec cũ), verify SQL trên DB thật, đăng nhập thật 1 lần, preview OpenNext.
- **Deliberately skipped:** toggle tim, viết Kudo, Secret Box, trang chi tiết/profile — chưa tồn tại trong plan này.
- Safety-critical (migration, RLS, dữ liệu): chạy đầy đủ, không rút gọn; cần người ký duyệt trước commit.

## Success criteria
- [x] E2E 01 GREEN (94/94, kudos ×5 100/100), spec cũ vẫn GREEN; lint/tsc/unit 0 lỗi; `next build` 0 lỗi (trong `test:e2e`).
- [ ] Ảnh 1440/375 khớp Figma: chưa đo pixel, chỉ so bố cục bằng mắt (`reports/visual-check.md`).
- [x] EN đổi toàn bộ chuỗi (E2E ID-12 green; chuỗi không có trong Figma đánh dấu `/* not from Figma */`).
- [x] Review không còn critical (SEALED 9, criticalCount 0).
- [x] Docs cập nhật: changelog 2026-10-15, `codebase-summary.md`, `docs/system/permissions.md`, README (doc-writer).
- [ ] Commit `feat(kudos): ...`: chờ riskGate sign-off và DB thật.

## Risks
| Risk | L/I | Counter |
|------|-----|---------|
| E2E đọc server cũ (port 3100–3103 còn sống) | M/H | `netstat` trước khi chạy (memory: stale server) |
| `<Suspense>` treo trên Workers | L/H | `cacheComponents` vẫn tắt; kiểm bằng `npm run preview` (bước 6) |
| Subagent báo "all green" sai | M/M | Controller tự chạy lại lệnh E2E và đọc exit code |

## MoMorph refs:
- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
- Clarifications: plans/261015-1010-sun-kudos-live-board/clarifications.md
- testPolicy: e2e-red-first

## Completion notes (2026-10-15)
- [x] Bước 1–3: chuỗi gom vào `messages/{vi,en}/kudos.ts`; lint, tsc, vitest 312/312, `test:e2e` 94/94, kudos ×5 100/100 (`evidence/temper-results.json`). Lần chạy đầu 7 case lỗi, 4 nguyên nhân: 2 lỗi sản phẩm (role=status trùng; khoảng trắng ở stats), 2 lỗi selector test, 1 assertion cũ awards-nav — `reports/e2e-green-evidence.md`.
- [x] Bước 4 một phần: captures 1440/375 VI+EN; không tràn ngang; focus thấy được; dropdown 1 Tab stop; overlap 0 ở 15 bề rộng. **Chưa so pixel với `get_frame_image`.**
- [ ] Bước 5 — **chưa làm**: chạy migration → verify → seed trên Supabase thật; đăng nhập Google; thử lọc/cuộn/copy link. Owner: hoang.van.huu (plan việc 1–2).
- [ ] Bước 6 — **chưa có bằng chứng**: `npm run preview` (OpenNext), 1101, avatar Google, kích thước Worker. Số ~2.17 MiB gzip chỉ có trong báo cáo điều phối, không có log trong `reports/`. Owner: main agent (plan việc 5).
- [x] Bước 7: review SEALED 9 (round 1 → round 2 → sealed, criticalCount 0).
- [x] Bước 8 — docs: xong (changelog 2026-10-15, codebase-summary, permissions, README).
- Trạng thái: in-review. Đóng khi có kết quả bước 5 (SQL + đăng nhập thật), preview có đăng nhập, và riskGate sign-off. Build OpenNext + gzip 2219 KiB: `reports/e2e-green-evidence.md`.
