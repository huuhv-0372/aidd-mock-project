# Phase 03 — Track B: zod, Server Actions, serializer, ảnh

**Owner:** implementer (RED-first, unit) · **Priority:** P1 · **Status:** completed (lint 0 · tsc 0 · vitest 501/501 ở final-2; thêm strip metadata JPEG/PNG/WebP sau review và `searchSunners(query, { nameOnly })` ở phase 07, xem Scope drift ở plan.md) · Blocked by: tên/chữ ký RPC của phase 02

## Context
- Mẫu có sẵn: `lib/kudos/load-more-kudos-action.ts` + `tests/unit/load-more-kudos-action.test.ts` (mock Supabase client), `lib/validation/kudos.ts` (dùng `z.guid()` cho id DB, không `z.uuid()`), `lib/supabase/server.ts`, `lib/profiles/get-current-profile.ts`.
- `kudos-filter-href.ts` tách riêng để zod không vào bundle client → làm tương tự: file client chỉ import type.

## Files (sở hữu)
- Tạo: `lib/validation/write-kudo.ts`, `lib/kudos/kudo-content-markdown.ts` (Tiptap JSON → Markdown, kiểu JSON tự khai báo, **không** import `@tiptap/*`), `lib/kudos/kudo-image-file.ts` (MIME + magic bytes + size), `lib/kudos/search-sunners-action.ts`, `lib/kudos/get-hashtag-options-action.ts`, `lib/kudos/create-kudo-action.ts`; unit test tương ứng trong `tests/unit/`.
- Sửa: `next.config.ts` (giới hạn body).

## Hợp đồng
- `searchSunners(query: string): Promise<{ ok: true; items: Sunner[] } | { ok: false }>` — zod trim 1–50; RPC `kudos_search_sunners`.
- `getHashtagOptions(): Promise<{ ok: true; items: {slug,name_vi,name_en}[] } | { ok: false }>` — đọc bảng `hashtags` (đã grant select).
- `createKudo(formData: FormData): Promise<{ ok: true; id: string } | { ok: false; error: 'validation' | 'server'; fields?: FieldErrors }>`:
  1. Parse zod: `recipientId` (`z.guid()`), `title` trim 1–100, `content` Markdown 1–5000 + plain text (qua `kudo-plain-text.ts` có sẵn) không rỗng, `hashtags` 1–5 slug khác nhau, `isAnonymous`, `anonymousName` ≤50, `images` 0–5 `File`.
  2. Ảnh: kiểm magic bytes (jpg `FF D8 FF`, png `89 50 4E 47`, webp `RIFF….WEBP`) + ≤5 MB; tên `{crypto.randomUUID()}.{ext}` (fix round 1: bỏ `{uid}/` để không lộ người gửi ẩn danh); upload bằng server client của người dùng (policy phase 02).
  3. Gọi RPC `create_kudo` với URL public (`getPublicUrl`).
  4. RPC lỗi → `remove()` ảnh vừa upload (best effort, log), trả lỗi. Map `22023` → `validation`; còn lại → `server` (log đầy đủ, không trả message thô).
- Serializer: `bold→**x**`, `italic→_x_`, `strike→~~x~~`, `orderedList→1. …`, `blockquote→> …`, `link→[x](url)` chỉ http/https, `mention→@[label](id)`, `hardBreak`/đoạn → `\n`; escape ký tự Markdown trong text thường. Unit test từng mark + lồng nhau + URL `javascript:` bị bỏ link giữ chữ.
- `next.config.ts`: `experimental.serverActions.bodySizeLimit = "26mb"`; kiểm Next 16 có giới hạn body qua proxy (`proxyClientMaxBodySize`, mặc định 10 MB) → nâng tương ứng. Tra bằng `tkm:search-docs` trước khi sửa.

## Unit test (RED trước)
Schema (biên 0/1/5/6 hashtag, 100/101 danh hiệu, alias khi không ẩn danh), magic bytes (pdf/mp4/txt đổi đuôi .jpg bị từ chối), serializer, `createKudo`: thành công; lỗi validate không gọi Storage; RPC lỗi → `remove` được gọi đúng path; lỗi Storage giữa chừng → xoá ảnh đã lên.

## Success
`npm test` xanh, `npx tsc --noEmit` 0, `npm run lint` 0. Không chạy build/E2E (Track A đang song song).

## Security
Không tin MIME client; sender lấy từ session; không lộ `err.message`; file chỉ do chính người gửi sở hữu (`owner_id`).
