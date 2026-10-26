# Phase 04 — Tích hợp, GREEN, review, docs

**Context:** [plan.md](plan.md) · phase-02, phase-03 · `docs/project-changelog.md`, `docs/codebase-summary.md`.

## Overview
Priority P2 · Status completed · 1h · Owner implementer + tester.
Open items and owners: see [plan.md](plan.md) → "Việc còn lại".

## Scope Contract
- **Changed:** proxy rewrite, cấu trúc `app/[locale]`, Server Action đặt cookie, từ điển, ~25 component.
- **Impacted:** gate countdown, auth redirect + cookie phiên Supabase (proxy), mọi trang (route dời), 404.
- **Will verify:** unit `locale.test.ts`; E2E `language-switch.spec.ts`; **full E2E suite** (proxy + session
  là safety-critical → chạy đủ); `npm run build`, `npm run lint`.
- **Deliberately skipped:** không có — đụng proxy/session nên chạy hết.

## Implementation Steps
1. Ghép 02 + 03, `npm run build` (một mình, không song song E2E).
2. `npm test` + `npx playwright test` toàn bộ; sửa tới xanh, không nới assertion.
3. Kiểm tra tay 375px / 1440px ở EN: nav, footer, nút CTA không tràn.
4. Review một lượt (template `skills/_shared/templates/reviewer-prompt-template.md`): tập trung rewrite giữ
   cookie, catch-all 404, validate action.
5. Docs: changelog (ghi chú bản dịch MoMorph chưa review), codebase-summary (`lib/i18n`, `messages/`).
6. Cập nhật `261012-1549-homepage-saa`: ID-25/26 đã làm ở plan này.

## Todo
- [x] build · [x] unit + full E2E xanh (199/199, 70/70) · [x] check mobile EN (`reports/visual-check.md` §2: không tràn ngang ở 375/1440) · [x] review (SEALED 9) · [x] docs (changelog, codebase-summary, permissions, F001 technical-spec, README) · [x] commit feat(i18n) (riskGate ký duyệt 2026-10-14)

## Success Criteria
Mọi test xanh với bằng chứng chạy thật; homepage ID-10/24/25/26/58 + login language cases đạt.

## Risks
Test cũ dùng text VI làm selector — vẫn đúng vì mặc định `vi`; nếu test nào đặt cookie, kiểm tra lại.

## Security
Review xác nhận: không lộ segment `/vi`/`/en` ra URL công khai, cookie chỉ nhận giá trị hợp lệ.
