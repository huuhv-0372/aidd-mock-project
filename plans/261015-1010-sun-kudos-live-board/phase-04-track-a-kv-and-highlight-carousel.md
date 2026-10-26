---
phase: 04
title: "Track A: route /sun-kudos, KV banner, Highlight carousel, card Kudo, dropdown lọc"
status: completed
owner: momorph-ui-implementer
effort: 3h
test_policy: e2e-red-first
blocked_by: [01]
---

# Phase 04 — KV + Highlight

**Screen:** `MaZUn5xHXZ` nodes A `2940:13437`, A.1 `2940:13449`, B `2940:13451`, card highlight `2940:13465` (component `n56Yyp7Klu`), nav slide `2940:13471`; dropdown `JWpsISMAaM` (`721:5580`), `WXK5AYB_rG` (`721:5684`); hover danh hiệu `twC9br89ra` / `IjeDnHmzou` / `d6zEZ9ccoX` / `XI0QKVv1qZ`.
**Goal:** `app/[locale]/sun-kudos/page.tsx` (khung như `awards-information/page.tsx`, `activeHref=SUN_KUDOS_PATH`) + KV + khu Highlight đúng từng pixel, nhận dữ liệu qua props kiểu `lib/kudos/kudo-types.ts`.
**Owned:** `app/[locale]/sun-kudos/page.tsx`, `components/kudos/kudos-kv-banner.tsx`, `kudos-compose-trigger.tsx`, `highlight-kudos-section.tsx`, `highlight-carousel.tsx` (client lá), `kudo-person.tsx` (avatar + tên + phòng ban + hoa thị + badge Hero + tooltip), `kudo-highlight-card.tsx`, `kudo-hashtag-list.tsx`, `kudo-hearts.tsx`, `copy-kudo-link-button.tsx` (client, toast), `kudos-filter-dropdown.tsx` (client, listbox, cập nhật URL qua `buildKudosFilterHref`), `kudos-section-header.tsx`; `public/images/kudos/**` (KV, logo KUDOS, badge Hero, icon; **thêm** `demo/avatar-0{1..4}.png`, `demo/kudo-photo-0{1..5}.jpg` xuất từ Figma cho seed 02); token mới trong `app/globals.css` (chỉ thêm, đặt khối comment `Sun* Kudos (MaZUn5xHXZ)`).
**Integration contract:** selector đúng `phase-01` § Selector contract; mock data = nội dung Figma trong file `*.fixtures.ts` cạnh component chỉ để dựng (07 xoá khi nối dữ liệu thật). Không gọi Supabase. Carousel: slide giữa nổi, 2 bên mờ + `inert`; `key` theo filter để về 1/n.
**Out of scope:** dữ liệu thật (07), All Kudos/sidebar (05), Spotlight (06), toggle tim (#13), dialog viết Kudo (#12), hover preview profile, chuỗi EN (07).
**Rules:** `"use client"` chỉ ở lá; `min-h-11 min-w-11`; `focus-visible:`; animation trong `motion-safe:`; `next/image` có `sizes`; avatar Google `unoptimized`. Không chạy `next build`/E2E (song song với 03/05/06) — chỉ `tsc`, lint, asset coverage. File ≤ 200 dòng.

## MoMorph refs:
- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
- Clarifications: plans/261015-1010-sun-kudos-live-board/clarifications.md
- testPolicy: e2e-red-first

## Completion notes (2026-10-15)
- [x] Route `app/[locale]/sun-kudos/page.tsx`, KV, Highlight carousel, card, dropdown lọc, copy-link: có đủ file trong `components/kudos/`. E2E ID-1, ID-3, ID-4 (×3), ID-5 xanh (94/94; kudos ×5 100/100).
- [x] Mobile: hashtag 25/25 đạt 44px ở 375; không tràn ngang 1440/375 VI+EN (`reports/visual-check.md`).
- [ ] **Đúng từng pixel so với Figma: chưa đo.** Visual check chỉ so bố cục bằng mắt (`reports/visual-check.md`: "no exact claim"). Không đóng phase cho đến khi có số đo hoặc người dùng chấp nhận so sánh bố cục.
- Lệch có chủ đích (xem plan Scope drift): hashtag trên card là link; KV "Hệ thống ghi nhận và cảm ơn"; badge New Hero vẽ bằng CSS (theo ghi chú bàn giao).
- Còn mở: lệch node font/ticker so với Figma cần người dùng chấp nhận (plan việc 8).
