# Review pass 1: error pages 404 + 403

Reviewer tier: strong. Scope: uncommitted working tree on `main` vs `343e91a`. Read-only review, plus one live probe of guest `/403` on a throwaway `next start -p 3190` (stopped afterwards).

## Review Summary

The change is small, tidy and does what the clarifications ask. `forbidden.tsx` sits at the `[locale]` root segment, so it catches `forbidden()` from every page and nested layout under the root layout. `/403` is a dynamic route (it is not in the prerender manifest) and throws before any render, with no `loading.tsx` above it, so the status is a real 403. The live probe confirmed: `HTTP/1.1 403`, `cache-control: private, no-cache`, `<meta name="robots" content="noindex"/>`, a localised `<title>` in VI and EN, and no `Set-Cookie`. `PUBLIC_PATHS` adds exactly `/403`: `/403/x` and `/vi/403` get 307 to `/login`, and `/403/` gets 308 to `/403`. Nothing blocks the merge. The open items are evidence bookkeeping and known client-shell limitations.

## Scope

- Changed: `next.config.ts` (`experimental.authInterrupts`), `lib/navigation/routes.ts`, `lib/auth/constants.ts`, `app/[locale]/forbidden.tsx`, `app/[locale]/403/page.tsx`, `components/errors/*`, `components/not-found/not-found-content.tsx`, `messages/{vi,en}/{forbidden,not-found,index}.ts`, `public/images/errors/*`, unit and E2E specs.
- Impacted: the auth gate (default-deny), every unknown URL, the `Dictionary` type, the Worker bundle.

## Assessment (eight checks)

| Check | Result |
|---|---|
| Concurrency | n/a. Pure render; no shared state. |
| Error boundaries | OK. The `[locale]/forbidden.tsx` boundary sits inside the root layout. A `forbidden()` thrown by the root layout itself would bypass it, but the root layout never calls it. `unauthorized()` is now enabled but has no `unauthorized.tsx` and no callers (Low). |
| API contracts | OK. The `NotFoundContent` props are unchanged. The `Dictionary` gained `forbidden {metaTitle,title,body,homeLink}`, and `en` is typed `Dictionary`, so a missing key fails the build. |
| Backwards compatibility | OK. The 404 EN h1 changed to "NOT FOUND"; `language-switch-authed.spec.ts` was updated to match. The EN metaTitle is kept. |
| Input validation | n/a. No input is read. The locale comes from a param and a cookie, both whitelisted by `isLocale`/`resolveLocale`. |
| Identity and permission | OK. Exact-match `PUBLIC_PATHS`, with unit cases for `/403`, `/403/` and `/403/x`. The guest unknown path still goes to `/login` (deliberate; recorded in clarifications). |
| Query efficiency | n/a. |
| Data leakage | OK. The boundary and the page touch no session or data. The response is `private, no-cache` with no `Set-Cookie`, and the 404 page shows no error details. |

## Critical
None.

## High
None.

## Medium
1. **The post-fix E2E run is missing from the evidence.** The controller's run with the patched `expectBackgroundAndFit` (`--repeat-each=3`, 33/33) does not appear in `evidence/raw-temper-runs.json` (last line 19) or in `temper-results.json`. Both still end on the red runs. The last full-suite run (227 pass, 2 fail) used the old helper. Since then only the spec helper has changed, so the other specs cannot have regressed, but the gate reads files, not claims. Fix: append the 33/33 run (command, exit 0, timestamp) to `raw-temper-runs.json`, and ideally one `npm run test:e2e -- tests/e2e/error-pages.spec.ts` exit-0 run as well. Note: E2E servers on 3100-3103 were running (started 11:35-11:36, after the 11:35:23 build), so I did not run E2E in parallel.

## Low
1. **Client-render shell (known, accepted).** The raw HTML for `/403` and the 404 page is `<html id="__next_error__">` with no `lang`, no h1 and no content until hydration. No-JS visitors and crawlers see an empty body; the title and noindex are present. This was already the case for the 404 page and is now also true for 403. Defer.
2. **Future streaming routes would lose the 403 status.** Any route under a future `loading.tsx` or `<Suspense>` that calls `forbidden()` after streaming starts will send 200 (noindex still renders). Fix: one line in `docs/code-standards.md`: "call `forbidden()` before any await that streams, or in a layout/page without a `loading.tsx` above it." Defer.
3. **`authInterrupts` side rules.** A `try/catch` that wraps `forbidden()`/`unauthorized()` must rethrow (`unstable_rethrow`), as with the existing `connection()` lesson. `unauthorized()` has no `unauthorized.tsx`. Document this when the first caller lands. Defer.
4. **Guest `/403` E2E asserts only status and path.** Guest page content is covered only by the Worker curl of the title, while signed-in content is fully asserted. Rendering is identical (no session read), so the risk is low. Defer.
5. **A redundant probe in `expectBackgroundAndFit`.** After the new `expect.poll(... error-bg && img.complete)`, the `hasBackground` evaluate is always true. Harmless. No assertion was weakened: the h1 wait and the image-complete poll are added on top, and the scroll-width check is unchanged. Defer.
6. **Visual items (known, accepted).** The background is about 2.7 levels darker than the screenshot; the vertical group is not centred because of the added home button; the EN 403 description intentionally differs from Figma. Defer.

## Edge Cases Turned Up
- `/403/x` (guest) → 307 `/login`; signed in, it falls through to `[...rest]` → 404. Correct.
- `/vi/403` (guest) → 307 `/login`; signed in, it is re-nested (`/vi/vi/403`) → 404, by design of `resolveLocaleRewrite`.
- `/403/` → 308 `/403` → 403.
- A tampered `NEXT_LOCALE` falls back to `vi` in both the metadata (`resolveLocale`) and the client leaf (`isLocale` on the param).
- Guest unknown path → 307 `/login` rather than 404. Deliberate, recorded in clarifications, and keeps path existence hidden.

## Done Well
- The shared `ErrorScreen` and `useErrorCopy` remove the duplication between the 404 and 403 pages (DRY), and every file stays under 52 lines.
- Single h1. Both images are decorative with `alt=""`, and the background wrapper is `aria-hidden`. The home link is `min-h-11 min-w-11`, uses `FOCUS_RING` (focus-visible) and has motion-safe transitions.
- `next/image` declares `sizes` on both images (`100vw` for the fill background, `(min-width: 750px) 702px, calc(100vw - 2rem)` for the illustration). The background was converted to WebP (1.7 MB → 206 KB); the illustrations are 84 KB and 28 KB.
- `/403` is public with exact matching and unit-tested negative cases. The comment records the owner decision.
- The uppercase VI title is CSS-only, so the accessible name stays sentence case.
- Worker gzip is 2272 KiB (74% of the free limit). The OpenNext preview returns 403 in VI and EN with no 1101.

## Actions In Order
1. Record the post-fix error-pages E2E run(s) in `evidence/raw-temper-runs.json` (Medium 1).
2. Optional: add the "forbidden() before streaming" and "rethrow auth interrupts" notes to `docs/code-standards.md` (Low 2, 3).

## Numbers
- New or changed source files: 7 new, 11 modified; largest new file 51 lines (`error-screen.tsx`); spec 180 lines.
- Assets: 206 KB + 84 KB + 28 KB. Worker gzip 2272.13 KiB / 3072 KiB.
- Evidence: lint 0, tsc 0, vitest 565/565; full E2E 227/229 before the helper fix; error-pages 33/33 after the fix (controller's claim, not yet in the evidence files).
- Live probe (`next start -p 3190`, guest): `/403` 403 + noindex + localised title (VI and EN); `/403/x` and `/vi/403` 307 `/login`; `/403/` 308.

## Still Unresolved
- Whether to server-render the error UI so no-JS visitors see content (product decision; pre-existing for 404).
- Vertical centring with the added button, and the background tone (design decision).

```json
{
  "score": 8.6,
  "criticalCount": 0,
  "decision": "SEALED",
  "acceptanceCovered": [
    "an unknown path returns HTTP 404 and shows the redesigned not-found page with its title, the robot illustration, the description and a back-to-home button that goes to /",
    "/403 returns HTTP 403 for guests and signed-in users and shows the Access Denied page with its title, the monitor illustration, its own description and a back-to-home button that goes to /",
    "any route can call forbidden() and get the same 403 page",
    "both pages match their Figma exports at 1440 wide (dark ribbon background, centred title, illustration and description) and have no horizontal scroll at 375",
    "every string switches between VI and EN; the existing unit and E2E suites stay green"
  ],
  "regressionChecked": [
    "auth gate default-deny: /403 exact only; /403/x and /vi/403 redirect to /login (unit + live probe)",
    "guest unknown path still 307 /login (E2E + Worker preview)",
    "language-switch-authed EN 404 case updated and passing in full run",
    "no existing route calls forbidden()/unauthorized(); no loading.tsx above /403",
    "/403 dynamic (not prerendered), status 403, noindex, private no-cache, no Set-Cookie",
    "Dictionary type completeness enforced by en: Dictionary (tsc 0)",
    "Worker bundle size within limit (gzip 2272.13 KiB)"
  ],
  "contractStatus": "OK",
  "refuted": [],
  "unproven": [],
  "reachableRegressions": [],
  "findings": [
    { "severity": "Medium", "category": "evidence", "location": "plans/261021-error-pages/evidence/raw-temper-runs.json:19", "summary": "Post-fix error-pages E2E run (33/33) not recorded; evidence ends on red runs", "disposition": "Accept" },
    { "severity": "Low", "category": "a11y/seo", "location": "app/[locale]/forbidden.tsx:17", "summary": "Boundary serves __next_error__ client shell: no lang/h1 until hydration (known, pre-existing for 404)", "disposition": "Defer" },
    { "severity": "Low", "category": "error-boundaries", "location": "app/[locale]/403/page.tsx:3", "summary": "Future routes calling forbidden() after streaming starts would return 200; document the rule", "disposition": "Defer" },
    { "severity": "Low", "category": "config", "location": "next.config.ts:8", "summary": "authInterrupts also enables unauthorized() (no unauthorized.tsx); try/catch must rethrow interrupts", "disposition": "Defer" },
    { "severity": "Low", "category": "tests", "location": "tests/e2e/error-pages.spec.ts:145", "summary": "Guest /403 E2E asserts status and path only, not content", "disposition": "Defer" },
    { "severity": "Low", "category": "tests", "location": "tests/e2e/error-pages.spec.ts:80", "summary": "hasBackground probe redundant after the new poll; no assertion weakened", "disposition": "Defer" },
    { "severity": "Low", "category": "visual", "location": "components/errors/error-screen.tsx:24", "summary": "Group not vertically centred (added button); background ~2.7 levels darker (known, accepted)", "disposition": "Defer" }
  ],
  "riskGate": { "touchesSensitiveArea": true, "signoffRequired": true, "humanSignedOff": false }
}
```
