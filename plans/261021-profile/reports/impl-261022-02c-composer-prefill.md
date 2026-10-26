## Task: 02c — composer recipient prefill
**Status**: completed

### Files Touched
- components/kudos-compose/normalize-composer-options.ts (new, 14 lines): pure `getInitialRecipient(options: unknown)`
- tests/unit/normalize-composer-options.test.ts (new): valid, plus 7 rejected shapes
- kudos-composer-provider.tsx: `openComposer(options?)`, `initialRecipient` state reset on every open, rules dialog wrapped `() => openComposer()`
- write-kudo-dialog.tsx, write-kudo-form.tsx: pass `initialRecipient` down
- use-write-kudo-form.ts: recipient state initialised from it
- recipient-picker.tsx: `initialText` seeds the input; no search/list on mount (search only runs from onInput)
- kudos/kudos-compose-trigger.tsx: `onClick={() => openComposer()}`

### Checks
- Typecheck: clean. Unit tests: 786 passing (plus the new file's 8). Build/E2E not run (controller).

### Acceptance Criteria
- [x] No-arg open unchanged and starts empty: state is set to null on every open; form is mounted only while open.
- [x] Runtime guard: only an object with string recipient.id/name is accepted (click events etc. -> null).
- [x] Prefilled: input value = name; recipient set so no error and canSend depends only on title/content/hashtag; clearing/typing calls onChange(null) as before.
- [x] Submit uses recipient.id as recipientId (unchanged path).
- [x] Guest redirect untouched.
Note: composer-widget.tsx / widget-button.tsx left as is (out of scope); the runtime guard covers any event passed.
