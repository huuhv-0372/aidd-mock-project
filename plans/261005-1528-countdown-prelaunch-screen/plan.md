---
status: complete
work_type: feature
spec_draft: plans/261005-1528-countdown-prelaunch-screen/spec/countdown-prelaunch-screen/
spec_lang: vi
primary_lang: vi
created: 2026-10-05
completed: 2026-10-05
source: MoMorph screen "Countdown - Prelaunch page" (screenId 8PJQswPZmU, fileKey 9ypp4enmFmdK3YAFJLIu6C)
---

# Plan — Countdown Prelaunch Screen (F001)

## Overview

Trang đếm ngược duy nhất hiển thị trước khi sự kiện SAA 2025 bắt đầu, kèm cơ chế khóa toàn site
(mọi route khác redirect về `/`) cho tới khi hết giờ. Xem đầy đủ requirements tại
`spec/countdown-prelaunch-screen/functional-spec.md`.

**Quyết định kỹ thuật quan trọng** (chi tiết trong `spec/.../technical-spec.md`):
- Target datetime đọc từ biến môi trường `NEXT_PUBLIC_EVENT_START_AT`, không dựng API/DB.
- Khóa điều hướng bằng Next.js `middleware.ts` ở root, áp dụng toàn site.

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Implement Countdown UI | Complete | [phase-01-implement-countdown-ui.md](phase-01-implement-countdown-ui.md) |
| 2 | Implement Navigation-Lock Middleware | Complete | [phase-02-implement-navigation-lock-middleware.md](phase-02-implement-navigation-lock-middleware.md) |

## Key Dependencies

- Phase 2 gates the entire site; depends on the same env var Phase 1 reads — keep parsing logic
  consistent (see phase-01 "Next Steps").
- No cross-plan dependencies — this is the first plan in the project.

## Scope Note

2 phases → per the 3-Task Rule in `create-plan`, no Claude Task hydration for this plan; execute
phase files directly.
