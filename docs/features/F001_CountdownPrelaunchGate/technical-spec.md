---
status: implemented
authored_by: takumi
created: 2026-10-09
lang: vi
fcode: F001
---

# F001_CountdownPrelaunchGate

## 1. Technical Overview

Cổng chờ trước giờ mở SAA 2025 gồm hai phần nhỏ. Một quy tắc ở `proxy.ts` (edge runtime) so `Date.now()` với `EVENT_START_AT`: trước giờ thì mọi route trừ `/countdown` và asset tĩnh bị redirect về `/countdown`, sau giờ thì `/countdown` bị redirect sang `/login`. Một trang `/countdown` (Server Component giữ layout tĩnh) truyền mốc thời gian xuống một client component lá để đếm mỗi giây và tự chuyển sang `/login` khi về 0. Không có DB, không có API riêng — mốc thời gian đọc từ biến môi trường qua một hàm duy nhất, sau này đổi sang Supabase chỉ cần sửa hàm đó.

## 2. Action Index

<!-- Tên `handler#action` là định danh trong spec; điểm vào thật là hàm/component ghi sau mũi tên. Không có action nào ghi 2 bảng hay chạy nền nên không có sequenceDiagram: A1 là một bảng quyết định (DEC), A2 chỉ đọc, A3 là vòng lặp phía client không có bước bất đồng bộ phía server. -->

| # | Action (handler) | Method · Path | Codes | Writes | Detail |
|---|---|---|---|---|---|
| **A0** | *cross-cutting — belongs to no single action* | — | — | — | § 4.4 |
| **A1** | `proxy#countdownGate` → `proxy()` | `ANY` `/*` (matcher loại asset tĩnh) | FR-001, FR-002, FR-101, FR-102, FR-601, BR-001, BR-002, DEC-001, DEC-002, US001, US003 | — *(read-only)* | § 3.1 |
| **A2** | `CountdownPage#render` → `CountdownPage` | `GET` `/countdown` | FR-001, FR-201, FR-202, BR-002, US001, US002 | — *(read-only)* | § 3.1 |
| **A3** | `CountdownTimer#tick` → `CountdownTimer` *(client-only, no BE)* | — | FR-103, FR-202, FR-203, FR-204, FR-205, BR-001, BR-003, ALG-001, US002, US003 | — *(read-only)* | § 3.1 |

## 3. Actions

### 3.1 CAP-01 — CountdownPrelaunchGate

#### A1 · Cổng chặn truy cập trước/sau giờ mở sự kiện
`ANY /*` → `` `proxy#countdownGate` ``
`FR-001` `FR-002` `FR-101` `FR-102` `FR-601` `DEC-001` `DEC-002` `US001` `US003`

**Who** · Mọi người truy cập, đã hoặc chưa đăng nhập — cổng chạy trước mọi kiểm tra phiên, không có ngoại lệ theo vai trò.
**Request** · `pathname` của mọi request khớp matcher; matcher chỉ loại `_next/static`, `_next/image`, `images/`, `favicon.ico`, `robots.txt`, `sitemap.xml` (không loại theo đuôi file, để route có dấu chấm sau này không lọt qua cổng).
**BE** · `` `proxy#countdownGate` `` đọc mốc bắt đầu qua `getEventStartAt` (§ 4.1), so với `Date.now()` bằng `isEventLaunched`, chọn đích bằng hàm thuần `resolveGateRedirect`, trả `NextResponse.redirect` (307) hoặc `NextResponse.next`. Chỉ dùng Web API, không dùng API Node.
**Rule** · quyết định đường đi của request theo cặp (đã/chưa đến giờ, có phải `/countdown` không); hai tổ hợp còn lại (trước giờ + `/countdown`, sau giờ + trang khác) cho đi tiếp không can thiệp:

| DEC | subtype | Condition | What the user sees | Source |
|---|---|---|---|---|
| **DEC-001** | flow | trước giờ mở AND `pathname` ≠ `/countdown` | bị chuyển về trang đếm ngược dù gõ URL nào, kể cả `/login` hay URL không tồn tại | `lib/countdown/resolve-gate-redirect.ts:8` |
| **DEC-002** | flow | đã đến giờ mở AND `pathname` = `/countdown` | bị chuyển thẳng sang trang đăng nhập, không thấy trang đếm ngược | `lib/countdown/resolve-gate-redirect.ts:7` |

- **BR-001 — Sự kiện đã bắt đầu khi thời điểm hiện tại ≥ mốc bắt đầu, so sánh bằng epoch ms.** Không phụ thuộc múi giờ máy vì mốc có offset +07:00. *(§ 4.4)*
- **BR-002 — Mốc thiếu hoặc sai định dạng thì coi như đã bắt đầu và ghi log lỗi phía server.** Gate không khóa gì trong trường hợp này. *(§ 4.4)*

**Result** · read-only — **no DB write**. Redirect 307 tới `/countdown` hoặc `/login`; ngoài hai trường hợp DEC trên thì request đi tiếp.
**Source:** `proxy.ts:8-12` (cổng), `proxy.ts:20-24` (matcher), `lib/countdown/resolve-gate-redirect.ts:4-9`, `lib/event/get-event-start-at.ts:24-26`

---

#### A2 · Hiển thị trang đếm ngược
`GET /countdown` → `` `CountdownPage#render` ``
`FR-001` `FR-201` `FR-202` `US001` `US002`

**Who** · Người truy cập chưa đến giờ mở sự kiện — trang công khai, không cần đăng nhập.
**FE** · Server Component giữ phần tĩnh (`CountdownScreen`): ảnh nền toàn màn hình kèm lớp phủ tối, tiêu đề "Sự kiện sẽ bắt đầu sau", rồi gắn client component lá `CountdownTimer` (§ 4.1) với prop `target` (mốc bắt đầu, epoch ms) và `serverNow` (giờ server lúc render), bọc trong `Suspense` vì đọc env và đồng hồ theo request.
**BE** · `` `CountdownPage#render` `` gọi `getEventStartAt` (§ 4.1) và truyền kết quả xuống `CountdownTimer`; không có route handler hay Server Action.
**Rule** · **BR-002 — Mốc thiếu hoặc sai thì coi như đã bắt đầu.** Trang chuyển sang `/login` thay vì dựng bộ đếm; trên thực tế A1 đã chặn trường hợp này trước nên đây chỉ là nhánh an toàn cho kiểu dữ liệu `null`. *(§ 4.4)*
**Result** · read-only — **no DB write**. Người dùng thấy tiêu đề và ba khối Days/Hours/Minutes.
**Source:** `app/countdown/page.tsx:11-32`, `components/countdown/countdown-screen.tsx`

---

#### A3 · Đếm ngược mỗi giây và chuyển sang đăng nhập khi về 0
`client · setInterval 1000ms` → `` `CountdownTimer#tick` ``
`FR-103` `FR-202` `FR-203` `FR-204` `FR-205` `US002` `US003`

**Who** · Người truy cập đang mở trang đếm ngược.
**FE** · Client component lá render ba khối, mỗi khối hai hộp chữ số kiểu LED và nhãn DAYS/HOURS/MINUTES màu trắng in hoa. Mỗi giây tính lại từ `Date.now()` cộng độ lệch với giờ server (không giảm biến đếm, để tab nền bị throttle vẫn hiển thị đúng khi quay lại).
**Rule**
- **BR-001 — Sự kiện đã bắt đầu khi thời điểm hiện tại ≥ mốc bắt đầu.** Phía client dùng cùng phép so epoch ms: còn lại ≤ 0 thì coi là về 0. *(§ 4.4)*
- **BR-003 — Mỗi đơn vị hiển thị đúng hai chữ số trong phạm vi hợp lệ.** Days kẹp 00–99, Hours 00–23, Minutes 00–59; giá trị âm hoặc ngoài phạm vi hiển thị `00`. Dưới 1 ngày thì Days là `00`.
**Result**
- Không ghi dữ liệu; chỉ cập nhật DOM mỗi giây.
- Khi còn lại ≤ 0: cả ba khối hiển thị `00` rồi `router.replace('/login')`; request đó đi qua A1 nên nếu server vẫn chưa đến giờ thì bị trả về `/countdown` (xem § 5.3).
**Shared structure:** `ALG-001` — tách số ms còn lại thành Days/Hours/Minutes rồi định dạng hai chữ số theo BR-003, chi tiết *(§ 4.5)*
**Source:** `components/countdown/countdown-timer.tsx:16-47`, `components/countdown/countdown-unit.tsx`, `lib/countdown/server-clock-offset.ts:2-8`

### 3.2 Edge cases

| Action | Scenario | Behavior |
|---|---|---|
| A1 | Mốc `EVENT_START_AT` thiếu hoặc sai định dạng | Coi như đã bắt đầu: không redirect về `/countdown`; `/countdown` redirect sang `/login`; `console.error` phía server, không lộ chi tiết ra client |
| A1 | Trước giờ, truy cập `/login`, trang chủ hoặc URL không tồn tại | 307 về `/countdown` (DEC-001) |
| A1 | Trước giờ, request tới `_next/static`, `_next/image`, `images/`, `favicon.ico`, `robots.txt`, `sitemap.xml` | Không qua gate; nếu không loại, trang đếm ngược mất CSS/ảnh |
| A1 | Trước giờ, người dùng đã đăng nhập hoặc phiên hết hạn | Vẫn về `/countdown`; gate chạy trước kiểm tra phiên nên không có redirect sang login vì phiên |
| A1 · A2 | Sau giờ, mở `/countdown` | 307 sang `/login` (DEC-002); `/login` là màn Login đã làm (ngoài phạm vi F001); `proxy.ts` chuyển người đã đăng nhập từ `/login` sang `/` sau gate |
| A3 | Còn lại < 1 ngày | Days `00`, Hours/Minutes tiếp tục giảm |
| A3 | Giá trị âm, Hours ≥ 24, Minutes ≥ 60 (đầu vào hàm định dạng) | Hiển thị `00` |
| A3 | Days > 99 | Kẹp ở `99` |
| A3 | Còn lại ≤ 0 | `00` `00` `00` rồi chuyển `/login` |
| A3 | Đồng hồ máy khách lệch so với server | Có thể redirect `/login` sớm rồi bị gate đẩy về `/countdown`, vòng lặp tới khi hai đồng hồ cùng qua mốc — xem § 5.3 |

## 4. Shared Foundation

### 4.1 Components

| Component | Responsibility | Used in | File |
|---|---|---|---|
| `proxy` | Gate redirect theo DEC-001/DEC-002, matcher loại asset tĩnh (danh sách tường minh) | A1 | `proxy.ts` |
| `getEventStartAt`, `isEventLaunched` | Đọc và parse `EVENT_START_AT` thành epoch ms, trả `null` và log lỗi khi thiếu/sai (BR-002); điểm duy nhất cần sửa khi chuyển nguồn sang Supabase | A1, A2 | `lib/event/get-event-start-at.ts` |
| `CountdownPage` | Server Component: layout tĩnh, truyền mốc xuống client | A2 | `app/countdown/page.tsx` |
| `CountdownTimer` | Client leaf: interval 1s, đếm theo giờ server, redirect khi về 0 | A3 | `components/countdown/countdown-timer.tsx` |
| `CountdownUnit` | Một khối đơn vị: hai hộp chữ số LED và nhãn | A3 | `components/countdown/countdown-unit.tsx` |
| `splitRemainingTime` | Hàm thuần cho ALG-001, dễ kiểm bằng Vitest | A3 | `lib/countdown/split-remaining-time.ts` |
| `resolveGateRedirect` | Hàm thuần quyết định đích redirect theo (pathname, đã/chưa đến giờ) cho DEC-001/DEC-002 | A1 | `lib/countdown/resolve-gate-redirect.ts` |
| `getClockOffsetMs`, `getCorrectedNowMs` | Tính độ lệch client–server và giờ đã hiệu chỉnh (giải quyết § 5.3 mục 1) | A3 | `lib/countdown/server-clock-offset.ts` |
| `CountdownScreen` | Khung tĩnh: ảnh nền, lớp phủ, tiêu đề | A2 | `components/countdown/countdown-screen.tsx` |

### 4.2 Data Model

#### Key Entities

| Entity | Table | Key Columns | Purpose |
|--------|-------|-------------|---------|
| — | — | — | Không có bảng dữ liệu: mốc thời gian lấy từ biến môi trường, chưa dùng Supabase |

#### Polymorphic Behavior

N/A — no discriminator fields in Key Entities.

### 4.3 State Management

None.

### 4.4 Shared Rules

#### Bin 2 — used by ≥2 named actions

**BR-001 — Sự kiện đã bắt đầu khi thời điểm hiện tại ≥ mốc bắt đầu, so sánh bằng epoch ms.**
Used in: **A1** · **A3**. Phía server (A1) quyết định redirect, phía client (A3) quyết định khi nào chuyển sang đăng nhập; hai nơi dùng cùng phép so để không lệch nhau trừ khi đồng hồ hai bên lệch.
**Source:** `lib/event/get-event-start-at.ts:24-26`, `lib/countdown/split-remaining-time.ts:31`
```text
launched = (Date.now() >= eventStartAtMs)
```

**BR-002 — Mốc thiếu hoặc sai định dạng thì coi như đã bắt đầu và ghi log lỗi phía server.**
Used in: **A1** · **A2**. `getEventStartAt` trả `null`; cả hai nơi xử lý `null` như "đã bắt đầu" để không khóa nhầm toàn bộ site.
**Source:** `lib/event/get-event-start-at.ts:14-21`, `app/countdown/page.tsx:14`
```text
eventStartAtMs = parseIso(env.EVENT_START_AT)      # ISO 8601, có offset
if eventStartAtMs is NaN or env missing:
    console.error("EVENT_START_AT invalid")          # không kèm giá trị thô ra client
    return null
launched = (eventStartAtMs == null) OR (Date.now() >= eventStartAtMs)
```

### 4.5 Algorithms & Integrations

### Tách thời gian còn lại thành Days/Hours/Minutes hai chữ số (ALG-001)
**Linked FR:** FR-203
**Used in:** A3
**Source:** `lib/countdown/split-remaining-time.ts:8-12` (`formatUnit`), `:22-33` (`splitRemainingTime`)
**Input:** `targetMs`, `nowMs` (epoch ms) · **Output:** ba chuỗi hai chữ số · **Complexity:** O(1)
**Description:** Tính phần còn lại không âm, tách thành ngày/giờ/phút nguyên, định dạng theo BR-003. Tính từ `nowMs` tuyệt đối mỗi lần gọi, không giữ biến đếm, nên tab nền hay máy treo không làm lệch. Hàm định dạng tự xử lý đầu vào ngoài phạm vi (âm, Hours ≥ 24, Minutes ≥ 60) để khớp các case kiểm thử.

**Pseudocode:**
```text
remainingMs = max(0, targetMs - nowMs)
totalMin    = floor(remainingMs / 60000)
days        = floor(totalMin / 1440)
hours       = floor((totalMin % 1440) / 60)
minutes     = totalMin % 60

formatUnit(value, max, clampOverflow):
  if value is not finite or value < 0: return "00"
  if value > max: return clampOverflow ? pad2(max) : "00"
  return pad2(value)

days -> formatUnit(days, 99, true); hours -> (hours, 23, false); minutes -> (minutes, 59, false)
```

Không có INT-### nào: không gọi dịch vụ ngoài.

### 4.6 Configuration

```text
EVENT_START_AT   = <ISO 8601, offset +07:00>   # chỉ đọc phía server, không gắn tiền tố NEXT_PUBLIC_; không phải secret nên được phép đặt trong vars của wrangler.jsonc
TICK_INTERVAL_MS = 1000                          # chu kỳ tính lại của A3
```

**Client behavior:** see behavior-logic.md, permissions.md, architecture.md

## 5. Verification & Technical Notes

### 5.1 Technical Verification

Kiểm thử theo `e2e-red-first`: viết E2E (Playwright) đỏ trước cho A1/A2/A3, Vitest cho ALG-001.

- **SC-001** *(A1)* Với `EVENT_START_AT` ở tương lai, mọi path ngoài `/countdown` và asset tĩnh đều 307 về `/countdown`; với `EVENT_START_AT` ở quá khứ, `/countdown` 307 sang `/login` (covers FR-101, FR-102, DEC-001, DEC-002)
- **SC-002** *(A1)* `EVENT_START_AT` thiếu hoặc sai: không path nào bị chặn, có log lỗi phía server, response không chứa giá trị thô (covers FR-002, BR-002)
- **SC-003** *(A3)* Đầu vào Days/Hours/Minutes `0, 9, 10, 31 / 0, 9, 10, 23 / 0, 9, 10, 59` ra `00, 09, 10, 31 / 00, 09, 10, 23 / 00, 09, 10, 59`; Hours `-1`, `25` và Minutes `-1`, `60` ra `00`; Days < 1 ra `00`; ≤ 0 ra `00` (covers FR-203, FR-204, FR-205, BR-003, ALG-001)
- **SC-004** *(A3)* Khi bộ đếm về 0 trên trang đang mở, trình duyệt tới `/login` (covers FR-103, BR-001)

#### US001 *(A1, A2)*

**Independent Test:** đặt `EVENT_START_AT` ở tương lai, mở `/` rồi `/login`, quan sát URL cuối và nội dung.

**Acceptance Scenarios:**

1. **Given** chưa đến giờ, **When** mở `/` hoặc `/login`, **Then** URL cuối là `/countdown` và trang hiện tiêu đề cùng ba khối.
2. **Given** chưa đến giờ, **When** tải trang đếm ngược, **Then** ảnh và CSS vẫn tải (asset tĩnh không bị redirect).

#### US002 *(A2, A3)*

**Independent Test:** đồng hồ giả của Playwright đặt còn 2 ngày 3 giờ 4 phút, tiến thời gian và đọc ba khối.

**Acceptance Scenarios:**

1. **Given** còn 2 ngày 3 giờ 4 phút, **When** trang tải, **Then** hiển thị `02`, `03`, `04`.
2. **Given** trang đang mở, **When** qua một phút, **Then** Minutes giảm một mà không cần tải lại.

#### US003 *(A1, A3)*

**Independent Test:** đặt mốc cách hiện tại vài giây, mở trang và chờ.

**Acceptance Scenarios:**

1. **Given** còn vài giây, **When** bộ đếm về 0, **Then** ba khối hiện `00` và trình duyệt tới `/login`.
2. **Given** đã qua giờ, **When** mở `/countdown`, **Then** 307 sang `/login` mà không render trang đếm ngược.

### 5.2 Assumptions

- *(A1)* "Mọi route" gồm cả route handler dưới `app/api/*`; redirect dùng 307 mặc định của `NextResponse.redirect`. Chưa có route nào như vậy trong repo nên chưa kiểm được.
- *(A1)* Matcher loại tường minh `_next/static`, `_next/image`, `images/`, `favicon.ico`, `robots.txt`, `sitemap.xml`; trang đếm ngược cần các tài nguyên này để dựng đúng. Asset tĩnh mới đặt ngoài các đường dẫn này phải được thêm vào matcher.
- *(A1, A2)* `process.env.EVENT_START_AT` đọc được lúc request trong proxy và Server Component trên Cloudflare Workers qua OpenNext (`nodejs_compat`); chưa chạy thử nên là giả định thiết kế, không phải hành vi đã xác nhận.
- *(A3)* `router.replace('/login')` là điều hướng mềm và vẫn đi qua A1.

### 5.3 Unresolved Questions

1. **Đồng hồ máy khách lệch** *(A1, A3)*: nếu đồng hồ máy khách nhanh hơn server, A3 chuyển `/login`, A1 trả lại `/countdown`, A3 lại chuyển — vòng lặp. Hiệu chỉnh bằng giờ server (truyền `serverNow` cùng mốc) hay chấp nhận rủi ro; liên quan Open Decision D001 trong functional-spec. **RESOLVED 2026-10-09:** server truyền `serverNow` cùng `target`; client đếm theo độ lệch `serverNow - Date.now()` lúc nhận.
2. **`cacheComponents` và giá trị đầu tiên** *(A2, A3)*: đọc env và `Date.now()` trong Server Component cần ranh giới động (Suspense hoặc `connection()`); render lần đầu cần tránh lệch hydration và tránh nháy `00` trước khi tính xong. Cách chọn để lúc triển khai.
3. **Thứ tự với việc khác trong `proxy.ts`** *(A1)*: CSP theo nonce và làm mới phiên Supabase bằng `getClaims()` cũng sống ở đây (CLAUDE.md); gate nên đặt đầu và trả sớm, chưa chốt cách ghép. **PARTLY RESOLVED 2026-10-12:** gate đặt đầu và trả sớm; sau gate, `updateSession` (`lib/supabase/update-session.ts`, `getClaims()`) làm mới phiên rồi `resolveAuthRedirect` chuyển người đã đăng nhập khỏi `/login`; CSP theo nonce chưa làm.
4. **Đọc env trong proxy trên OpenNext** *(A1)*: xác nhận `vars` trong `wrangler.jsonc` có sẵn qua `process.env` ở edge.

### 5.4 Source References

Mã nguồn: `proxy.ts`, `lib/countdown/*.ts`, `lib/event/get-event-start-at.ts`, `app/countdown/page.tsx`, `components/countdown/*.tsx`. Kiểm thử: `tests/unit/*.test.ts` (Vitest), `tests/e2e/countdown-prelaunch-gate.spec.ts` (Playwright, ba server giả lập: mốc ở tương lai / quá khứ / không hợp lệ).

#### Data Flow

```text
request pathname -> proxy#countdownGate so Date.now() với getEventStartAt() -> redirect 307 | next
CountdownPage#render -> getEventStartAt() -> props target + serverNow -> CountdownTimer#tick (mỗi 1000ms)
  -> splitRemainingTime(target, Date.now() + offset) -> 3 chuỗi 2 chữ số -> DOM
  -> remaining <= 0 -> router.replace('/login')            (derived from § 3 above)
```

### 5.5 Artifact References

| Artifact | File | Codes Used | Reviewed |
|----------|------|------------|----------|
| System Overview | [system-overview.md](../../docs/system/system-overview.md) | — | [ ] |
| Architecture | [architecture.md](../../docs/system/architecture.md) | TBD (draft) | [ ] |
| Feature List | [feature-list.md](../../docs/generated/feature-list.md) | F001 | [ ] |
| Screens | [functional-spec.md § 6](../../docs/features/F001_CountdownPrelaunchGate/functional-spec.md#6-screens) | SCR001 | [ ] |
| Permissions | [permissions.md](../../docs/system/permissions.md) | TBD (draft) | [ ] |
