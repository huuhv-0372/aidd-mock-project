---
phase: 03
title: "Tích hợp, GREEN, visual 1440/375, review, docs"
status: completed
owner: tester + reviewer + doc-writer
effort: 1h
test_policy: e2e-red-first
blocked_by: [02a, 02b]
---

# Phase 03 — Tích hợp + GREEN

## Context Links
- [plan.md](plan.md), [clarifications.md](clarifications.md), [phase-01](phase-01-e2e-red.md) (lệnh RED)
- Memory: `takumi-delivery-pitfalls-in-this-repo` (không build/E2E song song, evidence gate), `e2e-stale-server-and-subagent-claims`

## Overview
Priority P2. Chỉ phase này được `next build` và chạy E2E. Nối hai nhánh, chạy GREEN đúng lệnh RED, đo hình, review, ghi docs.

## Key Insights
- Hai nhánh chưa thấy nhau: `tsc` toàn repo có thể đỏ ở `page.tsx` (thiếu prop) cho đến khi nối; sửa ngay bước 1.
- Cổng 3100–3103 / `.next` phải trống trước khi chạy; kiểm `netstat` và tắt server sau mỗi lần.

## Requirements
Nối `searchProfiles` vào `KudosComposeTrigger`; E2E mới xanh; không hồi quy; đo hình; review không còn Critical/High.

## Architecture
`app/[locale]/sun-kudos/page.tsx` (RSC) import `searchProfiles` và truyền xuống `<KudosComposeTrigger copy={copy.compose} searchProfiles={searchProfiles} />` (cùng kiểu truyền `loadMore={loadMoreKudos}`).

## Related Code Files
- Sửa: `app/[locale]/sun-kudos/page.tsx` (import + prop, 2 dòng), `docs/project-changelog.md`; `docs/features/*` hoặc `docs/screens/*` chỉ nếu đã có trang nói về pill này (doc-writer kiểm bằng grep).
- Tester được sửa `tests/e2e/sun-kudos-profile-search.spec.ts` + `support/kudos-contract.ts` **chỉ** để khớp chuỗi/selector đã chốt khác hợp đồng, ghi từng thay đổi vào evidence; không nới lỏng assertion.
- Lỗi UI (lệch Figma, bị đè, lỗi hành vi) → trả về `momorph-ui-implementer` (02a), lỗi action/schema → `implementer` (02b); không tự sửa trong phase này.

## Implementation Steps
1. Sửa `page.tsx`; `npx tsc --noEmit`, `npm run lint`, `npx vitest run` (đủ).
2. `netstat -ano | findstr "3100 3101 3102 3103 54398"` trống; `npm run build`; kiểm gzip Worker còn dưới 3 MiB (không thêm dependency, chỉ báo số).
3. GREEN: chạy đúng `redCommand` (spec mới) ×3 liên tiếp; rồi toàn bộ `npm run test:e2e` (an toàn-quan-trọng: có Server Action đọc dữ liệu người dùng + dùng chung style Write Kudo nên chạy đủ, không thu hẹp).
4. Visual 1440 và 375 (Playwright MCP) so với Figma `2940:13450`: kích thước 381×72 (1440), placeholder, viền, nền, bo; dropdown (panel, avatar, tên, phòng ban, hàng chọn); 375 xếp dưới A.1, rộng 100%, không cuộn ngang; đo số, không "bằng mắt". Dropdown không bị Highlight đè.
5. Thử tay một lượt (nếu có Supabase thật): gõ tên → chọn → mở đúng hồ sơ; truy vấn có dấu `%` / `_` / email.
6. Review (mẫu `skills/_shared/templates/reviewer-prompt-template.md`): checklist bảo mật (zod, không lộ lỗi/email, guard phản hồi cũ), DRY (helper, style), file ≤200 dòng, a11y combobox.
7. Docs: `docs/project-changelog.md` (feat: pill tìm kiếm profile Sunner, action `searchProfiles`, tách `runSunnerSearch`); nhắc "Spotlight B.7.3 không đổi".
8. Cập nhật status 4 phase + plan.md; ghi evidence vào `reports/`.

## Todo List
- [x] page.tsx nối action; tsc/lint/vitest sạch — `page.tsx` nối; tsc 0, lint 0, vitest 1067 pass (`evidence/temper-results.json`)
- [x] build qua; cổng sạch — build 0; Worker gzip 2350.57 KiB (trước 2347.94), `evidence/worker-size.log`; cổng 3100–3103/54398 trống
- [x] E2E mới GREEN ×3 + toàn bộ E2E xanh — new specs `--repeat-each=5` 105/105 (21 ca), full E2E 377/377
- [x] Visual 1440/375 có số đo — `reports/visual-check-261026.md`: pill 381.34×72 (Figma 381×72), 375 không cuộn ngang, dropdown không bị đè
- [x] Review: 0 Critical/High — `reports/reviewer-261026-rereview-1-verdict.json` SEALED 9/10, criticalCount 0; pass 1 REWORK 7/10 đã xử lý
- [x] Changelog (+ docs liên quan) — `docs/project-changelog.md` mục 2026-10-26; doc-writer sửa thêm README, codebase-summary, system/permissions

## Success Criteria
- [x] Lệnh RED cũ exit 0 ×3 — 105/105 ở `--repeat-each=5`
- [x] Toàn bộ E2E xanh — 377/377
- [x] `tsc` 0; lint sạch; build ok
- [x] Đo lệch ≤1px — 1440: 381.34 vs 381 (0.34px); 72 vs 72
- [x] Không cuộn ngang ở 375 — scrollWidth 375 = clientWidth
- [x] `write-kudo.spec.ts` (75/75) và `kudo-lookup-actions.test.ts` xanh
- [x] Review SEALED
- [x] Changelog có mục — `docs/project-changelog.md` 2026-10-26

## Scope drift (Phase 03)
- `tests/e2e/sun-kudos-feed.spec.ts` (ID-7 toast locator scoped `hasText`) bị sửa dù plan chỉ cho tester sửa spec mới + `kudos-contract.ts`. Lý do: locator cũ khớp nhầm khi có toast mới. Cost: assertion giữ nguyên, chỉ thu hẹp locator; reviewer đã chấp nhận.
- Fix round 1 thêm ca clear/Tab-while-in-flight và đo lại input 24px→56px (375) / 70px (1440). Lý do: reviewer Medium. Cost: thêm 2 ca, một vòng review.
- `kudos-contract.ts` 241 dòng, vượt guideline 200; plan ghi "split candidate ở phase 03" nhưng chưa tách. Cost: vi phạm `development-rules.md` cho tới khi tách.

## Risk Assessment
| Rủi ro | L/I | Cách đỡ |
|---|---|---|
| Subagent báo "xanh" mà chưa chạy thật | M/M | controller đọc exit code và số test thật, không tin báo cáo |
| Server cũ còn trên 3100–3103 làm sai E2E | M/H | `netstat` trước/sau; tắt server |
| Dropdown lệch Figma ở 375 | M/M | trả 02a, đo lại |
| Worker vượt 3 MiB | L/M | không thêm dependency; báo số gzip |

## Security Considerations
Review đối chiếu: input zod trước RPC; lỗi chung; không email; `profileHref` mã hoá id; không secret mới. Chạy đủ unit + E2E vì động tới Server Action và dữ liệu người dùng (danh sách an toàn-quan-trọng: giao diện API công khai).

## Scope Contract
- **Changed:** `page.tsx` (nối), docs; toàn bộ thay đổi từ 01–02b.
- **Impacted:** `/sun-kudos` mọi khu; Write Kudo (style chung + `searchSunners` tách helper); Dictionary vi/en.
- **Will verify:** vitest đủ; E2E mới ×3 + toàn bộ E2E (fail open: có thay đổi style/action dùng chung); build; đo hình 1440/375.
- **Deliberately skipped:** SQL thật (RPC không đổi, không migration); thay đổi Spotlight B.7.3 (ngoài phạm vi, ID-11 giữ nguyên).

## Next Steps
Controller: commit conventional trên `feature/kudos-profile-search` (không kèm `.playwright-mcp/`), PR `Closes #N` (dùng `-R huuhv-0372/aidd-mock-project`), đổi status plan sang `completed`.

## MoMorph refs:
- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
- Clarifications: plans/261026-0834-kudos-profile-search/clarifications.md
- testPolicy: e2e-red-first
