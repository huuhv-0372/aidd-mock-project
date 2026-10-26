# Tester — Phase 03 GREEN round 1 (2026-10-23)

NOT GREEN: edit-kudo 16/18; full E2E 315/317 (both failures in edit-kudo); vitest 918/918; lint 0.

## Failures (real defects)
1. **CRLF:** browser multipart turns LF into CRLF in `content`; nothing normalizes it. The no-change save is not byte-identical. The create path is affected too.
2. **Empty hashtags:** removing every chip shows no required line.

## Test fixes
In `edit-kudo.spec.ts`; no assertion weakened:
- the EN title label `/Title/`;
- `toHaveCount` waits before reading chips and thumbnails (1/3 race).

## Visual (1440, compared with the owner's PNG)
- Heading: 24px against 32px in the screenshot (MISMATCH).
- Toolbar: carries the "Tiêu chuẩn cộng đồng" link, which the screenshot does not have.
- Editor: 672 wide against 668.
- Chips: 40px against 48px.
- Alias row: full width with no inline label, against an inline label and a 427px input.
- Match: recipient 56px; toolbar 56×40; thumbnails 80; add buttons; checkbox; Hủy 146×60; Lưu 502×60.
- 375: no overflow.
- Captures: `reports/visual/edit-1440-public.png`, `edit-1440-anon-alias.png`, `edit-375-*.png`, `write-1440.png` (+ measure JSON).

## Note
The build stops once on the Next 16.4.0 security notice (`next upgrade` nudge), then passes on retry. The upgrade is the owner's call.
