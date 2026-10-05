---
feature: F001
slug: countdown-prelaunch-screen
status: draft
lang: vi
---

# F001 — Technical Spec: Countdown Prelaunch Screen

## Stack hiện có

Next.js 16.3.8 (App Router), React 19.2.8, TypeScript 5, Tailwind 4. Chưa có Supabase/Cloudflare
trong `package.json` — màn này **không cần DB**, chỉ dùng biến môi trường tĩnh.

## Decision Log

- **D1 — Nguồn target datetime: biến môi trường, không dùng API.**
  Lý do: mốc thời gian sự kiện là cấu hình vận hành (ops), không phải dữ liệu nghiệp vụ thay đổi
  theo user. Một biến môi trường (`NEXT_PUBLIC_EVENT_START_AT`, ISO-8601, ví dụ
  `2026-12-31T18:30:00+07:00`) đơn giản hơn nhiều so với dựng API + DB chỉ để trả về 1 giá trị
  tĩnh. Khớp với cách Homepage SAA đã mô tả, giải quyết mâu thuẫn với spec gốc của màn Countdown
  (ghi "lấy từ API").
- **D2 — Cơ chế khóa điều hướng: Next.js Middleware.**
  Dùng `middleware.ts` ở root, so sánh `Date.now()` với target datetime (đọc từ env, parse server
  -side). Nếu `now < target` và pathname khác `/`: redirect 307 về `/`. Nếu `now >= target`: cho
  qua bình thường, không redirect nữa (kể cả khi truy cập `/`).
  Lý do chọn middleware thay vì check trong từng page: áp dụng toàn site một chỗ duy nhất, không
  cần sửa từng route khi thêm trang mới sau này.
- **D3 — Cập nhật countdown: `setInterval` phía client, tick mỗi giây** để UI mượt dù spec chỉ yêu
  cầu chính xác tới phút; tính lại Days/Hours/Minutes từ `target - now` mỗi tick, không cần
  WebSocket/polling server.

## Component Plan

- `app/page.tsx` — Server Component, route `/`, render `<CountdownScreen targetIso={...} />`.
  `targetIso` đọc từ `process.env.NEXT_PUBLIC_EVENT_START_AT` ở server, truyền xuống làm prop (an
  toàn vì đây không phải secret).
- `app/countdown/countdown-screen.tsx` — Client Component (`"use client"`), nhận `targetIso`,
  dùng `useEffect` + `setInterval` tính `days/hours/minutes` còn lại, tự dừng tick khi về 0.
- `app/countdown/countdown-unit.tsx` — component hiển thị 1 khối 2 chữ số + label (DAYS/HOURS/
  MINUTES), tái sử dụng cho cả 3 khối.
- `middleware.ts` (root) — đọc `NEXT_PUBLIC_EVENT_START_AT`, so sánh, redirect theo D2. Matcher
  loại trừ `/_next/*`, file tĩnh (favicon, assets).
- i18n tiêu đề: tái dùng cơ chế cookie `NEXT_LOCALE` đã ghi trong spec Login — nếu site chưa có
  i18n layer dùng chung, bản triển khai đầu tiên của tính năng này hard-code 2 chuỗi VI/EN theo
  cookie, không dựng i18n framework mới (YAGNI — framework i18n đầy đủ thuộc scope của Header/
  Login, không phải màn này).

## Edge Cases (từ test-cases.csv)

- Biến môi trường không set / sai định dạng ISO-8601 → cần fallback an toàn (không crash site):
  coi như `target = now` (tức mở khóa ngay), log cảnh báo ra console server. Quyết định bảo toàn
  khả dụng của site hơn là chặn cứng khi cấu hình sai.
- Giá trị Days/Hours/Minutes luôn `Math.max(0, ...)` và pad 2 chữ số (`String(n).padStart(2, '0')`).
