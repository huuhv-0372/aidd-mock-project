# Phase 05 — Track A: modal Viết Kudo

**Owner:** momorph-ui-implementer · **Status:** completed, đã merge trong `ba028d0` (issue #9); còn mở, không chặn: (E2E `write-kudo` 73/73 xanh, full 183/183; `ihQ26W78P2` đã audit: 17 giá trị sửa, `reports/figma-fidelity-viet-kudo.md`. Xong khi so thêm Figma `OyDLDuSGEa` (Add link) và `p9zO-c4a4x` (chiều cao/hướng dropdown), đo lại 3 frame không có ảnh `5c7PkAibyD`, `p9vFVBE_tc`, `QIMJNgFb8K` (danh sách đoán ở `reports/track-a-copy-phase-05.md`), đo lại x ô Danh hiệu sau `min-w-[142px]`) · **test_policy: e2e-red-first**

## MoMorph refs
- Viết Kudo: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2 (lỗi: `5c7PkAibyD`, ẩn danh: `p9vFVBE_tc`, dropdown người nhận: `QIMJNgFb8K` — 3 frame này không có ảnh MoMorph, controller lấy qua Figma MCP)
- Add link: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/OyDLDuSGEa
- Dropdown hashtag: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/p9zO-c4a4x
- Clarifications: plans/261019-1022-write-kudos/clarifications.md
- testPolicy: e2e-red-first (RED: `reports/e2e-red-evidence.md`, spec `tests/e2e/write-kudo.spec.ts`, chỉ đọc)

## Goal
Modal đúng Figma: Người nhận (autocomplete), Danh hiệu, editor (B/I/S/1./link/quote + "Tiêu chuẩn cộng đồng" + `@`), Hashtag (chip + dropdown, tối đa 5), Image (thumbnail + ✕, tối đa 5), Ẩn danh (checkbox + ô biệt danh), Hủy/Gửi (disable tới khi đủ, loading). Lỗi từng ô khi rời ô.

## Files (sở hữu)
- Tạo trong `components/kudos-compose/`: `write-kudo-dialog.tsx` (state form + submit), `recipient-picker.tsx`, `kudo-title-field.tsx`, `kudo-rich-editor.tsx` (Tiptap), `kudo-editor-toolbar.tsx`, `add-link-dialog.tsx`, `mention-suggestion-list.tsx`, `hashtag-picker.tsx`, `image-picker.tsx`, `anonymous-toggle.tsx`. Mỗi file < 200 dòng.
- Sửa: `package.json`/lockfile — thêm Tiptap v3 (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-mention`, `@tiptap/extensions`); tra phiên bản hợp React 19.3 bằng `tkm:search-docs`.

## Integration contract (phase 06 nối)
`WriteKudoDialog` props: `open`, `onClose`, `onSent(id)`, `copy`, `locale`, và các action từ phase 03 truyền vào: `searchSunners`, `getHashtagOptions`, `createKudo` (import type thôi, không import zod). Editor xuất Tiptap JSON → gọi `kudo-content-markdown.ts` khi submit.

## Out of scope
Provider/wiring, i18n EN, logic server, build/E2E (chỉ tsc + lint). Ảnh preview dùng `URL.createObjectURL` + revoke khi xoá/đóng.

Use Figma design content as mock data source. Do NOT invent data.
