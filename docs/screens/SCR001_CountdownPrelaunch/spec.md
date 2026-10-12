---
status: implemented
authored_by: takumi
created: 2026-10-09
lang: vi
fcode: F001
---

# SCR-countdown — Screen Spec

**Screen**: SCR-countdown: Countdown Prelaunch Page
**Feature**: F001_CountdownPrelaunchGate
**Type**: atomic
**Route**: /countdown
**Generated**: 2026-10-09

## 1. Overview

**Purpose:** Người truy cập thấy còn bao nhiêu ngày, giờ, phút nữa sự kiện SAA 2025 mở, khi họ vào ứng dụng trước giờ mở.
**Actors:** Visitor
**Entry Conditions:** Thời điểm hiện tại còn trước giờ mở sự kiện; trang này công khai, không cần đăng nhập.
**Exit Conditions:** Bộ đếm về 0 và màn hình bàn giao sang màn Login; hoặc người dùng mở trang này sau giờ mở và bị chuyển đi ngay.

## 2. Screen Layout

### Layout Sketch

Ảnh nền với họa tiết nhiều màu phủ toàn bộ khung nhìn, kèm lớp phủ tối bán trong suốt để chữ trắng đủ tương phản. Nội dung căn giữa: tiêu đề "Sự kiện sẽ bắt đầu sau" ở trên, bên dưới là một hàng ba khối Days, Hours, Minutes; mỗi khối có hai hộp chữ số kiểu LED và nhãn trắng in hoa nằm dưới.

```
┌────────────────────────────────────────────┐
│ R1: Background (static, full viewport)     │
│  ┌──────────────────────────────────────┐  │
│  │ R2: Countdown Content (center)       │  │
│  │      Sự kiện sẽ bắt đầu sau          │  │
│  │  [0][3]      [0][5]      [0][7]      │  │
│  │   DAYS        HOURS      MINUTES     │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Background | static | no | TBD (draft) |
| R2 | Countdown Content | static | no | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Background Image | image | — | Ảnh nền cover, no-repeat, kèm lớp phủ tối | Always | — | static | cover | — | N/A |
| E02 | Sự kiện sẽ bắt đầu sau | region label | — | Chữ cố định, trắng, căn giữa | Always | — | static | raw | — | N/A |
| E03 | Days (giá trị) | display field | — | 00 | Always | — | computed | 2 chữ số, kẹp 00–99 | hiển thị 00 | N/A |
| E04 | DAYS | region label | — | Chữ trắng in hoa | Always | — | static | raw | — | N/A |
| E05 | Hours (giá trị) | display field | — | 00 | Always | — | computed | 2 chữ số, 00–23 | hiển thị 00 | N/A |
| E06 | HOURS | region label | — | Chữ trắng in hoa | Always | — | static | raw | — | N/A |
| E07 | Minutes (giá trị) | display field | — | 00 | Always | — | computed | 2 chữ số, 00–59 | hiển thị 00 | N/A |
| E08 | MINUTES | region label | — | Chữ trắng in hoa | Always | — | static | raw | — | N/A |

Mỗi giá trị E03, E05, E07 là hai hộp chữ số kiểu LED. Ánh xạ MoMorph itemId: E01 `2268:35129`, E02 `2268:35137`, E03/E04 `2268:35139`, E05/E06 `2268:35144`, E07/E08 `2268:35149`.

## 4. User Actions

### Available Actions

N/A — no elements carry a discrete user-triggered action.

### Happy Path

1. Màn hình hiện tiêu đề và ba khối với giá trị tính từ thời điểm hiện tại, ví dụ 03 / 05 / 07.
2. Mỗi giây giá trị được tính lại; Minutes giảm một sau mỗi phút, Hours và Days giảm khi tới lượt.
3. Khi còn dưới 1 ngày, E03 hiện 00 và hai khối còn lại tiếp tục đếm.
4. Khi thời gian còn lại về 0, cả ba khối hiện 00 và màn hình ngừng đếm (bàn giao xem `## 8. Navigation`).

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Bước 3 | Còn dưới 1 ngày | Days hiện 00 | TBD (draft) |
| Mỗi lần cập nhật | Giá trị âm, Hours ≥ 24 hoặc Minutes ≥ 60 | Khối đó hiện 00 | TBD (draft) |
| Mỗi lần cập nhật | Days lớn hơn 99 | Days hiện 99 | TBD (draft) |
| Bước 4 | Thời gian còn lại bằng hoặc dưới 0 | Cả ba khối hiện 00 | TBD (draft) |

### Interaction Notes

N/A — no non-trivial interaction patterns detected (only standard form input bindings).

## 5. UI States

> Màn hình không gọi API (mốc thời gian có sẵn khi tải trang) nên không có trạng thái loading, error, empty, saving, success.

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| initial | Lần hiển thị đầu tiên | Hiện ngay giá trị đúng theo thời điểm hiện tại, không nháy 00 rồi mới nhảy số [EXPECTED] | none | TBD (draft) |
| ticking | Mỗi giây | Giá trị ba khối cập nhật | none | TBD (draft) |
| under-one-day | Còn dưới 1 ngày | Days là 00 | none | TBD (draft) |
| completed | Còn lại ≤ 0 | Cả ba khối là 00, rồi bàn giao sang Login | none | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E03 | Hai chữ số, tối đa 99; âm thì 00 | Không có thông báo; hiện 00 hoặc 99 | change |
| E05 | Hai chữ số, 00–23; ngoài phạm vi thì 00 | Không có thông báo; hiện 00 | change |
| E07 | Hai chữ số, 00–59; ngoài phạm vi thì 00 | Không có thông báo; hiện 00 | change |

## 7. Conditional UI

N/A — no conditional UI detected.

## 8. Navigation

> **D3 — the DRY statement that MUST appear verbatim in the template and the contract:**
>
> `## 8. Navigation` is the **per-screen projection** of `screen-flow.md § Screen Access Paths`.
> It is not a second source of truth. Every row here MUST be derivable from a path in
> `screen-flow.md`; every path in `screen-flow.md` touching this SCR### MUST appear here.
> Two-way consistency is a reviewer rule (`screen.nav_flow_skew`), not a Python check.
> `## 4. User Actions § Happy Path` narrative keeps its v27 scope rule unchanged: **prose still
> must not narrate cross-screen navigation**; only the § Exits *table* may name destinations.

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| external | Mở bất kỳ trang nào của ứng dụng (kể cả gõ địa chỉ) | Còn trước giờ mở sự kiện; hệ thống chuyển về màn này | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Bộ đếm về 0 | E03, E05, E07 | Thời gian còn lại ≤ 0 | `/login` — màn Login (task riêng) | redirect | TBD (draft) |
| Mở màn này sau giờ mở | — | Đã đến giờ mở sự kiện | `/login` — màn Login (task riêng) | redirect trước khi hiển thị | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Mỗi khối có tên đọc được gắn với nhãn DAYS/HOURS/MINUTES; hai hộp chữ số đọc thành một số, không đọc từng hộp |
| Keyboard navigation | [EXPECTED] | Không có phần tử tương tác nên không có điểm dừng Tab |
| Focus management | [EXPECTED] | Không cần quản lý focus; không có hộp thoại |
| Screen reader compatibility | [EXPECTED] | Không dùng vùng thông báo tự đọc mỗi giây để tránh đọc liên tục; chữ trắng trên lớp phủ tối đạt tương phản đọc được |
| Error announcement | [EXPECTED] | Màn hình không có thông báo lỗi nào để đọc |

## 10. Responsive Behavior

N/A — no responsive behavior found in source.

Màn hình nhỏ: giữ ba khối trên một hàng, thu nhỏ chữ số và khoảng cách theo bề rộng màn hình (D002, chốt 2026-10-09).
