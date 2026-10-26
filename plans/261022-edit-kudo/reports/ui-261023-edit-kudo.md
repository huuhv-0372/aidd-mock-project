# UI — Phase 02a edit mode (momorph-ui-implementer, 2026-10-23)

Status: DONE_WITH_CONCERNS. tsc had only the 2 expected errors (02b modules missing), eslint 0, vitest 826/826. E2E is not run in this phase.

## Files
- Modified:
  - `components/kudos-compose/use-write-kudo-form.ts` (131), `write-kudo-form.tsx` (133), `write-kudo-dialog.tsx` (71)
  - `kudos-composer-provider.tsx` (135), `kudo-rich-editor.tsx` (157), `recipient-picker.tsx` (195)
  - `anonymous-toggle.tsx` (58), `use-image-attachments.ts` (62), `compose-icons.tsx` (SaveIcon), `write-kudo-copy.ts`
  - `components/kudos/kudo-post-card.tsx`, `kudos-feed-list.tsx`, `messages/{vi,en}/kudos-compose.ts`
- New: `components/kudos-compose/kudo-form-data.ts` (36), `to-editable-kudo.ts` (16), `components/kudos/edit-kudo-button.tsx` (24)

## Behaviour
- **Edit mode:** the dialog, form and hook take `initialKudo` + `deserializeContent` + `onSaved`.
- **Pre-fill:** the editor content uses `initialContent`, and `onCreate` primes the counter and the has-text flag.
- **Recipient:** `RecipientPicker locked` makes the field `readOnly` and hides the chevron.
- **Anonymous:** `AnonymousToggle locked` disables the checkbox; the alias stays editable.
- **Images:** entries are `{ id, file: File | null, url }`, stored URLs first.
- **Submit:** `buildUpdateKudoData` builds the contract FormData; save failures show the generic line in `error-form`.
- **Counter:** `content-counter` "N/5.000" (EN "N/5,000") counts Markdown code points; `contentTooLong` now uses the same count.
- **Provider:**
  - `openEditor`, `savedKudos` map and `editLabel` in context;
  - `onSaved` stores the row, closes the dialog and calls `router.refresh()`.
- **Pencil:** `EditKudoButton` is 44×44 with `-m-1.5` and keeps `data-testid="kudo-edit-icon"`.
- **Feed list:** `KudosFeedList` renders `savedKudos.get(id) ?? kudo`, so it now requires the provider.

## Deviations
- The mention hint is left-aligned in Write too, so the counter fits.
- The alias label is kept as today (aria-label/placeholder "Tên ẩn danh"), not an inline "Nickname ẩn danh*" label.
- The counter uses 5.000, not the 1.000 in the screenshot (owner decision).

## Measured (752×1076 screenshot)
Heading 32px; recipient 56px; toolbar buttons 56×40; editor 200px; chips 40px; thumbnails 80px; alias 56px; Hủy 146px wide; buttons 60px. All match the existing Write styles.
