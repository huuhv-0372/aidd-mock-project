# Phase 03 — Track B: zod + Server Action

**Owner:** implementer · **Priority:** P1 · **Status:** completed (unit xanh, tsc 0, lint 0; 559 unit toàn repo) · **Effort:** 0.5h · RED-first (unit)

## Context
- Mẫu: `lib/kudos/load-more-kudos-action.ts`, `lib/kudos/create-kudo-action.ts` (map mã 22023), `tests/unit/load-more-kudos-action.test.ts`.
- Phụ thuộc phase 02 (tên + chữ ký RPC).

## Files (sở hữu)
- Sửa: `lib/validation/kudos.ts` (thêm `setKudoHeartInputSchema = z.object({ kudoId: z.guid(), liked: z.boolean() }).strict()`; dùng `z.guid()` như fixture không phải UUID v4).
- Tạo: `lib/kudos/set-kudo-heart-action.ts`, `tests/unit/set-kudo-heart-action.test.ts`.

## Hợp đồng
```ts
"use server";
export type SetKudoHeartResult = { ok: true; liked: boolean; heartCount: number } | { ok: false; error: "own" | "generic" };
export async function setKudoHeart(input: unknown): Promise<SetKudoHeartResult>
// zod fail → generic (log) · rpc("set_kudo_heart", {p_kudo_id, p_liked})
// 22023 own_kudo → "own"; mọi lỗi khác / data rỗng → "generic" (console.error đầy đủ, không trả message thô)
```

## Unit (viết trước)
Input sai (thiếu field, id không phải guid, field thừa) không gọi RPC; ánh xạ `own_kudo`/`forbidden`/`not_found`/lỗi mạng; thành công trả số từ DB (không từ client).

## Success
`npx vitest run tests/unit/set-kudo-heart-action.test.ts` xanh, `tsc` 0, lint 0.
