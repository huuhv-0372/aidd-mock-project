---
title: "Like Kudos (feature #13): thả tim / bỏ tim trên thẻ Kudo"
description: "Nút tim trên thẻ Highlight + All Kudos: đặt/bỏ tim qua RPC set_kudo_heart, đồng bộ hai thẻ cùng Kudo, đổi ngay và hoàn lại khi lỗi; tim cộng cho người gửi (x2 ngày đặc biệt do trigger có sẵn)."
status: completed
priority: P1
effort: 4.5h
branch: main
tags: [feature, ui, momorph, database]
blockedBy: []
blocks: []
created: 2026-10-20
work_type: feature
test_policy: e2e-red-first
spec_waived: "SDD mode disabled (takumi.sddMode: off)"
---

# Like Kudos (#13)

MoMorph `MaZUn5xHXZ` (fileKey `9ypp4enmFmdK3YAFJLIu6C`), C.4.1 Hearts. Quyết định: [clarifications.md](clarifications.md) (authoritative).
Nền có sẵn từ #11: bảng `kudo_hearts`, trigger chặn tự tim + gán x1/x2 + đếm `heart_count`, `liked_by_me`/`is_mine`, `kudos_my_stats.hearts_received`. Thiếu lúc đầu: đường ghi và nút bấm.

**Trạng thái: in-review (2026-10-20).** Verify SQL thật 7/7 PASS + thả tim thật OK (`reports/db-verify-result.md`). Owner ký riskGate sau khi xem lại (2026-10-20); evidence gate hard SEALED exit 0; commit c67c6ea, fd812d0, 65fb5a1, 38f6928 (chưa push). Code, test và docs đã xong (xem Bằng chứng).

## Luồng

```
Bấm tim ─▶ store client đổi ngay (liked, count±1), khoá nút
        ─▶ Server Action setKudoHeart({kudoId, liked}) ─ zod ─▶ RPC set_kudo_heart(p_kudo_id, p_liked)
              insert on conflict do nothing | delete ─▶ trigger cập nhật heart_count, hearts_awarded (1|2)
        ◀─ {liked, heartCount} từ DB ─▶ store ghi số thật; thẻ Highlight + feed cùng id đổi theo
        ◀─ lỗi ─▶ store về trạng thái cũ + toast "Không thả tim được, hãy thử lại."
```

## Phases

| # | Phase | Owner | Effort KH | Status |
|---|-------|-------|-----------|--------|
| 01 | [E2E RED + fake set_kudo_heart](phase-01-e2e-red-gate.md) | tester | 0.75h | completed (RED exit 1, 10 fail / 11 pass, đúng lý do) |
| 02 | [Track B: migration + rollback + verify](phase-02-track-b-heart-rpc-migration.md) | implementer | 0.75h | in-review (verify chưa chạy trên Supabase thật) |
| 03 | [Track B: zod + Server Action + unit](phase-03-track-b-heart-action.md) | implementer | 0.5h | completed (unit xanh, tsc 0, lint 0) |
| 04 | [Track A: nút tim, store, toast](phase-04-track-a-heart-button-and-store.md) | momorph-ui-implementer | 1h | completed (E2E 9/9; 101px owner chấp nhận) |
| 05 | [Tích hợp, GREEN, thử thật, review, docs](phase-05-integration-green-review-docs.md) | implementer + tester | 1.5h | completed (GREEN, SEALED 9, SQL thật 7/7 PASS, riskGate ký, đã commit) |

Thứ tự: `01 → (02→03 || 04) → 05`. Phase 02 mở lại vì tiêu chí của nó là "verify PASS trên Supabase thật", chưa có bằng chứng.

## Bằng chứng

- **RED** (`reports/e2e-red-evidence.md`): `npm run test:e2e -- tests/e2e/kudo-hearts.spec.ts tests/e2e/sun-kudos-feed.spec.ts`, exit 1, 10 fail / 11 pass. Cả 10 lỗi do nút tim còn là `span role=img`, không do config/server. Hồi quy `sun-kudos.spec.ts` + `write-kudo.spec.ts`: 83/83 xanh.
- **GREEN, lần chạy cuối trên code đóng băng** (`reports/e2e-green-evidence.md` "Final run"; `evidence/temper-results.json`): lint 0 · tsc 0 · vitest 40 file / 559 · full E2E 204/204, 0 flaky · `kudo-hearts` + `sun-kudos-feed` `--repeat-each=5` 105/105, 0 flaky · OpenNext build 0 · wrangler dry-run gzip 2221.89 KiB (trần 3072).
- **Visual** (`reports/visual/`, 14 ảnh, `like-measurements.json`): xám → đỏ, số 15 → 16 đồng bộ cả thẻ feed và Highlight; Kudo của mình `disabled`; `focus-visible` có outline; 0 lỗi console; không tràn ngang ở 1440 và 375.
- **Review**: `reports/review-pass-1.md` không có Critical/High, 1 Medium + 3 Low. `reports/review-fix-round-1.md`: Medium (mất focus khi pending) và comment cũ đã sửa, 2 Low hoãn. `evidence/inspection-verdict.json`: SEALED 9, criticalCount 0, riskGate `humanSignedOff: false`.
- **Evidence gate `--stage hard`**: BLOCKED, chỉ còn riskGate chưa ký (2026-10-20).
- **Docs** (doc-writer): `README.md`, `docs/system/permissions.md`, `docs/codebase-summary.md`, `docs/project-changelog.md`.
- **Effort (đo được)**: 15:27:00 → 16:45:36 ICT = 1h18m36s. Span này chỉ gồm phase 05 (chạy GREEN, visual, build, final run). Không gồm RED, implement phase 02–04, review, docs, thử SQL. Tổng thực tế chưa đo được.
- **Chưa có bằng chứng**: verify SQL trên Supabase thật; thử thật đăng nhập Google; Worker thật trên Cloudflare (mới dry-run); so Figma trực tiếp (chưa có Figma trong run).

## Việc còn lại (owner · điều kiện xong)

1. Chạy migration `20261020150000_create_kudo_heart_rpc.sql` + verify trên Supabase thật · hoang.van.huu · xong khi: H1–H6 PASS trong `reports/db-verify-result.md`, rollback drop sạch hàm. Chặn commit.
2. Thử thật: đăng nhập Google, thả/bỏ tim Kudo người khác · hoang.van.huu · xong khi: `kudo_hearts` đúng dòng, sidebar người gửi +1 (x2 nếu ngày đặc biệt), ghi vào `db-verify-result.md`. Nếu lỗi: sửa, chạy lại GREEN và review.
3. Ký riskGate trong `evidence/inspection-verdict.json` · hoang.van.huu · xong khi: `humanSignedOff: true`; main agent chạy lại `--stage hard`, exit 0.
4. Commit `feat(kudos): like kudos` · hoang.van.huu duyệt; controller không tự commit · xong khi: lint + test xanh; gồm mọi file untracked (`supabase/*`, `lib/kudos/set-kudo-heart-action.ts`, `components/kudos/kudo-hearts-store.tsx`, `components/ui/status-toast.tsx`, tests mới); không có env/secret.
5. Quyết định 2 Low hoãn (store giữ override sau refresh; toast chồng nhau) · hoang.van.huu · xong khi: chấp nhận ghi vào Deferred, hoặc mở ticket có tên.
6. Chuỗi EN `hearts.error` · BTC · xong khi: duyệt, hoặc sửa theo góp ý.
7. So Figma trực tiếp `I3127:21871;256:5175` (vị trí, font) · main agent (có Figma MCP) · xong khi: kết quả ghi vào `reports/visual-check.md`.
8. Đóng plan: sau 1–4, chuyển `status: completed`, phase 02 và 05 sang completed · main agent · xong khi: các mục 1–4 có bằng chứng.

## Deferred (đã chấp nhận, không chặn commit)

- L-a: override của store còn sau khi đổi filter / `router.refresh()`, số server mới của Kudo đã bấm bị bỏ qua tới khi tải lại (`kudo-hearts-store.tsx:68-69`).
- L-b: toast lỗi tim và toast Copy Link chồng nhau nếu cùng xảy ra trong 3 s (`kudo-hearts-store.tsx:26`).
- Focus ring `FOCUS_RING` (`login-accent` trên nền kem) ước ~1.1:1, chưa đo, dưới 3:1 của WCAG 1.4.11. Token dùng chung, có sẵn từ trước; sửa ở ticket riêng.
- Chiều rộng nút tim hiện ôm theo số đếm (59.7px với 2 chữ số). Khung Figma 101px là của mẫu "1.000". Owner xác nhận: không phải lỗi.

## Scope drift

- Tách toast thành `components/ui/status-toast.tsx`: có trong plan (phase 04), không phải drift.
- Thêm `kudoHeartStateSchema` (zod) trong `lib/validation/kudos.ts` để kiểm hàng RPC trả về. Ngoài plan. Lý do chưa ghi trong evidence, owner cần xác nhận. Chi phí: một schema, đã nằm trong 559 unit và 204 E2E xanh; không đo riêng.
- Đổi thứ tự: review (pass 1) chạy trước khi thử thật SQL, plan ghi thử thật trước review. Chi phí: thử thật chưa chạy trên code đã review. Rủi ro thấp vì SQL không đổi. Nếu thử thật lộ lỗi, phải sửa và review lại.

## Rủi ro

- Mở:
  - SQL trên Supabase thật chưa chạy: fake có thể lệch SQL (bài học #11/#12). Đây là rủi ro chính trước khi commit.
  - riskGate chưa ký: gate hard chưa qua.
  - Chạy OpenNext trên Windows có WARN "không hỗ trợ đầy đủ, nên dùng WSL": cần kiểm khi deploy.
  - Hai Low hoãn (mục Deferred).
- Đóng (2026-10-20):
  - Medium: mất focus khi nút `disabled` lúc pending (đổi sang `aria-disabled`).
  - Comment "Expected RED now" còn sót trong spec.
  - Port 3100–3103, 54398, 54399 sạch trước và sau mọi lần chạy.

## Rollback

Revert commit. DB: `supabase/rollbacks/20261020150000_create_kudo_heart_rpc_down.sql` (drop function). Dòng `kudo_hearts` đã tạo vẫn hợp lệ với schema #11.

## Ngoài phạm vi

Màn admin ngày x2; dấu hiệu x2 trên thẻ; sắp xếp lại Highlight tại chỗ; realtime; trang chi tiết Kudo `/sun-kudos/[id]`.
