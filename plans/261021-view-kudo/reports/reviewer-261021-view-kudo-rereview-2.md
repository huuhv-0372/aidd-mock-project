# Re-Review: fix round 2

## Findings Under Verification
None open (round 1 Accept findings addressed; Defer stay deferred).

## Verdict Entries Under Verification
Entry 2 (criterion 6, Figma 1440 match): STILL UNPROVEN.
- Font weight 700: resolved by OWNER decision (clarifications.md, session 2026-10-21, Q1 "Giu 700 nhu the board").
- Background: the owner chose "export the Figma background"; the export turned out to be a flat 80% #00101A overlay. Rebuilt backdrop (KV band + overlay) is a CONTROLLER implementation; tone is measured close (left [2,17,27] vs [1,19,30]; right [14,25,32] vs [5,21,31], the right band is ~9 off in R).
- Art pattern (reference uses an older circuit-line KV absent from repo) and header not dimmed: recorded only as "lech da biet" by the controller. No owner question/answer covers them -> controller defaults.
Owner must accept explicitly: (1) the background art differs from the Figma reference (no circuit-line KV; right band measurably brighter), and (2) the header stays undimmed on this page. Or supply the old KV image / dim the header.

## New Findings From The Fix Diff
None.
- kudo-detail-layout.tsx: static markup, aria-hidden decorative, no data/identity path; Image fill + sizes=100vw ok; overlay is last child so it sits above the gradient as intended.
- google-login-form.tsx: only the Track C change (hidden `next` from server prop, parsePostLoginNext allow-list upstream, re-checked in the action); no leftover client fallback/import/hook.
- proxy.ts, app/[locale]/login/page.tsx: diff vs HEAD shows only Track C lines; grep console.log/debug/dbg empty.
- CLAUDE.md: git diff empty.
- kudo-detail.spec.ts: two assertions are sound (hidden input value; count 0 for external next).
- Re-run: tsc 0; eslint on the touched files clean.

## Assessment
Code is clean. Only blocker is the owner sign-off on art/header deviations (and riskGate human signoff, unchanged). Decision stays REWORK until then.
