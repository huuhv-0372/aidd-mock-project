---
title: "Trang Tiêu chuẩn chung (Tiêu chuẩn cộng đồng + bảo mật), gắn link từ Viết Kudo và footer"
description: "Trang công khai /tieu-chuan-chung theo Figma 1161:8944; link 'Tiêu chuẩn cộng đồng' (toolbar Viết Kudo) và 'Tiêu chuẩn chung' (footer) hết 404."
status: completed
priority: P2
effort: 2h
branch: main
tags: [feature, ui, figma, i18n]
blockedBy: []
blocks: []
created: 2026-10-21
work_type: feature
test_policy: e2e-red-first
spec_waived: "SDD mode disabled (takumi.sddMode: off)"
---

# Trang Tiêu chuẩn chung

Figma web `1161:8944` (ảnh export: `figma/standards-1161-8944-1440.png`), iOS `xms7csmDhD`. Quyết định: [clarifications.md](clarifications.md).

| # | Phase | Owner | Effort | Status |
|---|-------|-------|--------|--------|
| 01 | E2E RED: khách mở trang, nội dung, link toolbar + footer, aria-current, VI/EN | tester | 0.5h | completed (RED 10/10) |
| 02 | UI: route `app/[locale]/tieu-chuan-chung/page.tsx`, `components/standards/*`, `SiteFooter activeHref`, `PUBLIC_PATHS`, messages vi/en | momorph-ui-implementer | 1h | completed (+1 vòng sửa giao diện) |
| 03 | GREEN + visual so ảnh Figma (1440, 375), review, docs | tester + reviewer + doc-writer | 0.5h | completed (E2E 218/218, SEALED 9, riskGate ký, commit 4ef955b + 343e91a) |

## File dự kiến (~12)
- Mới: `app/[locale]/tieu-chuan-chung/page.tsx`, `components/standards/standards-hero.tsx`, `components/standards/standards-content.tsx`, `messages/vi/standards.ts`, `messages/en/standards.ts`, `tests/e2e/standards.spec.ts`.
- Sửa: `lib/auth/constants.ts` (PUBLIC_PATHS), `components/site-shell/site-footer.tsx` (activeHref + aria-current), `messages/{vi,en}/index.ts`, `tests/unit/*` nếu có test PUBLIC_PATHS, docs (README / codebase-summary / changelog / permissions: trang công khai mới).

## Rủi ro
- Không có giá trị Figma (font size, gradient) → đo từ ảnh export 1x; lệch ghi `reports/visual-check.md`.
- Thêm trang công khai: thay đổi auth gate (safety-critical) → full E2E + review.
