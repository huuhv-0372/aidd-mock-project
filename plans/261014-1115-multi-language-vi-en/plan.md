---
title: "Đa ngôn ngữ VI/EN (feature #10)"
description: "Bộ chọn ngôn ngữ ở header đổi toàn bộ giao diện VI <-> EN; URL giữ nguyên, locale lưu cookie, proxy rewrite sang segment [locale] ẩn để trang vẫn prerender tĩnh."
status: completed
priority: P2
effort: 4h
branch: main
tags: [feature, i18n, momorph]
blockedBy: []
blocks: []
created: 2026-10-14
work_type: feature
test_policy: e2e-red-first
spec_waived: "SDD mode disabled (takumi.sddMode: off)"
---

# Đa ngôn ngữ VI/EN

MoMorph: fileKey `9ypp4enmFmdK3YAFJLIu6C`, dropdown screenId `hUyaaugye2` (spec `plans/momorph-specs/dropdown-ngon-ngu-hUyaaugye2/specs.csv`).
Test case nguồn: homepage ID-10/24/25/26/58, login `5f1cbabd`, `98e20775`, `4426635b`. Bản dịch EN lấy từ `list_file_localizations`.
Liên quan: `261012-1549-homepage-saa` hoãn ID-25/26 sang plan này.

## Quyết định kiến trúc

- **Locale ẩn trong URL**: URL công khai giữ nguyên. `proxy.ts` đọc cookie `NEXT_LOCALE` (mặc định `vi`) rồi rewrite sang `/{locale}{path}`.
  Route nằm trong `app/[locale]/` + `generateStaticParams` → mỗi trang có 2 bản tĩnh, giữ PPR/cacheComponents.
- Không thêm thư viện i18n: 2 locale, chuỗi tĩnh → từ điển TS thuần (`messages/{vi,en}/`, `en` đặt `satisfies` kiểu `vi`).
- Đổi ngôn ngữ: Server Action `setLocale` (zod, cookie 1 năm, `SameSite=Lax`) + reload. Không lưu `profiles` (YAGNI). Không làm `jp`.

## Phases

| # | Phase | Owner | Effort | Blocked by | Status |
|---|-------|-------|--------|-----------|--------|
| 01 | [E2E RED gate + unit locale](phase-01-e2e-red-gate.md) | tester | 0.5h | - | completed |
| 02 | [Track B: hạ tầng i18n (proxy, [locale], action)](phase-02-track-b-i18n-infra.md) | implementer | 1.25h | 01 | completed |
| 03 | [Track A: từ điển + nối component + dropdown](phase-03-track-a-dictionaries-and-wiring.md) | momorph-ui-implementer | 1.25h | 01 | completed |
| 04 | [Tích hợp, GREEN, review, docs](phase-04-integration-green-review.md) | implementer + tester | 1h | 02, 03 | completed |

## Effort: kế hoạch vs thực tế

Kế hoạch 4h (schedule 3h đã cảnh báo là thiếu ~1h). Thực tế: **~4h wall-clock**, gồm một vòng debug và một vòng sửa sau review.
Evidence không có mốc bắt đầu/kết thúc theo phase nên không tách giờ từng phase.

## Bằng chứng (evidence/temper-results.json, bản cuối sau fix round 1)

- lint 0 · tsc 0 · vitest 199/199 · `next build` 0 (2 bản tĩnh mỗi trang) · Playwright 70/70 · language-switch ×3 = 24/24.
- Review: pass 1 REWORK (8) → fix round 1 → SEALED (9), 0 critical (`reports/review-pass-1-verdict.json`, `evidence/inspection-verdict.json`).

## Việc còn lại (owner · điều kiện xong)

1. **Ký duyệt riskGate** (proxy/session) · owner: hoang.van.huu · Xong khi: `humanSignedOff: true` được ghi, rồi commit `feat(i18n): ...` lên main.
2. ~~Docs~~ — xong: changelog 2026-10-14, codebase-summary (mục Đa ngôn ngữ), permissions, F001 technical-spec, README.
Đã chốt (controller, 2026-10-14), không còn mở:
- Vary: Next ghi đè `Vary` nên bỏ hẳn phần append (fix round 1); guard là `Cache-Control: private, no-cache` (CDN dùng chung không được lưu). Re-review: addressed.
- Hero Awards lệch 7.7%: ảnh baseline chụp 13/10 16:49, trước khi keyvisual được xuất lại (14/10 08:22); diff `awards-hero.tsx` chỉ đổi alt/props → không phải hồi quy của i18n.
- Dropdown: đo lại trên bản cuối 122x124, option 110x56, khớp Figma export (`reports/visual/dropdown-open-{vi,en}-final.png`); số 108x122 trong visual-check §3 là trước polish.

## Deferred / follow-ups (đã chấp nhận, không chặn commit)

- 404 ở page-level `notFound()` là shell render phía client (cacheComponents). Status vẫn 404; chỉ sửa được bằng global-not-found, mà mất locale phía server → giữ nguyên.
- `Cache-Control: private` trên route rewrite mới kiểm trên `next start`; chưa kiểm trên OpenNext/Workers. Kiểm khi có cấu hình wrangler.
- bfcache restore luôn reload trang.
- Chuỗi EN "self" (không có trong Figma) cần BTC duyệt: `reports/en-localizations.md`.

## Scope drift

- `messages/`: 9 file mỗi locale (index, shell, home, root-further, login, countdown, not-found, awards, award-sections) thay vì 5 file kế hoạch (không có `common.ts`). Lý do: tách theo màn. Chi phí: không đáng kể.
- Thêm `components/ui/locale-change-reload.tsx` (BroadcastChannel + pageshow guard) sau review pass 1: chặn cây cũ treo trong Activity khi đổi ngôn ngữ ở tab khác. Chi phí: 1 file, 1 vòng gate.
- Dropdown polish theo Figma sau review (122x124, option 110x56). Chi phí: chạy lại gate.
- Debug: `router.refresh()` → reload toàn trang (cây cũ sống trong Activity ẩn). Chi phí: 1 vòng debug.

## Rủi ro

- Đóng: dời root layout vào `[locale]` (catch-all `[...rest]` giải quyết); matcher proxy bị hỏng (đã khôi phục); test cũ dùng VI làm selector (mặc định `vi`, full E2E xanh).
- Mở: bản dịch MoMorph chưa duyệt (mục 2 + Deferred); deploy OpenNext chưa kiểm (Deferred).
