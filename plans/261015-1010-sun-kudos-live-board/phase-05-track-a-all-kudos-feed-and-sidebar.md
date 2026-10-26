---
phase: 05
title: "Track A: All Kudos feed (infinite scroll, gallery) + sidebar thống kê, 10 Sunner nhận quà"
status: completed
owner: momorph-ui-implementer
effort: 2.5h
test_policy: e2e-red-first
blocked_by: [01, 04]
---

# Phase 05 — All Kudos + sidebar

**Screen:** `MaZUn5xHXZ` nodes C `2940:13475`, header `2940:14221`, list `2940:13482`, post `3127:21871` (component `Qhg3SUg_8L`), D `2940:13488`, D.1 `2940:13489`, D.3 `2940:13510`.
**Goal:** Khu All Kudos + cột phải đúng từng pixel ở 1440 và co về 1 cột ở mobile; dùng lại `kudo-person`, `kudo-hashtag-list`, `kudo-hearts`, `copy-kudo-link-button`, `kudos-section-header` của 04 (cần 04 xong các file đó).
**Owned:** `components/kudos/all-kudos-section.tsx`, `kudo-post-card.tsx`, `kudo-image-gallery.tsx` (client, `<dialog>` ảnh lớn, Esc/click nền đóng, trả focus), `kudos-feed-list.tsx` (client lá: IntersectionObserver sentinel gọi `loadMoreKudos`, khử trùng theo id, trạng thái đang tải / hết / lỗi + nút thử lại), `kudos-stats-panel.tsx` (5 số + divider + nút `Mở Secret Box` `aria-disabled`), `gift-recipients-list.tsx` (cuộn độc lập, rỗng `Chưa có dữ liệu`), `kudos-empty-state.tsx`.
**Integration contract:** selector `phase-01`; `kudos-feed-list` nhận `initialItems`, `initialCursor`, `filters`, và hàm `loadMore` qua props (07 truyền action thật từ 03); mock = nội dung Figma. Card feed: nội dung 5 dòng, ảnh ≤5, không có "Xem chi tiết" (đúng Figma C.3).
**Out of scope:** dữ liệu thật + action thật (07), Highlight (04), Spotlight (06), toggle tim, Mở Secret Box, danh sách "thăng hạng".
**Rules:** như phase 04 (client lá, 44px, focus-visible, motion-safe, `sizes`, không build/E2E, ≤200 dòng).

## MoMorph refs:
- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
- Clarifications: plans/261015-1010-sun-kudos-live-board/clarifications.md
- testPolicy: e2e-red-first

## Completion notes (2026-10-15)
- [x] Feed 10 card, infinite scroll không trùng id, empty state, sidebar 5 số + 10 người nhận quà, `Chưa có dữ liệu`: E2E ID-6, ID-9, ID-10 xanh (94/94; kudos ×5 100/100).
- [x] Ảnh cuối feed: 4/4 complete ở cả 2 bề rộng (lỗi "ô trắng" là lazy-load, không phải asset hỏng) (`reports/visual-check.md`).
- [x] Tràn ngang 375: không có (scrollWidth = clientWidth).
- [ ] **Pixel Figma (C, D): chưa đo.** Như phase 04.
- [ ] **Sidebar 5 hay 6 dòng**: specs D.1 ghi 6 dòng số liệu, build có 5; chưa chốt (plan việc 8).
- Ghi chú: `kudos-feed-list.tsx` nhận `initialItems`/`initialCursor`/`filters`; action thật nối ở phase 07.
