---
title: "Trang lỗi 404 (thiết kế lại) và 403 (mới, forbidden())"
description: "404 theo Figma 1378:5063, 403 theo Figma 2182:9291; cả hai giữ nút về trang chủ; /403 + forbidden() sẵn dùng."
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

# Trang lỗi 404 + 403

Figma: 404 `1378:5063` (MoMorph `p0yJ89B-9_`), 403 `2182:9291` (MoMorph `T3e_iS9PCL`). Ảnh tham chiếu: `figma/`. Quyết định: [clarifications.md](clarifications.md).

| # | Phase | Owner | Effort | Status |
|---|-------|-------|--------|--------|
| 01 | E2E RED: 404 (status, heading, mô tả, ảnh robot, nút), 403 (/403 status 403, heading, ảnh, nút), VI/EN, 375 | tester | 0.5h | completed (RED 10/11) |
| 02a | UI: `components/errors/*` (khung chung: nền + lớp phủ + tiêu đề + hình + mô tả + nút), restyle `NotFoundContent`, `AccessDeniedContent`, messages vi/en | momorph-ui-implementer | 1h | completed |
| 02b | Hành vi: `experimental.authInterrupts`, `app/[locale]/forbidden.tsx`, `app/[locale]/403/page.tsx` gọi `forbidden()`, `PUBLIC_PATHS` + unit | implementer | 0.5h | completed |
| 03 | GREEN + visual + review + docs | tester + reviewer + doc-writer | 0.5h | completed (E2E 229/229, SEALED 8.6, riskGate ký, commit 6eaafdf + 61ac717) |

Hợp đồng 02a ↔ 02b: `components/errors/access-denied-content.tsx` export `AccessDeniedContent({ copy }: { copy: Record<Locale, Dictionary["forbidden"]> })`, cùng kiểu với `NotFoundContent` (client leaf, tự chọn locale theo param). Dictionary thêm khoá `forbidden` { metaTitle, title, body, homeLink }.

## Rủi ro
- `forbidden.tsx` + root layout nằm trong `app/[locale]`: phải kiểm theo docs Next 16 nơi đặt file và hành vi trên OpenNext/Workers (build + preview không lỗi).
- Thêm `/403` vào `PUBLIC_PATHS` + bật cờ experimental: đụng auth gate + config → full E2E + review + ký riskGate.
