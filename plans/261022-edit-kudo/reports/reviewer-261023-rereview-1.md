# Re-review — fix round 1 (balanced, 2026-10-23)

Decision: SEALED, score 9. vitest 922/922 and tsc 0 re-run by the reviewer.

## Findings addressed
- **M1:** LINK label parses mention tokens (`kudo-content-editor-json.ts:37`, `:71`); test at `:127`; fuzz includes link-marked mentions; linear time checked.
- **L2:** origin pin at `update-kudo-action.ts:101` and `:68`; helper at `kudos.ts:58`; read side unchanged.
- **L4:** `use-write-kudo-form.ts:125-126`.
- **L9:** converter imported only in the dialog chunk.

## Verdict entries
- **refuted (M1):** resolved.
- **unproven, real SQL:** resolved from `sql-verify-261023-update-kudo.png`, 11/11 PASS.
- **unproven, E2E:** resolved from `tester-261023-green-2.md` (317/317).
- **unproven, row lock under load:** reclassified into the accepted Low last-write-wins finding. The mechanism (`for update` at migration `:60`) is established by reading the SQL; contention is not exercised.

## New Low (deferred)
- `write-kudo.ts:36` `hasOnlySafeLinks` skips a link whose label holds a mention. Pre-existing; not exploitable today.
- `update-kudo-action.ts:68`: removed and kept URLs are matched by raw string, not by object name. A same-origin URL variant could delete the caller's own canonical object.

## Still deferred
U+E000 characters; last-write-wins; `savedKudos` overlay; `image_url` index; counter `aria-describedby`; fake vs SQL drift.

riskGate: touchesSensitiveArea and signoffRequired are true; humanSignedOff is false until the owner signs.
