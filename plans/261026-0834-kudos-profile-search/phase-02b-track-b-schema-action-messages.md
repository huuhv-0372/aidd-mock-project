---
phase: 02b
title: "Track B: zod 1–100, server action searchProfiles, messages, unit"
status: completed
owner: implementer
effort: 0.75h
test_policy: e2e-red-first
blocked_by: [01]
---

# Phase 02b — Track B dữ liệu

## Context Links
- [plan.md](plan.md) (hợp đồng), [clarifications.md](clarifications.md)
- `lib/kudos/search-sunners-action.ts`, `lib/validation/write-kudo.ts`, `tests/unit/kudo-lookup-actions.test.ts` (mẫu mock `createSupabaseServerClient`)
- RPC `kudos_search_sunners` (`supabase/migrations/20261019110000_create_kudo_write.sql`): chỉ gọi, không sửa

## Overview
Priority P2. Thêm action tìm Sunner cho ô profile với schema riêng 1–100 ký tự, dùng lại phần gọi RPC của `searchSunners`; thêm chuỗi vi/en.

## Key Insights
- File `"use server"` chỉ được export hàm async, mọi export đều thành endpoint → helper dùng chung **không** để trong `search-sunners-action.ts`. Tạo `lib/kudos/run-sunner-search.ts` (không `"use server"`) chứa: gọi RPC, `console.error` khi lỗi, parse `sunnersSchema`, trả `SearchSunnersResult`. Cả hai action gọi nó (DRY); hành vi `searchSunners` giữ nguyên.
- `SUNNER_QUERY_MAX = 50` của Write Kudo không đổi; schema mới ở file riêng để không chạm `write-kudo.ts`.
- `p_name_only: false` (tên hoặc email, theo clarifications); RPC đã bỏ dấu, loại người gọi, escape `%`/`_`, `limit ≤ 10`, không trả email.
- Schema không có `refine` (tránh chạy sau `max` fail, memory `zod-refine-runs-past-max-and-debounce-e2e-race`).

## Requirements
- `lib/validation/profile-search.ts`: `PROFILE_SEARCH_QUERY_MAX = 100`; `profileSearchQuerySchema = z.string().trim().min(1).max(PROFILE_SEARCH_QUERY_MAX)`.
- `searchProfiles(query: string): Promise<SearchSunnersResult>` (`"use server"`): `safeParse` thất bại (rỗng sau trim, >100, không phải string) → `{ ok: false }` **không gọi RPC và không tạo client**; hợp lệ → `runSunnerSearch(parsed.data, { nameOnly: false })`. Lỗi bất kỳ → `{ ok: false }`, không bao giờ ném `err.message` ra client.
- Messages (`dict.kudos.compose`, cả hai file cùng khoá, giữ chú thích "not from Figma"):
  - `searchSubmitLabel`: vi `Tìm kiếm` / en `Search`
  - `searchListLabel`: vi `Kết quả tìm kiếm Sunner` / en `Sunner search results`
  - `searchNoResult`: vi `Không tìm thấy Sunner nào.` / en `No Sunner found.` (cùng câu với `spotlight.noResults`)
  - `searchError`: vi `Không tìm kiếm được, hãy thử lại.` / en `Search failed, please try again.`
  - `searchPlaceholder` giữ nguyên.

## Architecture
```
searchProfiles(q) ─ profileSearchQuerySchema ─✗→ {ok:false}
                  └✓→ runSunnerSearch(q, {nameOnly:false}) ─ createSupabaseServerClient → rpc → sunnersSchema
searchSunners(q, opts) ─ sunnerQuerySchema + options ─✓→ runSunnerSearch(q, opts)   (hành vi cũ)
```

## Related Code Files
- Tạo: `lib/validation/profile-search.ts`, `lib/kudos/run-sunner-search.ts`, `lib/kudos/search-profiles-action.ts`, `tests/unit/search-profiles-action.test.ts`.
- Sửa: `lib/kudos/search-sunners-action.ts` (thân hàm chuyển sang helper, chữ ký + kiểu export giữ nguyên), `messages/vi/kudos.ts`, `messages/en/kudos.ts`.
- **Không đụng:** `components/**`, `app/**` (02a / phase 03), `tests/e2e/**`, `lib/validation/write-kudo.ts`, `tests/unit/kudo-lookup-actions.test.ts` (phải xanh nguyên vẹn).

## Integration contract (giao cho 02a, đừng đổi)
`searchProfiles(query: string): Promise<SearchSunnersResult>` với `SearchSunnersResult` từ `lib/kudos/search-sunners-action.ts` (cấu trúc trùng `write-kudo-types.ts`: `{ok:true, items}` | `{ok:false}`); sáu khoá copy của `KudosComposeCopy` như plan.md.

## Implementation Steps
1. Test trước (RED riêng của phase): `tests/unit/search-profiles-action.test.ts` theo mẫu `kudo-lookup-actions.test.ts`:
   - schema: `"a"` ok; 100 ký tự ok; 101 ký tự fail; `""`, `"   "`, `123`, `null` fail; `"  An  "` → `"An"`;
   - action: truy vấn không hợp lệ → `{ok:false}` và `rpc` + `createSupabaseServerClient` **không được gọi**; hợp lệ → `rpc("kudos_search_sunners", { p_query: "An", p_limit: 10, p_name_only: false })` và trả hàng đã validate, không có khoá thừa (vd. `email`); RPC lỗi / dữ liệu sai hình / ném lỗi → `{ok:false}`.
2. Tạo helper, sửa `searchSunners` dùng helper, tạo schema + action, thêm messages.
3. `npx vitest run tests/unit/search-profiles-action.test.ts tests/unit/kudo-lookup-actions.test.ts`; `npx tsc --noEmit` chỉ cần sạch ở file của phase (xem plan.md); lint. **Không** build, **không** E2E.

## Todo List
- [x] Unit schema + action (viết trước, thấy đỏ) — `tests/unit/search-profiles-action.test.ts`, 13 test, xanh trong vitest 1067 pass
- [x] `run-sunner-search.ts` + `searchSunners` uỷ quyền, `kudo-lookup-actions.test.ts` vẫn xanh — vitest 1067 pass, `write-kudo.spec.ts` 75/75 (`reports/e2e-red-evidence.md`)
- [x] `profile-search.ts`, `search-profiles-action.ts` — 6 + 14 dòng
- [x] 4 khoá messages vi/en — `messages/{vi,en}/kudos.ts`; tsc 0

## Success Criteria
- [x] Unit mới xanh — 13 test (`evidence/temper-results.json`)
- [x] `kudo-lookup-actions.test.ts` xanh, không sửa — không nằm trong danh sách file đã đổi (git status)
- [x] `searchSunners` không đổi chữ ký — chữ ký giữ nguyên, thân hàm uỷ quyền `run-sunner-search.ts` (`lib/kudos/search-sunners-action.ts`)
- [x] Không file >200 dòng — `run-sunner-search.ts` 36 dòng

Scope drift: schema 1–100 đặt ở `lib/validation/profile-search.ts` (file riêng, như plan); `runSunnerSearch` lấy tên `run-sunner-search.ts` như plan. Không lệch.

## Risk Assessment
| Rủi ro | L/I | Cách đỡ |
|---|---|---|
| Tách helper đổi hành vi `searchSunners` (Write Kudo) | L/H | test cũ chạy nguyên; chỉ chuyển code, không sửa logic; `write-kudo.spec.ts` ở phase 03 |
| Helper export từ file `"use server"` thành endpoint công khai | L/H | helper ở file riêng không `"use server"` |
| ReDoS/truy vấn lớn trước đăng nhập | L/M | `max(100)` không refine; RPC chỉ cho người đã đăng nhập, `escape '\'` cho wildcard |

## Security Considerations
Truy vấn là dữ liệu không tin cậy: zod trước khi chạm RPC; RPC `security definer` chỉ trả cho tài khoản được phép, loại người gọi, không trả email; lỗi chỉ log phía server, client nhận `{ok:false}`; không `NEXT_PUBLIC_`/service-role; không cần check Origin (Server Action đã có).

## Scope Contract
- **Changed:** `lib/kudos/{run-sunner-search,search-profiles-action,search-sunners-action}.ts`, `lib/validation/profile-search.ts`, `messages/{vi,en}/kudos.ts`, test unit mới.
- **Impacted:** `searchSunners` (Write Kudo recipient + @mention), kiểu `Dictionary` (khoá mới bắt buộc ở cả hai ngôn ngữ).
- **Will verify:** unit (tầng thấp nhất chứng minh validate + không gọi RPC khi sai) + test cũ của `searchSunners`.
- **Deliberately skipped:** build, E2E (phase 03); SQL thật (RPC không đổi).

## Next Steps
Phase 03 nối `searchProfiles` vào `page.tsx`.

## MoMorph refs:
- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
- Clarifications: plans/261026-0834-kudos-profile-search/clarifications.md
- testPolicy: e2e-red-first
