# Implementer — Phase 02b data (strong, 2026-10-23)

Status: DONE_WITH_CONCERNS. vitest 54 files 918/918 (+92); tsc 0; eslint 0. Mutation checks: every deliberate break was caught by a test.

## Files
- New:
  - migration `20261023100000_create_update_kudo_rpc.sql` (144); rollback (11); verify (303)
  - `lib/kudos/update-kudo-action.ts` (141), `kudo-content-editor-json.ts` (177), `upload-kudo-images.ts` (62)
  - unit tests: editor-json (197), update action (221), update validation (93)
- Modified: `create-kudo-action.ts` (159 → 109, refactor only), `lib/validation/write-kudo.ts` (119 → 154)

## update_kudo
- Check order: account rule → `for update` on the sender's row (`not_found` for both missing and someone else's) → title, content and hashtag checks as create.
- Images: an existing image of this Kudo, or an object the caller owns.
- Alias: allowed only on an anonymous Kudo.
- Writes title, content and alias; replaces hashtags and images.
- Returns the dropped URLs, filtered to those no other Kudo still uses.

## Verify file
P1 (metadata, grants, order) and U0–U9: update OK, immutables unchanged, replace, limits, alias rules, not_found before field checks, 25 invalid codes, forbidden, anon 42501. Every write is rolled back.

## Action
- Session → zod → inspect and upload → RPC with kept URLs then new ones.
- Coded RPC error: delete the new uploads, then map to not_found / validation / server.
- Success: delete dropped images best-effort, read back with `getKudoDetail` (kudo_detail + kudoRowSchema).

## Converter
- Exact inverse of the serializer: round-trip over the serializer cases, the E2E seed and 500 fuzz docs; every result checked against the real Tiptap schema; never throws.
- A bare `N.` at the end of a block opens as an empty list item; saving it unchanged writes the same Markdown.

## Notes
- A dedicated parser, because `parseKudoContent` drops mention ids, blank lines and leading spaces.
- `fieldOfRpcError` and `KUDO_IMAGE_URL` are shared from `write-kudo.ts`.
- A malformed kudoId returns `validation`.
- Read-back failure returns `server`.
- SQL not run (owner).
