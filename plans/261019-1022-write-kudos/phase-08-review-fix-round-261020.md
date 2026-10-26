# Phase 08 — Sửa theo review 2026-10-20 (A1–A14)

**Owner:** implementer L (lib + unit) ‖ implementer U (UI + E2E) → tester → reviewer · **Priority:** P1 · **Status:** completed (2026-10-20) — mọi "Xong khi" đã ✔; evidence gate hard exit 0, riskGate ký bởi hoang.van.huu
Safety-critical (validation trước auth, xoá ảnh sau RPC, hook dùng chung) → unit + E2E toàn bộ, review strong.
Nguồn: [reports/review-code-261020-commits-f7f7266-to-223a6dc.md](reports/review-code-261020-commits-f7f7266-to-223a6dc.md).

## Quyết định đã chốt (controller)

- **A1 ReDoS**: `content` trong `writeKudoSchema` kiểm độ dài với `{ abort: true }` trước mọi refine. Áp tương tự cho mọi field có refine đắt. Regex trong `kudoPlainText` phải chạy tuyến tính: lớp ký tự bên trong loại trừ chính delimiter (`[^\[\]]`, `[^*]`, `[^_]`…), để mỗi lần quét dừng ở delimiter kế tiếp. Không cắt nội dung card (SQL đã giới hạn 5000). Unit test: mỗi input đối kháng 5000 ký tự xử lý < 50 ms, và 20.000 ký tự qua schema < 50 ms.
- **A3 hardBreak**: serializer đóng mọi delimiter đang mở trước `\n` và mở lại sau đó, áp cho bold/italic/strike/link.
- **A4 cleanup**: chỉ xoá ảnh khi DB đã trả lời là từ chối, tức `error.code` không rỗng: transaction đã rollback. Lỗi không có code (mạng) và exception sau khi đã gửi RPC thì **giữ** ảnh (Kudo có thể đã ghi; orphan để sau). Exception trước khi gửi RPC (ví dụ `getPublicUrl` ném lỗi) thì xoá.
- **A14**: `Object.hasOwn` cho `RPC_FIELD_BY_CODE`.
- **A5 Esc**: `useDismissable` gọi `event.preventDefault()` ở nhánh Escape, để dialog cha không nhận `cancel`.
- **A6 hashtag lỗi tải**: `.catch` ở `getHashtagOptions`. Lỗi (reject hoặc `{ok:false}`) thì dropdown hiện một dòng `role="alert"` kèm nút "Thử lại" để tải lại. Không cache.
- **A7 nội dung > 5000**: form đo độ dài Markdown đã serialize ở mỗi lần editor cập nhật; vượt `KUDO_CONTENT_MAX` thì hiện lỗi ở ô nội dung và khoá Gửi. Lỗi `fields` từ server map vào ô tương ứng; không có ô thì giữ `sendFailed`.
- **Copy mới (VI/EN)**: nội dung quá dài, không tải được hashtag, Thử lại. EN tự dịch, ghi vào `reports/en-localizations.md`.
- **A8**: fake đưa người gọi (`id = sub`, "E2E User") vào miền tìm và loại `id === sub` như SQL `:92, :103`. Bằng chứng thật vẫn là SQL verify.
- **A2**: test blur không được phụ thuộc thời gian click so với debounce (dùng `page.clock` hoặc giữ RPC lại). Chạy `--repeat-each=10` phải xanh.
- **Không làm** (Defer, xem báo cáo review): sửa lỗ hổng validator link, giới hạn body 26 MB, rate limit, quota upload, dọn orphan, ARIA của `@`, idempotency, tách spec 775 dòng.

## Sở hữu file

- L: `lib/kudos/kudo-plain-text.ts`, `lib/validation/write-kudo.ts`, `lib/kudos/kudo-content-markdown.ts`, `lib/kudos/create-kudo-action.ts`, `tests/unit/**`.
- U: `components/site-shell/use-dismissable.ts`, `components/kudos-compose/**`, `messages/{vi,en}/kudos-compose.ts`, `tests/e2e/**`, `plans/261019-1022-write-kudos/reports/en-localizations.md`.
- Không agent nào chạy `next build`/Playwright khi L chưa xong; U viết E2E trước (RED) rồi chờ.

## Xong khi

Lint 0 · tsc 0 · unit xanh (có test mới cho A1, A3, A4, A10–A12, A14) · E2E toàn bộ xanh · `write-kudo.spec.ts --repeat-each=5` xanh · OpenNext build exit 0 · review strong SEALED · evidence gate hard exit 0.

## Kết quả (2026-10-20, code đóng băng 12:42–13:12 ICT)

| Tiêu chí "Xong khi" | Kết quả |
|---|---|
| Lint 0 · tsc 0 | 0 · 0 ✔ |
| Unit xanh (gồm test mới cho A1, A3, A4, A10–A12, A14) | vitest 39 file / 538 ✔ (trước đó 37 / 501) |
| E2E toàn bộ xanh | `npm run test:e2e` 195/195, 6.8m, 0 flaky ✔ |
| `write-kudo.spec.ts --repeat-each=5` xanh | write-kudo + write-kudo-resilience 425/425, 0 flaky ✔ |
| OpenNext build exit 0 | ✔ |
| Review strong SEALED | Lượt 2: SEALED 9, criticalCount 0, không Accept mở ✔ |
| Evidence gate hard exit 0 | ✔ "SEALED (hard) — evidence verified", exit 0; riskGate `humanSignedOff: true` |

- A1–A14: đã xử lý hết theo "Quyết định đã chốt" ở trên.
- Vòng sửa 1 (4 Low): Esc bị popup ngoài modal nuốt (hồi quy từ A5); copy `errors.invalid` khi server từ chối field; serializer `trimEnd`; hashtag retry có focus và chặn kết quả cũ.
- Vòng sửa 1, mục #5 (test slice-mutant): **Rejected**, vì cần export chỉ để test.
- Vòng sửa 2: Esc theo dialog `modal` trên cùng; `wrap()` cắt tuyến tính.
- Defer: giữ như báo cáo review, bổ sung các mục mới vào `plan.md` → "Deferred".
- Chi phí vòng sửa: 3 vòng implementer, 3 lượt review. Chi tiết trong `plan.md` → "Scope drift".
