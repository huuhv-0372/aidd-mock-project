---
title: "Sun* Kudos - sửa sau review 4 commit (d263e43..e102ebe)"
description: "Docs sai trạng thái DB, thiếu test ẩn danh trên UI, fixture lệch SQL, message e102ebe sai."
status: completed
priority: P2
effort: 1h
branch: main
tags: [fix, test, docs]
created: 2026-10-19
work_type: feature
spec_waived: "SDD mode disabled (takumi.sddMode: off)"
---

# Sun* Kudos - sửa sau review

Nguồn: review các commit d263e43, 257cc99, 37e11a3, e102ebe (2026-10-15). Plan gốc: `plans/261015-1010-sun-kudos-live-board/`.

| # | Việc | File | Status |
|---|------|------|--------|
| 1 | Docs: "SQL chưa chạy trên Supabase thật" → đã chạy 2026-10-15, verify 20/20 PASS | README.md, docs/codebase-summary.md, docs/project-changelog.md, docs/system/permissions.md | done |
| 2 | E2E: Kudo ẩn danh hiện alias, không tên/link người gửi | tests/e2e/sun-kudos-feed.spec.ts | done |
| 3 | Fixture theo SQL: thứ tự spotlight, hearts_awarded (x2), quà 1..20, cursor đủ 2 nửa, sort (created_at,id), tie ở ranh giới trang, id không phải UUID v4 | tests/e2e/support/kudos-fixtures.mjs | done |
| 4 | Bỏ link tới plans/ (không có trong git); amend message e102ebe | docs/*, tests/e2e/support/kudos-contract.ts | done |

Commit: docs amend vào e102ebe (HEAD, chưa push); test/fixture thành commit `test(kudos)` mới.

Ngoài phạm vi (Low/Defer từ review): comment "Expected RED" cũ, seed thiếu chặn production, header cleanup, `key={src}` gallery, spotlight không giới hạn, ràng buộc URL ảnh (#12), fake server trả 200 cho anon.

## Ghi chú sau review

- Hai Low sau review (đã sửa, E2E không chạy lại): fixture `clampLimit` p_limit 0 → 1 như SQL; unit test `CURSOR` id sang format không phải v4 (`tests/unit/load-more-kudos-action.test.ts`). Bằng chứng: vitest 313/313, tsc 0, lint 0 (`evidence/temper-results.json`, 09:35). E2E không chạy lại vì app chỉ gửi p_limit 1..20 hoặc 10.
- Mutation RED đúng lý do, đã revert (`reports/mutation-proofs.md`): ID-6 tie ranh giới trang (`sun-kudos-feed.spec.ts:27`); người gửi ẩn danh bị lộ (`:80`).
- Tiêu chí 1 thu hẹp thành "file đổi trong vòng này". Tham chiếu còn lại tới `plans/261015-1010-sun-kudos-live-board` ở `supabase/migrations/20261015100000_create_kudos.sql:7,44` và `messages/en/kudos.ts:6` theo quy ước repo, ngoài phạm vi. Trạng thái: Deferred.
- Amend e102ebe → `0b06c02` (đã kiểm bằng `git log`); test/fixture → `a456c1b`. Chưa push.
