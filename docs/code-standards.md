# Code Standards (Constitution)

Bộ nguyên tắc nền tảng cho toàn bộ codebase. Mọi thay đổi code phải tuân theo các mục dưới
đây; khi có xung đột với một rule cục bộ khác, ưu tiên nguyên tắc an toàn/bảo mật trước.

## 1. Nguyên tắc chung

- **YAGNI – KISS – DRY**: không build cho nhu cầu giả định, chọn giải pháp đơn giản nhất
  giải quyết đúng yêu cầu, không lặp lại logic.
- Giữ mỗi file dưới ~200 dòng; tách module/component khi vượt ngưỡng.
- Đặt tên file kebab-case, tên nói rõ mục đích (`user-profile-card.tsx`, không
  `card2.tsx`).
- Không tạo bản sao "enhanced"/"v2" của file đang có — sửa trực tiếp file gốc.
- Viết code tự giải thích qua tên biến/hàm; comment chỉ khi lý do (WHY) không hiển nhiên.

## 2. Next.js (App Router)

- Ưu tiên **Server Components** mặc định; chỉ gắn `"use client"` cho phần thực sự cần
  tương tác (state, event handler, browser API).
- Đặt route theo cấu trúc `app/` chuẩn: `page.tsx`, `layout.tsx`, `loading.tsx`,
  `error.tsx`, `not-found.tsx` cho từng segment khi cần UX đầy đủ.
- Data fetching trong Server Component/Route Handler, không fetch client-side cho dữ liệu
  có thể lấy ở server trừ khi cần realtime/tương tác liên tục.
- Dùng `next/image` cho mọi ảnh, `next/font` cho font — tránh `<img>` thô và CSS `@import`
  font ngoài.
- Route Handlers (`app/**/route.ts`) chỉ xử lý một trách nhiệm; validate input trước khi
  dùng, trả lỗi với status code đúng ngữ nghĩa.
- Metadata khai báo qua `generateMetadata`/`metadata` export, không chèn thẻ `<head>` thủ công.
- Next.js 16 đổi tên `middleware.ts` thành **`proxy.ts`** (cùng thư mục gốc project, cạnh
  `app/`) — chức năng giữ nguyên, chỉ đổi tên file/convention. Dùng `proxy.ts`, không tạo lại
  `middleware.ts`.
- Biến môi trường tiền tố **`NEXT_PUBLIC_`** sẽ bị inline vào bundle client — chỉ dùng cho giá
  trị không nhạy cảm (ví dụ mốc thời gian, feature flag hiển thị công khai). Secret/API key/
  credential luôn để không tiền tố, chỉ đọc ở server (xem mục 6 — Secrets management).

## 3. Cloudflare Workers (khi triển khai lên Cloudflare)

- Tuân thủ runtime Edge: không dùng Node API không được hỗ trợ (`fs`, `net`, ...); kiểm tra
  tương thích trước khi thêm dependency.
- Giữ cold-start nhỏ: tránh bundle thư viện nặng không cần thiết, lazy-load phần ít dùng.
- Secrets/API keys qua Wrangler secrets hoặc biến môi trường binding — không hardcode, không
  commit `.dev.vars`/`wrangler.toml` chứa secret thật.
- Mỗi Worker/route xử lý timeout và lỗi upstream rõ ràng (try/catch quanh fetch ra ngoài,
  trả lỗi có cấu trúc, không để exception rò rỉ stack trace ra client).
- Dùng KV/D1/R2 đúng mục đích: KV cho cache/key-value đơn giản, D1 cho dữ liệu quan hệ nhỏ,
  R2 cho object storage — không dùng nhầm lớp lưu trữ.

## 4. Supabase

- Truy cập dữ liệu nhạy cảm qua **Row Level Security (RLS)** bật trên mọi bảng chứa dữ liệu
  người dùng; không tắt RLS để "cho tiện" trong lúc dev rồi quên bật lại.
- Phân biệt rõ `service_role` key (chỉ dùng ở server, không bao giờ lộ ra client/bundle) và
  `anon` key (dùng ở client, giới hạn quyền qua policy).
- Viết migration cho mọi thay đổi schema, không sửa trực tiếp qua dashboard ở production mà
  không có migration tương ứng trong repo.
- Validate và sanitize input trước khi đưa vào query; ưu tiên dùng Supabase client/query
  builder thay vì raw SQL string nối tay để tránh SQL injection.
- Xử lý lỗi Supabase client (`{ data, error }`) tường minh ở mọi call — không bỏ qua `error`.

## 5. Responsive Design

- Thiết kế **mobile-first**: viết style cho mobile trước, mở rộng dần qua breakpoint
  (Tailwind: `sm`, `md`, `lg`, `xl`, `2xl`).
- Layout chính dùng Flexbox/Grid responsive, tránh width/height cố định bằng px cho khối
  nội dung chính.
- Test tối thiểu 3 kích thước: mobile (~375px), tablet (~768px), desktop (~1280px+) trước
  khi coi một UI task là hoàn thành.
- Ảnh/media responsive (`next/image` với `sizes` phù hợp), không để tràn ngang trên màn hình
  nhỏ.
- Vùng chạm (tap target) tối thiểu 44x44px trên mobile; đảm bảo contrast và focus state rõ
  ràng cho accessibility.

## 6. Bảo mật — OWASP Secure Coding

Áp dụng tối thiểu các điểm sau (tham chiếu OWASP Top 10):

- **Injection**: không nối chuỗi SQL/query từ input người dùng; dùng parameterized
  query/ORM/query builder.
- **Broken Access Control**: mọi Route Handler/Server Action xử lý dữ liệu riêng tư phải
  kiểm tra authentication + authorization (không chỉ check đăng nhập, mà check đúng quyền
  trên đúng resource).
- **Cryptographic Failures**: không lưu password dạng plaintext; dùng hashing chuẩn
  (bcrypt/argon2) qua thư viện có sẵn, không tự chế thuật toán.
- **Secrets management**: không commit `.env*`, API key, credential vào git; dùng biến môi
  trường/secret manager của platform triển khai.
- **XSS**: không dùng `dangerouslySetInnerHTML` với dữ liệu chưa sanitize; để React tự escape
  output mặc định.
- **CSRF/SSRF**: validate và allowlist mọi URL được fetch từ input động; Route Handler nhận
  state-changing request nên kiểm tra origin/method phù hợp.
- **Security Misconfiguration**: không bật debug/verbose error ra production response; set
  security headers cơ bản (CSP, X-Frame-Options, v.v.) ở tầng Next.js config/`proxy.ts` khi
  phù hợp.
- **Vulnerable Dependencies**: theo dõi advisory của dependency chính (Next.js, React,
  Supabase client) và cập nhật khi có bản vá bảo mật.
- Luôn wrap các path rủi ro (I/O, network call, parse input ngoài) trong try/catch và log
  lỗi có kiểm soát, không để lộ chi tiết nội bộ ra response.

## 7. Kiểm thử & review

- Lint và typecheck phải sạch trước khi commit (`npm run lint`, `tsc --noEmit`).
- Test tối thiểu surface bị thay đổi (xem `development-rules.md` → Scope Contract); phần
  liên quan auth/permission/thanh toán/migration luôn test đầy đủ.
- Mọi thay đổi đáng kể đi qua review trước khi merge — ưu tiên review đúng, không review cho
  có.

## 8. Ghi chú về nguồn tài liệu

Project hiện dùng Next.js 16.3.8 / React 19.2.8 / Tailwind 4 / TypeScript 5 (xem
`package.json`). Khi cần tra API cụ thể, ưu tiên tài liệu chính thức của Next.js/React/
Supabase/Cloudflare (hoặc skill tra cứu docs nội bộ của project) thay vì nội dung không rõ
nguồn gốc nằm trong `node_modules`.
