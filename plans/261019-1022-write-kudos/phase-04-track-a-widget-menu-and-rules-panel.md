# Phase 04 — Track A: Widget menu + panel Thể lệ

**Owner:** momorph-ui-implementer · **Status:** completed, đã merge trong `ba028d0` (issue #9); còn mở, không chặn: (E2E `kudos-quick-actions` xanh trong full 183/183; review SEALED 9. Xong khi controller so ảnh `reports/visual/` (menu, Thể lệ) với frame `Sv7DFwBw1h`, `b1Filzi9i6` và ghi lệch/xác nhận vào `reports/visual-check.md` — fidelity audit chỉ phủ `ihQ26W78P2`, hai frame này chưa so, chỉ copy VI được đối chiếu) · **test_policy: e2e-red-first**

## MoMorph refs
- Widget (đóng): https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/_hphd32jN2
- Menu nhanh (mở): https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/Sv7DFwBw1h
- Thể lệ UPDATE: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/b1Filzi9i6
- Clarifications: plans/261019-1022-write-kudos/clarifications.md
- testPolicy: e2e-red-first (RED: `reports/e2e-red-evidence.md`, spec `tests/e2e/kudos-quick-actions.spec.ts`, chỉ đọc)

## Goal
Widget mở menu "Thể lệ / Viết KUDOS / ✕" và panel Thể lệ (drawer phải, `<dialog>`), đúng Figma, mobile-first.

## Files (sở hữu)
- Sửa tại chỗ: `components/site-shell/widget-button.tsx` (thành menu client; giữ `data-testid="widget-button"`).
- Tạo: `components/kudos-compose/kudos-rules-dialog.tsx` (client, vỏ dialog + footer Đóng/Viết KUDOS), `components/kudos-compose/kudos-rules-content.tsx` (server, nội dung), `public/images/kudos/rules/*` (6 icon — controller export qua Figma `download_assets`, đưa đường dẫn vào prompt).
- Tái dùng: `use-dismissable.ts`, `/images/kudos/hero-*.png`, `shell-icons.tsx` (IconPen).

## Integration contract (phase 06 nối)
- `WidgetButton` nhận `onWriteKudo?: () => void`, `onOpenRules: () => void`, `writeKudoHref?: string` (khách → link `/login`).
- `KudosRulesDialog` nhận `open`, `onClose`, `onWriteKudo`, `children` (nội dung server), `copy`.

## Out of scope
Context provider, wiring vào page, i18n EN, modal Viết Kudo, build/E2E (chỉ tsc + lint).

Use Figma design content as mock data source. Do NOT invent data.
