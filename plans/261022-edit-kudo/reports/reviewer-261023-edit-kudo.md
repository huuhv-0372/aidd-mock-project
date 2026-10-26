# Reviewer — Stage 5 pass 1 (strong, 2026-10-23)

Decision: REWORK, score 8. Critical 0, High 0. vitest 918/918, tsc 0 (reviewer run).

## Assessment
The security core holds:
- account rule first, then the sender-only `for update`, with the same not_found for missing and foreign Kudos;
- recipient, anonymous state, created_at and hearts are never written;
- image URLs are accepted only when they are this Kudo's or the caller's own objects;
- the dropped-URL filter excludes images other Kudos still hold;
- grants are authenticated only, `search_path` is empty;
- the action deletes only RPC-returned URLs that it did not just send, as the user;
- upload cleanup is correct; no error text reaches the client;
- create behaviour is unchanged; every KudosFeedList site sits inside KudosComposer.

## Medium (Accept)
**M1** `lib/kudos/kudo-content-editor-json.ts:35`: the LINK label excludes `[`, so a linked mention `[hi @[An](uuid)](url)` does not round-trip.
- It is reachable through Tiptap `linkOnPaste`.
- An unchanged save turns it into escaped literal text and loses the link.
- The fuzz test at `tests/unit/kudo-content-editor-json.test.ts:165` excludes exactly this case.
- Fix: let the label contain mention tokens, `/\[((?:@\[[^[\]]*\]\([0-9a-fA-F-]{36}\)|[^[\]])*)\]\(([^()]*)\)/y`, and parse it with `parseInline`; drop the fuzz exclusion; add a serializer case.

## Low
- **L2 (Accept)** `update-kudo-action.ts:66`: `keepImages` and the removed URLs are not pinned to the Supabase origin. Only the caller's own data is affected.
- **L3 (Defer)** Literal U+E000–E008 characters change on save.
- **L4 (Defer)** `use-write-kudo-form.ts:116`: a refused stale kept image shows the "invalid file format" text.
- **L5 (Defer)** Last-write-wins between tabs.
- **L6 (Defer)** `kudos-feed-list.tsx:102`: the `savedKudos` overlay never expires.
- **L7 (Defer)** `kudo_images.image_url` has no index.
- **L8 (Defer)** The counter is not in the editor's `aria-describedby`.
- **L9 (Defer)** The converter is imported eagerly in the provider instead of the lazy dialog chunk.
- **L10 (Defer)** The fake `update_kudo` lacks the other-Kudo filter and answers forbidden as 42501.

## Unproven
- Real SQL (verify P1, U0–U9).
- Lock behaviour.
- E2E GREEN (tester running).
