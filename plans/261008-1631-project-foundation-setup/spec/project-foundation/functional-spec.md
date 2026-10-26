---
status: draft
authored_by: takumi
created: 2026-10-08
lang: vi
---

**Priority**: P0
**Type**: background

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoint, trích dẫn Source, pseudocode,
key entities và DB writes dành cho Dev/QA/SA.

**Traceability:** F### (allocated at promote) → US001–US006 (xem § 7)

## 1. Overview

**Problem:** Dự án hiện chỉ là một bản scaffold `create-next-app` trống — chưa có cách build/deploy
production, chưa có lớp kết nối dữ liệu (Supabase), chưa có baseline bảo mật, và chưa có quy ước
tổ chức code/responsive nào được thống nhất. Nếu bắt tay viết tính năng nghiệp vụ ngay, mỗi tính
năng sau này sẽ tự chế lại phần hạ tầng này theo cách khác nhau, gây trùng lặp và rủi ro bảo mật.
**Solution:** Thiết lập một lần duy nhất bộ nền tảng dùng chung cho toàn dự án: pipeline deploy lên
Cloudflare Workers, bộ Supabase client (browser/server/admin) cùng luồng xác thực cơ bản, baseline
bảo mật (header, CSRF, cô lập secret, validate input, không lộ lỗi nội bộ), quy ước tổ chức
code/responsive, và một health-check xác minh toàn chuỗi Worker ↔ Supabase hoạt động.
**Scope:** Build và deploy Next.js 16 lên Cloudflare Workers qua OpenNext; scaffold Supabase client
và luồng đăng nhập/đăng ký/đăng xuất/callback; baseline bảo mật (header, CSRF, secrets, validate
input, error-handling không lộ chi tiết nội bộ); quy ước code-organization/responsive; một
health-check endpoint xác minh kết nối Worker–Supabase.
**Non-Scope:** Không bao gồm màn hình UI đăng nhập/đăng ký thực tế (một feature UI riêng sau này sẽ
tái sử dụng các Server Action được tạo ở đây); không tạo schema nghiệp vụ nào ngoài các bảng do
Supabase Auth tự quản lý; **không bao gồm OAuth** — v1 chỉ hỗ trợ đăng nhập/đăng ký bằng
email/password (quyết định đã chốt), OAuth để lại cho một tính năng sau nếu cần.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Developer | Kỹ sư xây dựng và mở rộng ứng dụng trên nền tảng này | Thiết lập, bảo trì hạ tầng deploy/auth/bảo mật |
| End User | Người dùng cuối truy cập ứng dụng qua trình duyệt | Đăng nhập/đăng ký/đăng xuất và duy trì phiên làm việc |
| Release Engineer | Người vận hành việc phát hành, theo dõi sức khỏe hệ thống sau khi deploy | Chạy deploy và xác minh kết nối Worker↔Supabase qua health-check |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Cloudflare Workers Deployment | Developer build và deploy ứng dụng lên Cloudflare Workers bằng một lệnh duy nhất | US001 | FR-001 | — | N/A |
| CAP-02 | Supabase Client & Auth Scaffolding | End User đăng nhập/đăng ký/đăng xuất; phiên tự làm mới liên tục | US004 | FR-002, FR-401, FR-402, FR-403, FR-404, FR-405 | BR-005, SM-001 | N/A |
| CAP-03 | Security Hardening | Mọi request đi qua hệ thống đều được bảo vệ bởi header, CSRF check, cô lập secret và RLS mặc định | US002, US003 | FR-003, FR-004, FR-601, FR-602, FR-603, FR-604 | BR-001, BR-002, BR-003, BR-004, BR-006 | N/A |
| CAP-04 | Code Organization & Responsive Conventions | Developer tuân theo một bộ quy ước tổ chức file/thành phần UI và responsive thống nhất | US006 | FR-005 | BR-007 | N/A |
| CAP-05 | Deployment Smoke Test | Release Engineer xác minh Worker gọi được tới Supabase ngay sau khi deploy | US005 | FR-006 | — | N/A |

## 3. Open Decisions

| D### | Decision | Resolution | Rationale | Blocks work |
|------|----------|-------------|-----------|--------------|
| D001 | Tên biến môi trường Supabase chính xác (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SECRET_KEY` mới, hay `NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` cũ). | **Resolved:** Supabase project cho tính năng này chưa được tạo — dùng tên biến mới (`PUBLISHABLE_KEY`/`SECRET_KEY`) ngay từ đầu, không cần nhánh dự phòng tên cũ. | Project tạo mới sau 11/2025 chỉ còn phát hành cặp key mới theo quy ước 2026. | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** Pipeline build (OpenNext) và deploy (Wrangler) lên Cloudflare Workers phải chạy được bằng một lệnh duy nhất.
- **FR-002** Phải có factory tạo Supabase client riêng cho browser, server (SSR) và admin (service-role).
- **FR-003** Mọi route động phải trả về tập header bảo mật chuẩn (CSP theo nonce, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy); asset tĩnh dùng `public/_headers` để phủ cùng tập header đó.
- **FR-004** Mọi Server Action và Route Handler nhận input từ client phải validate bằng zod trước khi chạm vào logic nghiệp vụ.
- **FR-005** Codebase phải tuân theo quy ước tổ chức file và quy ước responsive đã thống nhất (xem § 5 BR-007 và `technical-spec.md § 4.1/4.6`).
- **FR-006** Phải có một endpoint health-check xác minh Worker gọi được tới Supabase thành công.

### Interaction (4xx)

- **FR-401** Người dùng đăng nhập bằng Server Action; phiên được Supabase SSR lưu qua cookie.
- **FR-402** Người dùng đăng ký tài khoản mới bằng Server Action.
- **FR-403** Người dùng đăng xuất bằng Server Action; cookie phiên bị xoá.
- **FR-404** Luồng xác nhận email (confirm sign-up) đi qua một Route Handler callback, đổi code lấy phiên. (v1 không có OAuth — xem Non-Scope § 1.)
- **FR-405** Phiên đăng nhập được làm mới tự động trên mọi request thông qua middleware (`proxy.ts`).

### Security (6xx)

- **FR-601** Route Handler làm thay đổi dữ liệu phải kiểm tra Origin/Referer trước khi xử lý.
- **FR-602** Secret key (service-role) của Supabase chỉ được đọc trong file server-only, không bao giờ lọt vào bundle phía client.
- **FR-603** Mọi bảng Supabase mà tính năng chạm tới phải bật Row Level Security trước khi được dùng.
- **FR-604** Lỗi phía server không được trả stack trace hay chi tiết nội bộ về client.

## 5. Business Rules

- RLS phải bật trên mọi bảng Supabase trước khi bảng đó được dùng trong code, không có ngoại lệ. (BR-001)
- Secret key service-role không bao giờ được import vào file đánh dấu "use client" hoặc file sẽ bundle ra trình duyệt. (BR-002)
- Route Handler làm thay đổi dữ liệu phải khớp Origin/Referer với danh sách cho phép trước khi xử lý tiếp. (BR-003)
- Lỗi phía server phải được log đầy đủ nội bộ nhưng chỉ trả về client một thông điệp chung, không lộ stack trace. (BR-004)
- Middleware phải gọi `getClaims()` thay vì `getSession()` để làm mới phiên trên mọi request — `getSession()` đọc cookie chưa xác thực chữ ký. (BR-005)
- Input của Server Action/Route Handler phải được validate bằng một schema zod dùng chung trước khi chạy logic nghiệp vụ. (BR-006)
- Thành phần UI dùng chung đặt tại `components/ui/`; không tạo primitive dùng chung mới trước khi nó lặp lại lần thứ hai. (BR-007)
- Phiên đăng nhập đi theo vòng đời Anonymous → Authenticated → Anonymous (khi đăng xuất), tự làm mới khi còn hiệu lực. (SM-001)

## 6. Screens

N/A — background feature; no user-facing screens.

## 7. User Stories

### US001_DeployToWorkers — Deploy ứng dụng lên Cloudflare Workers bằng một lệnh

**Actor:** Developer
**Goal:** Build và deploy ứng dụng lên Cloudflare Workers chỉ bằng một lệnh duy nhất.
**Business value:** Rút ngắn thời gian phát hành, loại bỏ sai sót do các bước deploy thủ công.

**Acceptance Criteria:**
- [ ] Chạy một lệnh (`npm run cf:deploy`) tạo ra bản build OpenNext và đẩy lên Cloudflare Workers thành công.
- [ ] Lệnh thất bại rõ ràng (exit code khác 0) khi bundle vượt giới hạn kích thước của Worker.

### US002_RLSByDefault — Mọi bảng Supabase mặc định được bảo vệ bằng RLS

**Actor:** Developer
**Goal:** Đảm bảo mọi bảng Supabase mới thêm vào đều bật Row Level Security trước khi dùng.
**Business value:** Ngăn rò rỉ dữ liệu qua publishable key công khai — đây là khoá được gửi thẳng tới trình duyệt.

**Acceptance Criteria:**
- [ ] Có quy ước/checklist review bắt buộc kiểm tra RLS trước khi một bảng được đưa vào sử dụng.
- [ ] Không có bảng nào trong schema `public` thiếu `ENABLE ROW LEVEL SECURITY`.

### US003_SecureHeadersByDefault — Ứng dụng có baseline bảo mật mặc định

**Actor:** Developer
**Goal:** Mọi route và asset tĩnh đều tự động có tập header bảo mật chuẩn mà không cần cấu hình lại cho từng route.
**Business value:** Giảm rủi ro XSS/clickjacking ở mức nền tảng, không phụ thuộc vào việc từng tính năng tự nhớ khai báo.

**Acceptance Criteria:**
- [ ] Mọi route động trả về CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- [ ] Asset tĩnh (qua `public/_headers`) có cùng tập header đó.

### US004_AuthenticateUser — Đăng nhập, đăng ký, đăng xuất và duy trì phiên

**Actor:** End User
**Goal:** Đăng nhập, đăng ký, đăng xuất và giữ phiên làm việc còn hiệu lực khi điều hướng qua lại.
**Business value:** Là nền tảng bắt buộc để xây mọi tính năng cần xác thực sau này.

**Acceptance Criteria:**
- [ ] Đăng nhập thành công tạo phiên được lưu qua cookie do Supabase SSR quản lý.
- [ ] Đăng xuất xoá phiên; truy cập lại yêu cầu đăng nhập lại.
- [ ] Phiên tự làm mới ở mọi request mà không cần người dùng đăng nhập lại giữa chừng.

### US005_VerifyDeploymentHealth — Xác minh kết nối Worker–Supabase sau khi deploy

**Actor:** Release Engineer
**Goal:** Gọi một endpoint duy nhất để biết Worker đã kết nối được tới Supabase hay chưa, ngay sau khi deploy.
**Business value:** Phát hiện lỗi cấu hình (env var, network) ngay lập tức, trước khi người dùng thật gặp phải.

**Acceptance Criteria:**
- [ ] Endpoint trả về trạng thái "ok" khi round-trip tới Supabase thành công.
- [ ] Endpoint trả về trạng thái lỗi (không lộ chi tiết nội bộ) khi không kết nối được Supabase.

### US006_FollowCodeConventions — Tuân theo quy ước tổ chức code và responsive

**Actor:** Developer
**Goal:** Có một bộ quy ước rõ ràng về tổ chức file/thành phần UI và cách viết responsive để áp dụng từ tính năng đầu tiên.
**Business value:** Giữ codebase dễ bảo trì khi đội ngũ và số lượng tính năng tăng lên.

**Acceptance Criteria:**
- [ ] Quy ước `components/ui/` (dùng chung) và `components/<feature>/` (theo tính năng) được ghi lại và áp dụng nhất quán.
- [ ] Quy ước responsive (breakpoint mặc định, touch target ≥44px, `focus-visible`, `motion-safe`/`motion-reduce`) được ghi lại để tính năng sau tái sử dụng.

## 8. Scenarios

### US001_DeployToWorkers — Happy Path

**Given** mã nguồn đã sẵn sàng và biến môi trường Cloudflare đã cấu hình, **When** developer chạy lệnh deploy, **Then** ứng dụng được build và đẩy lên Cloudflare Workers thành công.

### US001_DeployToWorkers — Error: Bundle vượt giới hạn kích thước

**Given** bundle sau build vượt quá giới hạn Worker cho phép, **When** developer chạy lệnh deploy, **Then** lệnh dừng lại với lỗi rõ ràng, không có gì được đẩy lên production.

### US002_RLSByDefault — Happy Path

**Given** một bảng Supabase mới được tạo, **When** developer đưa bảng đó vào review trước khi dùng, **Then** RLS đã được bật và có policy tương ứng trước khi merge.

### US002_RLSByDefault — Error: Thiếu RLS

**Given** một bảng được tạo nhưng chưa bật RLS, **When** review diễn ra, **Then** thay đổi bị chặn lại cho tới khi RLS được bật.

### US003_SecureHeadersByDefault — Happy Path

**Given** một route động được truy cập, **When** trình duyệt nhận response, **Then** response mang đầy đủ header bảo mật chuẩn.

### US003_SecureHeadersByDefault — Error: Thiếu header trên asset tĩnh

**Given** một asset tĩnh được phục vụ trực tiếp bởi Cloudflare, **When** `public/_headers` chưa được cấu hình đúng, **Then** asset đó thiếu header bảo mật — đây là lỗi cần được phát hiện và vá trước khi phát hành.

### US004_AuthenticateUser — Happy Path

**Given** người dùng nhập đúng thông tin đăng nhập, **When** họ submit Server Action đăng nhập, **Then** phiên được tạo và họ được coi là đã đăng nhập ở các request tiếp theo.

### US004_AuthenticateUser — Error: Sai thông tin đăng nhập

**Given** người dùng nhập sai mật khẩu, **When** họ submit Server Action đăng nhập, **Then** hệ thống trả về một thông điệp lỗi chung ("Invalid login credentials"), không tiết lộ email có tồn tại hay không.

### US005_VerifyDeploymentHealth — Happy Path

**Given** Worker đã deploy và biến môi trường Supabase đúng, **When** Release Engineer gọi health-check, **Then** endpoint trả về trạng thái "ok".

### US005_VerifyDeploymentHealth — Error: Supabase không thể truy cập

**Given** biến môi trường sai hoặc Supabase không phản hồi, **When** Release Engineer gọi health-check, **Then** endpoint trả về trạng thái lỗi chung, không lộ chi tiết kết nối nội bộ.

### US006_FollowCodeConventions — Happy Path

**Given** một developer bắt đầu viết tính năng mới, **When** họ cần một thành phần UI dùng chung, **Then** họ tìm thấy quy ước đặt tại `components/ui/` và áp dụng theo đúng chuẩn đã ghi lại.

### US006_FollowCodeConventions — Error: Vi phạm quy ước

**Given** một thành phần dùng chung được tạo mới dù mới dùng một lần, **When** code được review, **Then** việc tạo sớm đó bị gắn cờ vi phạm YAGNI và được yêu cầu gộp lại.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Bundle sau build vượt giới hạn kích thước Worker (3 MiB free / 10 MiB paid, gzip) | Pipeline deploy dừng lại trước khi traffic được chuyển sang bản mới | "Build/deploy thất bại do vượt giới hạn kích thước Worker." (thông điệp dành cho developer, không hiển thị cho end user) |
| Supabase trả lỗi do sai publishable key/env var | Server Action đăng nhập trả về lỗi chung, không lộ chi tiết cấu hình | "Thông tin đăng nhập không hợp lệ." |
| `proxy.ts` không chạy trên một route cần bảo vệ (matcher thiếu route đó) | Phiên không được làm mới trên route đó; người dùng có thể bị coi là đã đăng xuất ở lần truy cập kế tiếp | "Phiên làm việc đã hết hạn, vui lòng đăng nhập lại." |
| Route Handler làm thay đổi dữ liệu bị gọi từ một Origin lạ (nghi vấn CSRF) | Request bị từ chối trước khi chạm vào logic nghiệp vụ | "Yêu cầu không được phép từ nguồn này." |
| Supabase không thể truy cập được từ Worker (lỗi mạng hoặc env var sai) | Health-check trả về trạng thái lỗi, không có truy vấn nghiệp vụ nào được thực hiện | "Dịch vụ tạm thời không khả dụng." |

## 10. Edge Behaviours to Verify

- **FR-001** → Lệnh deploy thất bại rõ ràng (exit code khác 0) khi bundle vượt giới hạn kích thước.
- **FR-002** → Không có file "use client" nào import được factory server/admin của Supabase.
- **FR-003** → Mọi response từ route động mang đủ 5 header bảo mật chuẩn; asset tĩnh cũng vậy qua `public/_headers`.
- **FR-004** → Gửi input sai định dạng tới Server Action/Route Handler trả về lỗi validate trước khi chạm logic nghiệp vụ.
- **FR-005** → Một component dùng chung mới chỉ được thêm vào `components/ui/` khi đã lặp lại ở tính năng thứ hai.
- **FR-006** → Gọi health-check khi Supabase khả dụng trả về "ok"; khi không khả dụng trả về lỗi chung.
- **FR-401** → Đăng nhập đúng thông tin tạo được phiên hợp lệ.
- **FR-402** → Đăng ký tạo được tài khoản mới và (tuỳ cấu hình xác minh email) chuyển đúng trạng thái chờ xác minh.
- **FR-403** → Đăng xuất xoá cookie phiên; truy cập lại các action cần đăng nhập bị từ chối.
- **FR-404** → Callback OAuth/email đổi code hợp lệ lấy được phiên; code không hợp lệ bị từ chối.
- **FR-405** → Một phiên gần hết hạn vẫn còn hiệu lực sau khi đi qua `proxy.ts` ở request tiếp theo.
- **FR-601** → Request thay đổi dữ liệu từ Origin không nằm trong danh sách cho phép bị từ chối.
- **FR-602** → Grep toàn bộ file "use client" không tìm thấy import tới module chứa secret key.
- **FR-603** → Mọi bảng trong schema `public` có dòng `ENABLE ROW LEVEL SECURITY`.
- **FR-604** → Không có response nào (ngoài môi trường dev) chứa `stack` hay `err.message` thô.

## 11. Risks & Known Issues

N/A — none found.

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| Tài khoản Cloudflare + Workers plan | external-service | Là nơi ứng dụng được deploy tới; gói chưa chốt — thiết kế theo giới hạn Free (bundle 3 MiB gzip, không có Rate Limiting Rules nâng cao) làm baseline an toàn, nâng cấp Paid sau nếu cần | FR-001 |
| Dự án Supabase (Auth + Postgres) | external-service | Cung cấp xác thực người dùng và là data-store cho health-check round-trip | FR-002, FR-006 |
| Cấu hình Next.js 16 hiện có (`cacheComponents`, `partialPrefetching`) | config | Pipeline deploy phải tương thích với các flag đã bật sẵn trong `next.config.ts` | FR-001 |

## 13. Configuration

N/A — no user-facing configuration constants for this feature.
