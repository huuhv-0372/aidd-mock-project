# Implementer — polish round 1 (strong, 2026-10-23)

Status: DONE_WITH_CONCERNS. tsc 0, eslint 0, vitest 922/922 (+4; RED seen first: 5 failed of 70).

## Fixes
1. **CRLF:** the shared content schema normalizes `\r\n?` to `\n` before trim/max, for create and update. The converter splits lines on `\r\n?|\n`.
2. **M1:** the LINK label allows strict mention tokens and is parsed with `parseInline`. The fuzz exclusion is removed; linked-mention round-trip cases are added; 4 pathological inputs stay under 500 ms.
3. **L2:** `isOnSupabaseOrigin` is exported from `lib/validation/kudos.ts`, and the read side reuses it. Off-origin `keepImages` are refused before any upload or RPC; off-origin removed URLs are never deleted.
4. **L4:** in edit mode, `images: invalid` shows `copy.errors.invalid`.
5. **L9:** the converter is imported only by `use-write-kudo-form` (dialog chunk); the `deserializeContent` prop is removed.
6. **Empty hashtags:** an empty list marks the field touched (Write + Edit).
7. **Visual:**
   - the edit heading stays 32px at 1440×900 (the `short:` override is removed);
   - the alias label is inline from sm up, stacked below sm, with no asterisk, named via `<label htmlFor>`.

## Deviations
- `lib/validation/kudos.ts` touched (shared origin helper).
- The alias placeholder is removed.
- The alias input is wider than 427px (shorter label).
- Two unit files are over 200 lines (212, 224).

## Concerns (both pre-existing, deferred)
- The View Kudo reader does not render linked mentions as links (shown as text).
- `hasOnlySafeLinks` does not inspect a link whose label holds a mention. Nothing renders such a link today, so there is no XSS path; tightening it is a follow-up.
