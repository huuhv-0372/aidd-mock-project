---
title: "Tìm kiếm profile Sunner — type-ahead trên Sun* Kudos Live board"
description: "Pill 'Tìm kiếm profile Sunner' (2940:13450) thành combobox: gõ → gợi ý ≤10 Sunner (avatar, tên, phòng ban) → chọn hoặc Enter → /profile/{id}."
status: completed
priority: P2
effort: 3.75h
branch: feature/kudos-profile-search
tags: [feature, ui, momorph, i18n]
blockedBy: []
blocks: []
created: 2026-10-26
work_type: feature
test_policy: e2e-red-first
spec_waived: "SDD mode disabled (takumi.sddMode: off)"
---

# Tìm kiếm profile Sunner

MoMorph `MaZUn5xHXZ` (fileKey `9ypp4enmFmdK3YAFJLIu6C`), node `2940:13450`. Quyết định chốt: [clarifications.md](clarifications.md) (không mở lại). Spotlight B.7.3 giữ nguyên. Không migration.

**Chồng lấn:** `plans/261019-1022-write-kudos` (status in-review, code đã ở main): plan này dùng lại RPC `kudos_search_sunners`, kiểu dropdown của `recipient-picker.tsx` và `searchSunners` (chỉ tách phần gọi RPC, hành vi giữ nguyên). Không `blockedBy`.

| # | Phase | Owner | Effort | Status |
|---|-------|-------|--------|--------|
| 01 | [E2E RED](phase-01-e2e-red.md): `tests/e2e/sun-kudos-profile-search.spec.ts` + helper fake | tester | 0.75h | completed (`reports/e2e-red-evidence.md`: exit 1, 18 fail on combobox) |
| 02a | [Track A UI](phase-02a-track-a-profile-search-ui.md): pill → combobox, dropdown, hook debounce | momorph-ui-implementer | 1.25h | completed (`reports/visual-check-261026.md`, SEALED review) |
| 02b | [Track B dữ liệu](phase-02b-track-b-schema-action-messages.md): zod 1–100, action `searchProfiles`, messages, unit | implementer | 0.75h | completed (vitest 1067 pass, 13 unit mới) |
| 03 | [Tích hợp + GREEN](phase-03-integration-green-review-docs.md): nối page, build, E2E, visual 1440/375, review, changelog | tester + reviewer + doc-writer | 1h | completed (GREEN 377/377, visual, review SEALED 9/10, changelog, gzip 2350.57 KiB) |

Phụ thuộc: 01 → (02a ∥ 02b) → 03. 02a và 02b sở hữu file tách rời; không agent nào build hay chạy E2E ngoài 01 và 03 (cổng 3100–3103 / `.next` va nhau).

## Luồng dữ liệu
```
input (maxlength 100) ─trim rỗng→ không làm gì, không lỗi
   └ debounce 150ms → searchProfiles(q) [server action]
        zod trim 1–100 ─sai→ {ok:false} (không gọi RPC)
        └ rpc kudos_search_sunners(p_query=q, p_limit=10, p_name_only=false) → zod mảng sunnerSchema
   → {ok,items} → listbox (avatar, tên, phòng ban) | dòng trạng thái "không tìm thấy" / lỗi chung
   → click | Enter (dòng đang chọn hoặc dòng đầu) | kính lúp → router.push(profileHref(id)) → proxy rewrite locale
```

## Hợp đồng 02a ↔ 02b (controller giữ nguyên chữ ký)
- Action: `searchProfiles(query: string): Promise<SearchSunnersResult>` tại `lib/kudos/search-profiles-action.ts`; kiểu kết quả là `SearchSunnersResult` của `components/kudos-compose/write-kudo-types.ts` (`{ok:true, items: SunnerOption[]} | {ok:false}`).
- Trigger: `KudosComposeTrigger({ copy: KudosComposeCopy, searchProfiles })`; `KudosComposeCopy = { placeholder, searchPlaceholder, searchSubmitLabel, searchListLabel, searchNoResult, searchError }` (cả 6 khoá `string`, nằm trong `dict.kudos.compose`).
- Selector E2E (01 chốt, 02a theo): `data-testid="profile-search"` (vỏ pill), combobox tên `Tìm kiếm profile Sunner`, nút kính lúp tên `Tìm kiếm`, listbox tên `Kết quả tìm kiếm Sunner`, trạng thái `getByTestId('profile-search').getByRole('status')`.
- 02a chưa thấy action và 02b chưa thấy prop mới: `tsc` toàn repo chỉ xanh ở phase 03; mỗi agent chỉ kiểm file của mình.

## Rủi ro (cập nhật sau delivery)
| Rủi ro | Trạng thái | Bằng chứng / việc còn lại |
|---|---|---|
| Dropdown bị Highlight đè | ĐÓNG | z-10 ở KV banner; elementFromPoint = option (visual-check) |
| Phản hồi cũ ghi đè mới | ĐÓNG | guard `use-profile-search.ts:54`; mutant bị bắt (`evidence/mutant-guard-removed-run.log`) |
| Tách `searchSunners` làm hỏng Write Kudo | ĐÓNG | write-kudo 75/75; vitest 1067 pass |
| Lỗi nội bộ lộ ra client | ĐÓNG | E2E ca 11: không có `boom-secret-detail` trên trang |
| Phản hồi lỗi/Esc/blur giữ stale | ĐÓNG | ca clear/Tab-while-in-flight, mutant-checked |
| Blur xoá kết quả (refocus không hiện gì) | MỞ, Low, defer | `use-profile-search.ts:89-95`; owner momorph-ui-implementer |
| `SearchSunnersResult` khai báo 2 lần | MỞ, Low, defer | `lib/kudos/run-sunner-search.ts:5`; owner implementer |
| Email-substring probing (RPC có sẵn) | MỞ, Low, chấp nhận | quyết định plan cuối; owner user |
| Worker gzip chưa đo | MỞ, Medium | chưa có số; owner tester |
| Next 16.4.3 SecurityFatalError nudge khi build đầu | MỞ, Low | retry qua; nâng cấp là quyết định owner |

## Scope drift
- Thêm 2 ca clear/Tab-while-in-flight + đo lại input (fix round 1). Lý do: review Medium. Cost: một vòng review.
- Sửa `sun-kudos-feed.spec.ts` (ID-7 locator `hasText`) ngoài danh sách plan. Lý do: toast mới làm locator khớp nhầm. Cost: chỉ thu hẹp locator.
- `kudos-contract.ts` 241 dòng, chưa tách. Cost: vượt guideline 200.

## Rollback
Mỗi phase revert độc lập: 02a trả lại pill `aria-disabled`; 02b chỉ thêm file mới (+ một lần tách helper, revert được); 03 chỉ nối `page.tsx` + docs. Không dữ liệu, không migration.

## Done quan sát được
- [x] E2E mới xanh (105/105 ở repeat 5), full E2E 377/377, tsc 0, lint 0, build 0, vitest 1067 pass
- [x] Đo 1440/375 khớp Figma (381.34×72 vs 381×72), không cuộn ngang ở 375, review SEALED 9/10

## Việc còn lại (không chặn plan; commit không tính là phase)
- **Tách `kudos-contract.ts`** (241 dòng), owner tester: xong khi mỗi file ≤200 dòng và 18 ca mới vẫn xanh.
- **Commit + PR** (`Closes #N`, `-R huuhv-0372/aidd-mock-project`), owner user: xong khi có commit trên `feature/kudos-profile-search`. Commit là việc của user, không phải phase.
- **Thử tay với Supabase thật** (phase 03 bước 5), owner user: xong khi có ghi chú kết quả, hoặc user bỏ qua bằng lời rõ ràng.
