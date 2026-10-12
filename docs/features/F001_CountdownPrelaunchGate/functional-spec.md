---
status: draft
authored_by: takumi
created: 2026-10-09
lang: vi
---

# Functional Spec — F001_CountdownPrelaunchGate

**Priority**: P0
**Type**: ui
**Generated**: 2026-10-09

**See also:** [`technical-spec.md`](./technical-spec.md) — cách chặn truy cập, thuật toán và kiểm thử cho Dev/QA/SA.

## 1. Overview

**Problem:** Trước giờ mở SAA 2025, người dùng không được vào các trang khác của ứng dụng nhưng cũng cần biết còn bao lâu nữa sự kiện mở, và khi tới giờ phải được đưa vào đăng nhập ngay.
**Solution:** Trước giờ mở, mọi trang đều đưa người dùng về một trang đếm ngược hiển thị số ngày, giờ, phút còn lại và cập nhật mỗi giây. Khi về 0 trang tự chuyển sang đăng nhập; mở trang đếm ngược sau giờ mở cũng chuyển thẳng sang đăng nhập.
**Scope:** Khóa truy cập trước giờ mở, trang đếm ngược Days/Hours/Minutes, chuyển sang đăng nhập khi tới giờ.
**Non-Scope:** Màn đăng nhập, hiển thị giây, tiếng Anh cho tiêu đề, lấy mốc thời gian từ API hay Supabase, ngoại lệ cho quản trị viên hay người đã đăng nhập.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Visitor | Người truy cập ứng dụng, đã hoặc chưa đăng nhập | Biết khi nào sự kiện mở và vào hệ thống ngay khi mở |

## 2. Functional Capabilities

**Single-capability rationale:** US001, US002 và US003 cùng phục vụ một kết quả duy nhất là giữ người dùng ở trang chờ cho tới giờ mở rồi đưa họ vào đăng nhập.

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | CountdownPrelaunchGate | Xem còn bao lâu tới giờ mở sự kiện, không vào được trang khác trước giờ, và được đưa sang đăng nhập khi tới giờ | US001, US002, US003 | FR-001, FR-002, FR-101, FR-102, FR-103, FR-201, FR-202, FR-203, FR-204, FR-205, FR-601 | BR-001, BR-002, BR-003, DEC-001, DEC-002 | SCR001 |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | Đồng hồ máy người dùng nhanh hơn máy chủ thì có thể bị chuyển sang đăng nhập rồi bị đẩy lại trang đếm ngược lặp đi lặp lại; xử lý thế nào? | Hiệu chỉnh bộ đếm theo giờ máy chủ gửi kèm mốc thời gian | Chặn hẳn vòng lặp mà chỉ tốn một giá trị thêm — **RESOLVED 2026-10-09: hiệu chỉnh theo `serverNow`** | no |
| D002 | Trên màn hình nhỏ ba khối Days/Hours/Minutes xếp thế nào? Spec MoMorph không nêu | Giữ ba khối trên một hàng, thu nhỏ theo bề rộng màn hình | Chỉ có ba khối hai chữ số, vừa một hàng ở mọi cỡ phổ biến — **RESOLVED 2026-10-09: một hàng, thu nhỏ** | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** Mốc bắt đầu sự kiện được cấu hình phía máy chủ kèm múi giờ +07:00, và so sánh theo thời điểm tuyệt đối nên không phụ thuộc múi giờ máy người dùng.
- **FR-002** Khi mốc thiếu hoặc sai định dạng, hệ thống coi như sự kiện đã bắt đầu, không khóa trang nào và ghi lỗi phía máy chủ.

### Navigation (1xx)

- **FR-101** Trước giờ mở, mọi trang trừ trang đếm ngược và tài nguyên tĩnh (ảnh, giao diện) đều chuyển người dùng về trang đếm ngược.
- **FR-102** Sau giờ mở, mở trang đếm ngược sẽ chuyển thẳng sang trang đăng nhập.
- **FR-103** Khi bộ đếm đang hiển thị về 0, trang tự chuyển sang trang đăng nhập.

### Countdown Prelaunch Page (2xx)

- **FR-201** Trang hiện tiêu đề "Sự kiện sẽ bắt đầu sau" ở phía trên ba khối đếm ngược.
- **FR-202** Ba khối Days, Hours, Minutes, mỗi khối là hai hộp chữ số kiểu LED với nhãn DAYS, HOURS, MINUTES màu trắng in hoa bên dưới.
- **FR-203** Mỗi khối luôn hai chữ số có số 0 đứng đầu; Days tối đa 99, Hours 00–23, Minutes 00–59, giá trị âm hoặc ngoài phạm vi hiển thị 00.
- **FR-204** Số tự cập nhật mỗi giây; còn dưới 1 ngày thì Days hiển thị 00.
- **FR-205** Khi thời gian còn lại bằng hoặc dưới 0, cả ba khối hiển thị 00.

### Security (6xx)

- **FR-601** Trang đếm ngược công khai, không cần đăng nhập; việc khóa truy cập áp dụng cho mọi người như nhau, không phân biệt đã đăng nhập hay vai trò.

## 5. Business Rules

- Sự kiện đã bắt đầu khi thời điểm hiện tại bằng hoặc sau mốc bắt đầu; mọi nơi dùng cùng một phép so sánh (BR-001)
- Mốc thiếu hoặc sai thì coi như sự kiện đã bắt đầu, để một lỗi cấu hình không khóa cả ứng dụng (BR-002)
- Mỗi đơn vị luôn hai chữ số; Days tối đa 99, Hours 00–23, Minutes 00–59, giá trị âm hoặc ngoài phạm vi hiển thị 00 (BR-003)
- Trước giờ mở, người dùng vào trang nào ngoài trang đếm ngược cũng bị đưa về trang đếm ngược (DEC-001)
- Sau giờ mở, người dùng mở trang đếm ngược sẽ được đưa thẳng sang đăng nhập (DEC-002)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Countdown Prelaunch Page | SCR001 | Ảnh nền toàn màn hình, tiêu đề "Sự kiện sẽ bắt đầu sau", ba khối Days/Hours/Minutes đếm lùi | Chỉ xem; trang không có nút hay ô nhập |

### User Journey

1. Người dùng mở một trang bất kỳ của ứng dụng trước giờ mở sự kiện và được đưa tới Countdown Prelaunch Page.
2. Người dùng thấy tiêu đề "Sự kiện sẽ bắt đầu sau" cùng số ngày, giờ, phút còn lại, số đổi theo từng giây.
3. Người dùng thử gõ địa chỉ trang khác và vẫn quay về Countdown Prelaunch Page.
4. Khi bộ đếm về 00-00-00, người dùng tự được đưa tới màn Login.
5. Nếu người dùng mở Countdown Prelaunch Page sau giờ mở, họ được đưa thẳng tới màn Login mà không thấy trang đếm ngược.

## 7. User Stories

### US001 — Bị giữ ở trang chờ trước giờ mở

**Actor:** Visitor
**Goal:** Dù mở trang nào trước giờ mở, được đưa tới trang cho biết sự kiện chưa bắt đầu.
**Business value:** Không ai vào được các tính năng khi sự kiện chưa mở, và người dùng biết lý do.

**Acceptance Criteria:**
- [ ] Mở trang chủ, đăng nhập hoặc địa chỉ không tồn tại trước giờ mở đều dẫn tới trang đếm ngược
- [ ] Ảnh và giao diện của trang đếm ngược vẫn tải bình thường

### US002 — Xem thời gian còn lại

**Actor:** Visitor
**Goal:** Biết còn bao nhiêu ngày, giờ, phút nữa sự kiện mở.
**Business value:** Tạo kỳ vọng và cho người dùng biết khi nào quay lại.

**Acceptance Criteria:**
- [ ] Thấy ba khối DAYS, HOURS, MINUTES, mỗi khối hai chữ số
- [ ] Số tự giảm theo thời gian mà không cần tải lại trang

### US003 — Được đưa vào đăng nhập khi sự kiện mở

**Actor:** Visitor
**Goal:** Tới giờ mở thì vào được hệ thống mà không phải tự tìm đường.
**Business value:** Người dùng vào ngay lúc mở sự kiện, không bỏ lỡ.

**Acceptance Criteria:**
- [ ] Đang mở trang đếm ngược khi bộ đếm về 0 thì tự sang trang đăng nhập
- [ ] Mở trang đếm ngược sau giờ mở thì sang trang đăng nhập ngay

## 8. Scenarios

### US001 — Happy Path

**Given** chưa đến giờ mở sự kiện, **When** người dùng mở trang chủ, **Then** họ thấy trang đếm ngược.

### US001 — Error: cấu hình mốc thời gian sai

**Given** mốc bắt đầu bị thiếu hoặc sai định dạng, **When** người dùng mở trang chủ, **Then** trang chủ mở bình thường, không bị chặn.

### US002 — Happy Path

**Given** còn 3 ngày 5 giờ 7 phút, **When** trang đếm ngược tải xong, **Then** ba khối hiện 03, 05, 07 và Minutes giảm một sau mỗi phút.

### US002 — Error: giá trị ngoài phạm vi

**Given** một đơn vị nhận giá trị âm hoặc ngoài phạm vi (Hours 25, Minutes 60), **When** hiển thị, **Then** khối đó hiện 00.

### US003 — Happy Path

**Given** trang đếm ngược đang mở và còn vài giây, **When** bộ đếm về 0, **Then** ba khối hiện 00 và trang tự sang đăng nhập.

### US003 — Error: mở trang đếm ngược sau giờ mở

**Given** sự kiện đã bắt đầu, **When** người dùng gõ thẳng địa chỉ trang đếm ngược, **Then** họ được đưa thẳng tới đăng nhập mà không thấy trang đếm ngược.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Còn dưới 1 ngày | Days hiển thị 00, Hours và Minutes tiếp tục giảm | None — hiển thị 00 |
| Giá trị âm hoặc Hours ≥ 24, Minutes ≥ 60 | Khối đó hiển thị 00 | None — hiển thị 00 |
| Days lớn hơn 99 | Days hiển thị 99 | None — hiển thị 99 |
| Thời gian còn lại bằng hoặc dưới 0 | Cả ba khối hiện 00 rồi tự sang đăng nhập | None — silent handling |
| Mốc bắt đầu thiếu hoặc sai định dạng | Không khóa trang nào; mở trang đếm ngược thì sang đăng nhập; lỗi được ghi phía máy chủ | None — silent handling |
| Trước giờ mở, người dùng đã đăng nhập hoặc phiên hết hạn | Vẫn bị đưa về trang đếm ngược, không có chuyển hướng riêng vì phiên | None — chỉ thấy trang đếm ngược |
| Trước giờ mở, địa chỉ không tồn tại | Đưa về trang đếm ngược | None — chỉ thấy trang đếm ngược |
| Sau giờ mở, người dùng đã đăng nhập mở màn Login | Được đưa sang trang chủ `/` (do `proxy.ts` sau cổng, ngoài phạm vi F001) | None — silent handling |

## 10. Edge Behaviours to Verify

- **FR-001** → Đổi mốc cấu hình thì số đếm đổi theo; đổi múi giờ máy người dùng không làm số đổi.
- **FR-002** → Bỏ trống hoặc sai mốc: mở trang nào cũng không bị chặn.
- **FR-101** → Trước giờ, trang chủ, trang đăng nhập và địa chỉ không tồn tại đều về trang đếm ngược; ảnh và giao diện vẫn tải.
- **FR-102** → Sau giờ, mở trang đếm ngược dẫn thẳng tới đăng nhập.
- **FR-103** → Mở trang lúc còn vài giây, bộ đếm về 0 thì tự sang đăng nhập.
- **FR-201** → Tiêu đề đúng chữ "Sự kiện sẽ bắt đầu sau".
- **FR-202** → Ba khối đủ hai hộp chữ số kiểu LED, nhãn DAYS, HOURS, MINUTES trắng, in hoa.
- **FR-203** → Days 0, 9, 10, 31 ra 00, 09, 10, 31; Hours 0, 9, 10, 23 ra 00, 09, 10, 23; Minutes 0, 9, 10, 59 ra 00, 09, 10, 59; Hours -1 hoặc 25, Minutes -1 hoặc 60 ra 00.
- **FR-204** → Số tự đổi mỗi giây không cần tải lại; còn dưới 1 ngày thì Days là 00.
- **FR-205** → Về 0 hoặc âm thì cả ba khối là 00.
- **FR-601** → Chưa đăng nhập vẫn xem được trang đếm ngược; đã đăng nhập hoặc phiên hết hạn trước giờ mở vẫn chỉ thấy trang này.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | Đồng hồ máy người dùng lệch so với máy chủ có thể gây chuyển qua lại giữa đăng nhập và trang đếm ngược quanh giờ mở (D001) | Người dùng thấy trang nháy lặp tới khi hai đồng hồ cùng qua mốc | [INFERRED] |
| RISK-02 | risk | Màn Login làm ở task riêng; tới giờ mở mà chưa xong thì người dùng vào trang không tồn tại | Người dùng không vào được hệ thống đúng giờ mở | [EXPECTED] |
| RISK-03 | risk | Mốc cấu hình sai thì hệ thống mở khóa sớm (không khóa khi lỗi, BR-002) | Người dùng vào được các trang trước giờ mở nếu không ai xem log | [EXPECTED] |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| Màn Login (feature riêng, chưa có mã) | feature | Là nơi người dùng được đưa tới khi tới giờ mở | FR-102, FR-103 |
| Mốc bắt đầu sự kiện | config | Cơ sở để quyết định khóa hay mở và đếm ngược | FR-001, BR-001 |

## 13. Configuration

```text
EVENT_START_AT = <thời điểm ISO 8601 kèm +07:00>   # mốc mở sự kiện; trước mốc này mọi trang ngoài trang đếm ngược bị khóa
DAYS_DISPLAY_MAX = 99                                # Days hiển thị tối đa 99
```
