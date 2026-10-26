# Phase 03 — Track A: từ điển + nối component + dropdown

**Context:** [plan.md](plan.md) · dropdown spec `plans/momorph-specs/dropdown-ngon-ngu-hUyaaugye2/specs.csv` ·
MoMorph fileKey `9ypp4enmFmdK3YAFJLIu6C`, screenId `hUyaaugye2` · `components/ui/language-selector.tsx`.

## Overview
Priority P2 · Status completed · 1.25h · Owner momorph-ui-implementer. Sở hữu: `messages/**`, `components/**`.
Chờ hợp đồng `lib/i18n/locales.ts` + `getDictionary` từ phase-02 bước 1.

## Key Insights
- Chuỗi đã gom sẵn ở 5 file copy/data (~200 dòng); còn ~30 chuỗi inline (aria-label, alt, nhãn countdown,
  metadata, `LOGIN_ERROR_MESSAGE`).
- EN lấy bằng `list_file_localizations(fileKey, sourceTexts[])` theo lô; chuỗi không có trong Figma
  (aria-label, thông báo lỗi) mới tự dịch, đánh dấu comment `/* not from Figma */`.
- Tên riêng giữ nguyên ở cả 2 bản: "Sun* Kudos", "Top Talent", "Root Further", "SAA 2025".

## Related Code Files
- Tạo: `messages/vi/{shell,home,awards,login,common}.ts`, `messages/en/` cùng tên (`satisfies` kiểu vi).
- Xoá: `components/site-shell/shell-copy.ts`, `components/home/home-copy.ts`, `components/home/root-further-copy.ts`.
- Sửa (giữ cấu trúc slug/ảnh, chỉ rút text): `components/home/award-cards-data.ts`, `components/awards/award-sections-data.ts`.
- Sửa nhận `dict`/chuỗi qua prop: site-shell (header, footer, kudos-section, account-menu, notification-button,
  widget-button, login-link, sign-out-button), home (hero, hero-event-info, hero-cta-links, root-further-content,
  awards-section, award-card), awards (nav, content, title, section), login (header, hero, footer,
  google-login-form, error-banner), countdown (screen, timer, unit); `lib/auth/constants.ts`.
- `components/ui/language-selector.tsx`: nhận `locale` hiện tại; option có cờ (VN, UK) + mã theo spec A.1/A.2;
  chọn → `startTransition(setLocale(code))` rồi `router.refresh()`; nút hiển thị cờ + mã theo locale.

## Implementation Steps
1. Gọi MoMorph localizations theo lô cho toàn bộ chuỗi VI; lưu bảng VI→EN vào `reports/en-localizations.md`.
2. Viết `messages/vi/*` (chuyển nguyên văn từ file cũ) rồi `messages/en/*`; mỗi file < 200 dòng.
3. Nối component: Server Component nhận slice từ điển qua prop; Client Component nhận chuỗi đã chọn sẵn.
4. Sửa dropdown: thêm cờ UK (lấy SVG từ Figma node `I525:11713;362:6128`), giữ toàn bộ keyboard/a11y hiện có.
5. `npx tsc --noEmit` + `npm run lint`.

## Todo
- [x] bảng EN từ MoMorph (`reports/en-localizations.md`) · [x] file messages (9 mỗi locale, lệch kế hoạch 5 — xem plan.md Scope drift) · [x] nối ~40 component (kế hoạch ~25) · [x] dropdown cờ VN/UK + setLocale · [x] tsc/lint

## Success Criteria
Không còn chuỗi hiển thị viết cứng trong `components/**` (grep ký tự tiếng Việt chỉ còn trong `messages/vi`);
giao diện VI y hệt trước (không lệch pixel); EN không có key thiếu.

## Risks
Câu EN dài hơn → tràn dòng nav/nút ở mobile; kiểm tra 375px ở phase-04.

## Security
Không render HTML từ từ điển (`dangerouslySetInnerHTML` cấm); xuống dòng dùng `\n` + `whitespace-pre-line` như hiện tại.
