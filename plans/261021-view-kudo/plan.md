---
title: "View Kudo — trang chi tiết /sun-kudos/{id}"
description: "Figma 520:18779: khung Kudo đầy đủ (nội dung có định dạng, ảnh, hashtag, tim, Copy Link, Đóng); lối vào từ Highlight, Copy Link, thẻ All Kudos; khách đăng nhập xong về đúng Kudo."
status: completed
priority: P2
effort: 5h
branch: main
tags: [feature, ui, figma, i18n, auth, database]
blockedBy: []
blocks: []
created: 2026-10-21
work_type: feature
test_policy: e2e-red-first
spec_waived: "SDD mode disabled (takumi.sddMode: off)"
---

# View Kudo

Figma `520:18779` (MoMorph `onDIohs2bS`, chưa có spec/test case). Ảnh tham chiếu: `figma/`. Quyết định: [clarifications.md](clarifications.md).

**Trạng thái (2026-10-22):** completed. Phase 01–04 xong; evidence gate SEALED (hard) exit 0; riskGate đã ký bởi chủ dự án hoang.van.huu (2026-10-22, ghi trong `clarifications.md`). Còn mở, không chặn đóng plan: owner dán output SQL thật vào `reports/db-verify-result.md`; kiểm `lib/supabase/update-session.ts:49`; Deferred trong phase-04. Commit chờ chủ dự án duyệt, chưa push.

| # | Phase | Owner | Effort | Status |
|---|-------|-------|--------|--------|
| 01 | E2E RED `tests/e2e/kudo-detail.spec.ts` + fake `kudo_detail` | tester | 0.75h | completed (RED 12/15, exit 1) |
| 02a | UI: `KudoDetailCard`, nút Đóng, trang khung (nền + header), thẻ All Kudos → link, messages vi/en | momorph-ui-implementer | 1.5h | completed (+ visual fixes: hashtag wrap, thumb ring, 375 name overlap, KV band + 80% overlay) |
| 02b | Dữ liệu + route: migration `kudo_detail` (+ down, verify), `get-kudo-detail.ts`, `app/[locale]/sun-kudos/[id]/page.tsx`, `KudoRichContent` (Markdown-lite → React) + unit | implementer | 1.25h | completed (SQL thật 6/6 PASS) |
| 02c | Auth `next`: `post-login-next.ts` (allow-list + cookie), `resolveAuthRedirect`, login page/form, `signInWithGoogle`, callback + unit | implementer | 0.75h | completed (preview workerd qua localhost OK) |
| 03 | GREEN + visual + người dùng chạy SQL thật + review + docs + riskGate | tester + reviewer + doc-writer | 0.75h | completed (review 3 vòng SEALED 9.6, riskGate signed, evidence gate SEALED; nguồn `reports/reviewer-261021-final-verdict-sealed-9.6.json`) |
| 04 | [Sửa theo review 2026-10-21: B1–B5, T1–T8, L1, chữ đậm](phase-04-review-fix-round-261022.md) | implementer L ‖ U → tester → reviewer | chưa đo | completed (review re-review SEALED 9.0, evidence gate SEALED exit 0) |

02a / 02b / 02c chạy song song sau RED; không agent nào build hay chạy E2E (build + E2E chạy một lần ở 03).

## Hợp đồng giữa các phase
- `components/kudos/kudo-detail-card.tsx` (02a): `KudoDetailCard({ kudo, locale, copy, content }: { kudo: KudoRow; locale: Locale; copy: KudoDetailCardCopy; content: ReactNode })`. `content` là nội dung đã render do trang (02b) truyền vào.
- `components/kudos/kudo-rich-content.tsx` (02b): `KudoRichContent({ markdown }: { markdown: string })`, server component, không `dangerouslySetInnerHTML`.
- Messages (02a): `dict.kudos.detail = { metaTitle, close, loadError, card: KudoDetailCardCopy }`. Trang (02b) đọc `dict.kudos.detail`. (Bỏ `openDetail`: tên link thẻ All Kudos là chính chữ nội dung.)
- `lib/auth/post-login-next.ts` (02c): `parsePostLoginNext(value: unknown): string | null` (chỉ `^/sun-kudos/<uuid>$`), `POST_LOGIN_NEXT_PARAM = "next"`, `POST_LOGIN_NEXT_COOKIE`.

## Ước lượng
~5h, khoảng 28 file: 10 tạo mới (migration ×3, route, card, nút Đóng, rich content, get-kudo-detail, post-login-next, E2E spec), 12 sửa (post card, messages ×2, resolve-auth-redirect, sign-in action, callback, login page, login form, fake Supabase, routes, unit test cũ), 3 unit test mới, 3–4 docs.
Thực tế: phase 04 thêm một vòng sửa lớn (2 lượt implementer, 2 lượt review). Chưa đo giờ, xem [phase-04 Scope drift](phase-04-review-fix-round-261022.md).

## Bằng chứng
- **2026-10-21 (trước vòng sửa):** E2E 245/245, unit 725/725, lint 0, tsc 0. SQL thật 6/6 PASS do chủ dự án chạy trên Supabase SQL Editor, 14:08 (`evidence/temper-results.json`). Output chưa có trong `reports/`.
- **2026-10-21 (final, trước vòng sửa):** SEALED 9.6, riskGate humanSignedOff true, 15:53 (`reports/reviewer-261021-final-verdict-sealed-9.6.json`).
- **2026-10-22 (vòng sửa B1–B5, T1–T8, L1, chữ đậm; code đóng băng 09:40–10:13 ICT):** lint 0 · tsc 0 · unit 48 file 778/778 · E2E 267/267, 0 flaky · 4 spec `kudo-detail*` ×5 = 190/190 · OpenNext build exit 0 · gzip 2243.72 KiB (HEAD 2241.61, giới hạn 3072 KiB). Review: pass 1 REVISE 8.4 → re-review SEALED 9.0, criticalCount 0, humanSignedOff true (`evidence/inspection-verdict.json`).
- **2026-10-22 (evidence gate):** `evidence-gate.cjs --stage hard` → SEALED (hard), exit 0. riskGate ký bởi hoang.van.huu, ghi trong `clarifications.md` (Session 2026-10-22, kèm quyết định chữ đậm 800/900). Docs: B5 xong, mục 2026-10-22 đã ghi ở `docs/project-changelog.md`, `README.md`, `docs/codebase-summary.md`, `docs/system/permissions.md`.
- Chi tiết, follow-up và việc còn lại: [phase-04](phase-04-review-fix-round-261022.md).

## Rủi ro
- **Đang mở (không chặn):** cookie trên Workers. `saa_post_login_next` đã lỗi không xoá được một lần (đã sửa). `lib/supabase/update-session.ts:49` có cùng mẫu, chưa kiểm, có thể là lỗi có sẵn. Owner: controller (debugger). Việc 8 phase-04.
- **Đang mở (không chặn):** SQL thật chưa có output trong `reports/`. Owner đã báo 6/6 PASS. Owner: chủ dự án dán `reports/db-verify-result.md`. Việc 1 phase-04.
- **Theo dõi:** bundle 2243.72 KiB / 3072 KiB, còn khoảng 828 KiB. Kiểm lại khi thêm dependency.
- **Đã đóng:** Close sau OAuth quay về `/login` (Medium #1). Sửa ở fix round 1, E2E đỏ rồi xanh.
- **Đã đóng:** riskGate, evidence gate, B5 (xem Bằng chứng 2026-10-22).
- **Đã đóng (owner chấp nhận 2026-10-21):** nền KV khác Figma, header phủ tối (`clarifications.md` dòng 36).
- **Đã đóng:** `.github/` untracked không thuộc feature (template issue/PR), sẽ loại khỏi commit.
- **Đã giảm:** renderer trên dữ liệu không tin cậy. Regex tuyến tính, chỉ link http(s), có timing test 50.000 ký tự và escape B2.

## Deferred và scope drift
Đầy đủ trong [phase-04](phase-04-review-fix-round-261022.md): 21 mục Deferred (gồm 7 mục mới của 2026-10-22) và 6 dòng scope drift. Deferred là follow-up, không chặn.
