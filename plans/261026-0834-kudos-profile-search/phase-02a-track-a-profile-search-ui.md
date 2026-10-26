---
phase: 02a
title: "Track A: pill tìm kiếm thành combobox + dropdown"
status: completed
owner: momorph-ui-implementer
effort: 1.25h
test_policy: e2e-red-first
blocked_by: [01]
---

# Phase 02a — Track A UI

**Screen:** `MaZUn5xHXZ`, node `2940:13450` (instance `I2940:13450;186:2759` kính lúp, `;186:2760` chữ), vỏ `2940:13448`; dropdown theo `p9zO-c4a4x` qua PANEL/OPTION có sẵn.
**Goal:** pill 381×72 (viền 1px `#998C5F`, nền `rgba(255,234,158,0.10)`, bo 68, padding 24/16, gap 8) thành ô nhập; kính lúp là nút submit; gõ → dropdown ≤10 Sunner → chọn / Enter → `/profile/{id}`. Giữ nguyên hình dạng Figma, chữ Figma thành placeholder.

## Context Links
- [plan.md](plan.md) (hợp đồng), [clarifications.md](clarifications.md), [phase-01](phase-01-e2e-red.md) (RED, chỉ đọc)
- `components/kudos-compose/recipient-picker.tsx` (mẫu debounce 150ms, bộ đếm `latest`, status row), `recipient-option-content.tsx`

## Key Insights
- Không tách hook dùng chung với `recipient-picker`: picker có nhánh `@`-nameOnly, `onTypedChange`, "chọn thì điền chữ", dính vào Write Kudo; bản này là "chọn thì điều hướng". Lặp ~25 dòng chấp nhận được (KISS). **Có** tách `PANEL`/`OPTION` (người dùng thứ hai xuất hiện): chuyển sang `compose-field-styles.ts` thành `SUGGEST_PANEL`, `SUGGEST_OPTION`; `recipient-picker.tsx` chỉ đổi import.
- KV banner là `relative isolate`: dropdown `absolute` có thể bị khu Highlight đè → vỏ pill cần `relative` và z-index đủ; nếu E2E (ca 12) báo bị đè mới sửa `kudos-kv-banner.tsx` (thêm `z-10` cho `section`).

## Requirements
- Chức năng: combobox chuẩn (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant`), `maxLength={100}`, `autoComplete="off"`, `aria-label={copy.searchPlaceholder}`; ↑/↓ quay vòng (chưa chọn: ↓ → dòng đầu, ↑ → dòng cuối; không sao chép công thức `(at + step + n) % n` của picker vì từ -1 nó ra dòng áp chót), Enter mở dòng đang chọn hoặc dòng đầu (chưa có kết quả/rỗng/trim rỗng: không làm gì, không lỗi), Esc đóng (giữ chữ), blur/Tab đóng và huỷ lượt tìm đang chờ; `onMouseDown preventDefault` trên option; hover đặt dòng đang chọn.
- Tìm: trim rỗng → không gọi; ngược lại debounce 150ms → `searchProfiles(query.trim())`; mọi lần gõ/chọn/blur tăng `latest` (bỏ phản hồi cũ); `catch` → `console.error` + trạng thái lỗi. Dòng trạng thái luôn mount (`role="status"`, `sr-only` khi trống), hiện `copy.searchNoResult` khi 0 kết quả hoặc `copy.searchError` khi `{ok:false}`/ném lỗi.
- Điều hướng: `router.push(profileHref(item.id))` (`useRouter` của `next/navigation`, như `kudo-detail-close-button.tsx`; proxy tự rewrite locale).
- Phi chức năng: `min-h-11 min-w-11` cho kính lúp (vùng chạm 44×44, icon vẫn 24px), option `min-h-11`; `focus-visible:` (`FOCUS_RING` trên vỏ qua `focus-within`); `motion-safe:` cho mọi transition; mobile-first (xếp dưới A.1, rộng 100%, dropdown rộng bằng pill); `"use client"` chỉ ở các file lá bên dưới; icon `icon-search.svg` giữ nguyên.

## Architecture
```
KudosComposeTrigger (client, đã có)        // A.1 giữ nguyên; thêm <ProfileSearchBox copy searchProfiles/>
 └ ProfileSearchBox   (form role=search: input + nút kính lúp + vỏ relative)
     ├ useProfileSearch(searchProfiles)     // text, items, status, active, debounce, latest-guard, handlers
     └ ProfileSearchResults (listbox + status row, thuần hiển thị, RecipientOptionContent)
```

## Related Code Files
- Tạo: `components/kudos/profile-search-box.tsx`, `components/kudos/profile-search-results.tsx`, `components/kudos/use-profile-search.ts`.
- Sửa: `components/kudos/kudos-compose-trigger.tsx` (bỏ nút `aria-disabled`; `KudosComposeCopy` mở rộng; nhận prop `searchProfiles`; cập nhật comment đầu file), `components/kudos-compose/compose-field-styles.ts` (+`SUGGEST_PANEL`, `SUGGEST_OPTION`), `components/kudos-compose/recipient-picker.tsx` (chỉ import), `components/kudos/kudos-kv-banner.tsx` (chỉ khi cần z-index, ghi lý do).
- **Không đụng:** `app/**` (page nối ở phase 03), `lib/**`, `messages/**` (02b), `tests/**`, `.next`. Mỗi file ≤200 dòng, kebab-case.
- Chữ giữ comment `// mm:` như file hiện tại.

## Integration contract (chỉ đọc, từ 02b / plan.md)
`searchProfiles: (query: string) => Promise<SearchSunnersResult>` (kiểu từ `write-kudo-types.ts`); `KudosComposeCopy = { placeholder, searchPlaceholder, searchSubmitLabel, searchListLabel, searchNoResult, searchError }`. Dùng `data-testid="profile-search"` ở vỏ; kính lúp `aria-label={copy.searchSubmitLabel}`; listbox `aria-label={copy.searchListLabel}`.

## Implementation Steps
1. Đọc RED (`redTestFiles`) và `recipient-picker.tsx`.
2. Chuyển `PANEL`/`OPTION` sang `compose-field-styles.ts` (đổi tên), sửa import ở `recipient-picker.tsx`.
3. Viết `use-profile-search.ts`, `profile-search-results.tsx`, `profile-search-box.tsx`; nối vào `kudos-compose-trigger.tsx`.
4. Đo từ Figma MCP (không đoán): kích thước, màu, bo góc, chữ placeholder; avatar/tên/phòng ban dùng đúng `RecipientOptionContent`.
5. Chỉ chạy `npx tsc --noEmit` lọc theo file của phase, `npm run lint`; **không** `next build`, **không** E2E (xem plan.md).

## Todo List
- [x] `SUGGEST_PANEL` / `SUGGEST_OPTION` + import ở recipient-picker — `compose-field-styles.ts`, `recipient-picker.tsx` (chỉ import)
- [x] `use-profile-search.ts` (debounce, `latest`, trạng thái) — 98 dòng
- [x] `profile-search-results.tsx` + `profile-search-box.tsx` — 55 + 71 dòng
- [x] Trigger: pill thành combobox, giữ A.1 — `kudos-compose-trigger.tsx`, E2E "A.1 opens modal" xanh (phase 03)
- [x] Mobile 375, focus-visible, motion-safe, vùng chạm 44px — `reports/visual-check-261026.md` (375: input 269×56, kính lúp 44×44, outline focus 2px); `motion-safe:` có trong `profile-search-box.tsx:36`

## Success Criteria
- [x] Khớp RED ở các ca UI — 105/105 (21 ca × 5 lần) và E2E full 377/377 (`evidence/temper-results.json`)
- [x] Không `getSession`/`dangerouslySetInnerHTML` trong `components/kudos/` — grep rỗng
- [x] Không file >200 dòng — các file 02a đều <200
- [x] Không còn `aria-disabled` trên pill — đã bỏ ở trigger (đánh giá SEALED, `reports/reviewer-261026-rereview-1-verdict.json`)

Fix round 1 (review Medium, `reports/reviewer-261026-pass1-verdict.json`): input nhận padding dọc để đạt ≥44px; xem `reports/visual-check-261026.md` § Round 1.

## Risk Assessment
| Rủi ro | L/I | Cách đỡ |
|---|---|---|
| Dropdown bị Highlight đè / cắt ở 375 | M/M | vỏ `relative`, z-index; kiểm ở phase 03 bằng phần tử trên cùng |
| Enter khi chưa có kết quả bị hiểu nhầm là lỗi | L/L | đúng quyết định: không làm gì |
| Đổi `recipient-picker.tsx` gây hồi quy Write Kudo | L/H | chỉ đổi import, chuỗi class giữ nguyên byte; `write-kudo.spec.ts` chạy ở 03 |

## Security Considerations
Văn bản người dùng chỉ hiển thị qua JSX (không HTML thô); id đi vào `profileHref` đã `encodeURIComponent`; không hiển thị lỗi thô, chỉ `copy.searchError`.

## Scope Contract
- **Changed:** `components/kudos/{kudos-compose-trigger,profile-search-*,use-profile-search}`, `compose-field-styles.ts`, import của `recipient-picker.tsx`.
- **Impacted:** trang `/sun-kudos` (hàng pill), Write Kudo (chung style PANEL/OPTION).
- **Will verify:** tsc/lint file của phase; hành vi ở phase 03 bằng E2E mới + `write-kudo.spec.ts`.
- **Deliberately skipped:** build/E2E trong phase này (va cổng khi chạy song song với 02b).

## Next Steps
Phase 03 nối `searchProfiles` vào `page.tsx`.

## MoMorph refs:
- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
- Clarifications: plans/261026-0834-kudos-profile-search/clarifications.md
- testPolicy: e2e-red-first
