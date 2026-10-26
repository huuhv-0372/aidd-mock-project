# Phase 04 — Track A: nút tim + store đồng bộ + toast

**Owner:** momorph-ui-implementer (mode: section) · **Status:** completed (E2E 9/9 xanh; chiều rộng 101px owner chấp nhận, xem plan.md "Việc còn lại") · **Effort:** 1h · **test_policy: e2e-red-first**
Screen: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ — C.4.1 `I3127:21871;256:5175`, Highlight `I2940:13465;335:9462`.
Goal: biến `KudoHearts` từ `<span role=img>` thành nút bấm theo [clarifications.md](clarifications.md); RED ở `tests/e2e/kudo-hearts.spec.ts` (phase 01).

**Files (sở hữu):**
- Tạo `components/kudos/kudo-hearts-store.tsx` ("use client"): context `Map<kudoId, {liked, count, pending}>` chỉ giữ Kudo đã bấm; thẻ chưa bấm dùng props server. `toggle(id, current)` đổi ngay → gọi `setKudoHeart` (prop/inject, không import action trong test) → ghi số thật hoặc hoàn lại + báo lỗi.
- Tạo `components/ui/status-toast.tsx` (portal `<body>`, `role=status`, tự ẩn) tách từ `copy-kudo-link-button.tsx`; sửa nút Copy Link dùng lại, không đổi hành vi.
- Sửa `components/kudos/kudo-hearts.tsx` → client leaf `<button type=button aria-pressed disabled={own||pending}>`, giữ test id, `data-liked`, `data-own`, aria-label mẫu cũ, kích thước Figma 101×32 (số 24/32 bold + tim 32px), `FOCUS_RING`, vùng chạm ≥ 44px không đổi bố cục (padding âm/`min-h-11` theo cách `copy-kudo-link-button` đang làm). Own: `cursor-not-allowed`, không đổi màu.
- Sửa `kudo-post-card.tsx`, `kudo-highlight-card.tsx` (truyền `kudoId`, copy lỗi), `app/[locale]/sun-kudos/page.tsx` (bọc Highlight + All Kudos trong provider), `messages/{vi,en}/kudos.ts` (`hearts.error`, `/* not from Figma */`).

**Out of scope:** SQL, Server Action (phase 02–03); dấu x2; sắp xếp lại Highlight; Spotlight.
**Integration contract:** `setKudoHeart({kudoId, liked}) → {ok:true, liked, heartCount} | {ok:false, error}`.
**Checks:** tsc, lint, không tăng file > 200 dòng; không chạy build/E2E (phase 05).
