# Re-Review: fix round 1

## Findings Under Verification
- Medium close-button:14 — Addressed. kudo-detail-close-button.tsx:12-20 isBackTarget rejects pathname === LOGIN_PATH; :32 checks the previous Navigation entry. E2E test (spec ~136) was RED pre-fix, GREEN after (raw-temper-runs.json).
- Low close-button:16 — Addressed. :34 `history.length > 1 && isBackTarget(document.referrer)`.
- Low routes.ts:24 — Addressed. Comment now names app/[locale]/sun-kudos/[id].

## Verdict Entries Under Verification
1. Close — now proven: board->detail, direct open, and login-previous (new test, red/green). Resolved.
2. Frame vs Figma — full E2E green on same build (245/0; one earlier flake passed 10/10, in untouched code); 375/EN covered; visual report geometry within 2px at 1440/375/768/1280. Font weight and page background art are documented deviations, not fixed, so the 1440 match is not fully proven. Stays unproven.

## New Findings From The Fix Diff
None. kudo-person py-2.5 with -my-2.5 gives 24+20=44px for one line (same as the old min-h-11); wrapped names only grow. `wrap` and `plain` props default off, so board cards are unchanged. Docs agree with the code (resolveAuthRedirect signature, cookie flags httpOnly/Lax/Secure-in-prod/600s).

## Assessment
Fix is sound. Not SEALED: unproven entry 2 remains (unfixed visual deviations).
