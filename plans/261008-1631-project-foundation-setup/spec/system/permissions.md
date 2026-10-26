---
status: draft
authored_by: takumi
created: 2026-10-08
lang: vi
---

# Permissions

**Project**: aidd-mockproject
**Generated**: 2026-10-08
**Analysis Scope**: Mô hình auth/session + ranh giới authorization do tính năng
`project-foundation` dựng nền (forward-authored, chưa có code — xem
`plans/261008-1631-project-foundation-setup/spec/project-foundation/`).

> **Bản nháp forward-authored (Stage 1.5, greenfield).** Tài liệu này sẽ được Core pass đối chiếu
> lại với code thật sau khi implement. Mọi `PERM###` dưới đây là `TBD (draft)` — ID thật được cấp
> phát ở bước reconcile, không được đoán trước ở đây.

## Authorization System Type

**System Type**: hybrid (ownership qua RLS + phiên đăng nhập xác thực qua cookie)

| System Type | Description |
|-------------|-------------|
| `rbac` | Role-Based Access Control — roles (admin, user, manager) drive access |
| `abac` | Attribute-Based Access Control — policies on attributes (department, owner, status) |
| `acl` | Access Control List — explicit per-user permissions |
| `ownership` | Resource Ownership — owner_id / created_by / can_edit rules |
| `hybrid` | Mixed — roles combined with ownership checks |
| `other` | Custom permission logic |

**Identified Roles** *(tại giai đoạn nền tảng này, chỉ có một lớp phân biệt)*:
- Anonymous (chưa đăng nhập)
- Authenticated User (đã đăng nhập qua Supabase Auth)

Không có role nghiệp vụ nào khác (admin/manager/...) được xác định ở tính năng này — đó là việc
của các feature nghiệp vụ dùng lại nền tảng này sau này.

## Curated View

- **Anonymous** chỉ có thể gọi các action công khai: đăng nhập, đăng ký, và health-check
  (`/api/health`, đọc-only, không yêu cầu phiên).
- **Authenticated User** có phiên hợp lệ (cookie do Supabase SSR quản lý, được `proxy.ts` làm mới
  trên mọi request) nhưng tính năng này **không cấp thêm quyền nghiệp vụ nào** ngoài việc "đã đăng
  nhập" — mọi ranh giới dữ liệu cụ thể (ai đọc/ghi được dòng nào) nằm ở RLS policy của từng bảng,
  được định nghĩa khi feature nghiệp vụ tạo bảng đó, không phải ở đây.
- **Không ai** (kể cả Authenticated User) có thể đọc được secret key (service-role) — khoá đó chỉ
  tồn tại trong file server-only (`lib/supabase/admin.ts`, planned), không có đường nào từ phía
  client chạm tới.

## Access Boundaries

Ranh giới chính của mô hình này là **RLS-as-authorization-boundary**: publishable key (trước đây
gọi là anon key) được gửi thẳng tới trình duyệt, an toàn để public, nhưng khả năng đọc/ghi thật sự
của nó hoàn toàn phụ thuộc vào Row Level Security (RLS) được bật trên từng bảng. Nói cách khác,
"đăng nhập được" (authentication, do tính năng này dựng) và "được phép làm gì với bảng nào"
(authorization, do RLS policy của từng bảng quyết định) là hai lớp tách biệt:

- **Authentication** (lớp do `project-foundation` sở hữu): xác nhận một request có đi kèm phiên
  hợp lệ hay không, qua `getClaims()` ở `proxy.ts` — không bao giờ qua `getSession()` (đọc cookie
  chưa xác thực chữ ký).
- **Authorization** (lớp do từng bảng/feature sở hữu): RLS policy quyết định một `auth.uid()` cụ
  thể đọc/ghi được dòng nào. `project-foundation` chỉ đặt ra **yêu cầu bắt buộc** — mọi bảng trong
  schema `public` phải bật `ENABLE ROW LEVEL SECURITY` trước khi được dùng — chứ không tự viết
  policy cho bảng nghiệp vụ nào (vì chưa có bảng nghiệp vụ nào được tạo ở tính năng này).
- **Service-role boundary:** secret key bypass toàn bộ RLS — do đó bị cô lập tuyệt đối vào file
  server-only (`lib/supabase/admin.ts`), không bao giờ mang tiền tố `NEXT_PUBLIC_`.

Route guard cụ thể (middleware `beforeEnter`/route-level interception ngoài `proxy.ts` session
refresh) — `TBD (draft)`, chưa được thiết kế ở tính năng này vì chưa có route nghiệp vụ nào cần
phân quyền riêng.

## Special Conditions

- **Session refresh trên mọi request:** `proxy.ts` (planned) chạy trên mọi route khớp matcher để
  làm mới cookie phiên — bỏ bước này khiến người dùng bị coi là đăng xuất giữa chừng dù vẫn đang
  thao tác bình thường. Đây không phải một "gate" theo nghĩa chặn truy cập, mà là điều kiện để
  trạng thái "đã đăng nhập" được duy trì chính xác.
- **Không có feature-flag/experiment/env-gate/locale-gate** nào được xác định ở tính năng nền tảng
  này — các loại gate này (nếu phát sinh) thuộc về feature nghiệp vụ cụ thể sau này, ghi nhận tại
  đây khi chúng xuất hiện (`PERM###`: `TBD (draft)`).
- **Health-check endpoint** (`/api/health`) cố tình không yêu cầu phiên đăng nhập — xem
  `spec/project-foundation/functional-spec.md § Gaps for Clarification` cho câu hỏi còn mở về việc
  có nên bảo vệ endpoint này bằng shared-secret header hay không.
