---
phase: 06
title: "Track A: Spotlight Board (word cloud, pan/zoom, tìm kiếm, ticker)"
status: completed
owner: momorph-ui-implementer
effort: 2h
test_policy: e2e-red-first
blocked_by: [01]
---

# Phase 06 — Spotlight Board

**Screen:** `MaZUn5xHXZ` nodes B.6 `2940:13476`, B.7 `2940:14174`, tổng `3007:17482`, Pan/Zoom `3007:17479`, search `2940:14833`.
**Goal:** Khung Spotlight đúng Figma (nền, viền bo, tổng `{n} KUDOS`, ô tìm kiếm trái trên, nút Pan/Zoom phải dưới, ticker 5 dòng trái dưới) và canvas tên tương tác: hover → tooltip tên + giờ nhận (`format-kudo-time`), click node → `kudoDetailHref(last_kudo_id)`, Pan/Zoom bật/tắt chế độ kéo + lăn chuột (tắt thì cuộn trang bình thường), tìm kiếm ≤100 ký tự (Enter/kính lúp) → node khớp `data-match="true"` + đưa vào giữa khung; không khớp → dòng thông báo.
**Owned:** `components/kudos/spotlight-section.tsx` (server), `spotlight-board.tsx` (client lá), `spotlight-node.tsx`, `spotlight-search.tsx`, `spotlight-ticker.tsx`, `spotlight-skeleton.tsx` (trạng thái loading cho `<Suspense>`), asset nền spotlight trong `public/images/kudos/`.
**Integration contract:** vị trí node lấy từ `lib/kudos/spotlight-layout.ts`, toán pan/zoom từ `lib/kudos/pan-zoom.ts` (03 sở hữu; nếu chưa xong thì dùng chữ ký đã ghi trong phase 03, không tự viết logic thay). Props kiểu `Spotlight` từ `kudo-types.ts`. Rỗng → text rỗng trong khung. Bàn phím: node là link, Tab đi được; Pan/Zoom có `aria-pressed`.
**Out of scope:** realtime, lọc theo hashtag/phòng ban, dữ liệu thật (07), chuỗi EN (07).
**Rules:** như phase 04; không thêm thư viện (d3...); transform bằng CSS `translate/scale`, `motion-safe:` cho chuyển động; không build/E2E; ≤200 dòng/file.

## MoMorph refs:
- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
- Clarifications: plans/261015-1010-sun-kudos-live-board/clarifications.md
- testPolicy: e2e-red-first

## Completion notes (2026-10-15)
- [x] Tổng `{n} KUDOS`, node link tới `/sun-kudos/{last_kudo_id}`, tooltip, aria-pressed Pan/Zoom, ô tìm kiếm maxlength 100: E2E ID-11 ×3 xanh.
- [x] Chồng chữ: 0 giao nhau giữa node và total/search/ticker/Pan-Zoom ở 15 bề rộng (320–1600) trên DOM thật, 345 node-rect (`evidence/temper-results.json`). Vùng loại trừ đã được review SEALED 9 (fix round 2).
- [x] Unit: `spotlight-layout` 22/22, `pan-zoom` có test.
- [ ] Ngoại lệ: node 16–29px ở 375 (dưới 44px). Là ngoại lệ canvas đặc, chưa được chấp nhận chính thức (plan việc 8).
- [ ] Pixel Figma (B.6/B.7): chưa đo.
- Ticker: `TICKER_HEIGHT` dư ~25px có chủ đích (Low, Accept).
