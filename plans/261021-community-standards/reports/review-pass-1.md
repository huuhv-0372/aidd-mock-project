# Review pass 1: Community standards page (/tieu-chuan-chung)

## Review Summary
Small, well-scoped change. The auth gate opens exactly one new path, compared exactly, and nothing wider. The SiteFooter API change is additive and backward-compatible. The a11y structure is sound. No Critical or High findings. Three Low findings, all non-blocking. **SEALED.**

## Scope
Uncommitted tree vs HEAD 7597034.
- Modified: `lib/auth/constants.ts`, `tests/unit/resolve-auth-redirect.test.ts`, `components/site-shell/site-footer.tsx`, `messages/{vi,en}/index.ts`.
- New: `app/[locale]/tieu-chuan-chung/page.tsx` (41 lines), `components/standards/standards-hero.tsx` (44), `components/standards/standards-content.tsx` (54), `messages/{vi,en}/standards.ts` (35/41), `tests/e2e/standards.spec.ts` (155).
- All files are under 200 lines.

## Assessment

### Auth gate
- `resolveAuthRedirect` strips trailing slashes, then checks for an exact match with `PUBLIC_PATHS.includes`. The diff adds only `STANDARDS_PATH` (`/tieu-chuan-chung`) to `lib/auth/constants.ts:25`. No prefix or glob matching is introduced.
- The unit test now pins both sides:
  - Allowed: `/tieu-chuan-chung` and `/tieu-chuan-chung/`.
  - Denied: `/tieu-chuan-chung/x`.
- Locale is cookie-based and has no URL prefix. `proxy.ts` decides gate and auth on the public pathname first, and only then rewrites to `/{locale}/...`. So:
  - The EN page is the same public URL with `NEXT_LOCALE=en`, so it is public too.
  - `/en/tieu-chuan-chung` and `/vi/tieu-chuan-chung` are not in `PUBLIC_PATHS`, so anonymous users are sent to `/login`. Signed-in users get a 404 (nested `/vi/en/...`). Nothing broader became public.
- Pre-launch, the countdown gate still redirects this page to `/countdown`, the same as every other page.

### Header session controls for guests
- The page reuses `HeaderSessionControls` inside `<Suspense>`. It calls `await connection()` before `getIsAuthenticated`, so the PPR pitfall is handled.
- Guests get `LoginLink`. Signed-in users get the existing controls. The page body renders only static dictionary copy: no session data and no Supabase reads.
- E2E covers both: a guest sees the login link, and a signed-in user opens the page (`standards.spec.ts:52-64`).

### SiteFooter contract
- `activeHref?: string` is optional. Callers that omit it (`/`, `/awards-information`, `/sun-kudos`) render `aria-current={undefined}`, so the markup is unchanged.
- `HomeLink` spreads its props, so `aria-current` reaches the anchor.
- `xl:gap-x-0` is a global visual change. It is verified at 1440 on all four path/locale combinations (visual-check.md, fix round 1). It does not hurt when the row wraps, because the wrapped items sit on separate lines.

### a11y
- One `sr-only` `<h1>` (VI "Tiêu chuẩn chung", EN "General standards").
- Two `<h2>`s, each wrapped in a `<section aria-labelledby>`.
- Semantic `<ol>` (10 items) and `<ul>` (2 items), and an `<hr>` separator.
- `aria-current="page"` on the footer link only. The header gets `activeHref=STANDARDS_PATH`, but no header item has that href, so nothing in the header is marked current. This matches the clarification.
- Decorative band image uses `alt=""` and `aria-hidden`. The logo has `alt="ROOT FURTHER"`.

### i18n
- `Dictionary["standards"]` types the EN dictionary, so a missing key is a compile error.
- Every rendered string comes from `copy.*`. The only hard-coded string is the logo alt (a brand name, same as the homepage).
- EN copy that did not come from Figma is marked `/* not from Figma */` and listed in en-localizations.md.

### next/image
- Band image: `fill` with `sizes="100vw"`.
- Logo: `sizes="(min-width: 768px) 451px, 80vw"`, which matches `w-4/5 md:w-full max-w-[451px]`.

### Spec fix at :44
- `pageHeading(page, name = PAGE_TITLE)`:
  - The VI cases still assert exactly one VI h1.
  - The EN case now also asserts the EN h1 (`:135`).
- This is a stronger check, not a weaker one. Every other assertion uses exact text, exact counts, or `toHaveText` on the ordered list. No `.or()`, no soft asserts, no loosened regex.

## Critical
None.

## High
None.

## Medium
None.

## Low

**L1. Layout coupling to SiteFooter's margin** (`components/standards/standards-content.tsx:20`)
- Problem: `xl:-mb-[53px]` exists only to cancel part of SiteFooter's `xl:mt-[125px]` (`site-footer.tsx:24`). The comment documents it, but the two values are linked implicitly. If the footer margin changes, this page drifts silently.
- Fix: give `SiteFooter` a `className` override for its top margin, or a shared constant, when a second page needs a different gap (YAGNI until then).
- Disposition: Defer.

**L2. Hero artwork is an approximation** (`components/standards/standards-hero.tsx:20`)
- The artwork composition differs from the export (the ribbon colours on the right). Geometry, fade and page height match within 1 px.
- This is a known, documented limit: the Figma MCP was unavailable.
- Disposition: Defer.

**L3. Footer still wraps between xl and about 1433 px** (`components/site-shell/site-footer.tsx:25`)
- This existed before this change, and this change improved the 1440 case.
- The 184 vs 184/189 bullet-indent inconsistency is accepted as a Figma inconsistency.
- Disposition: Defer.

**Note (not a finding).** The EN contact line ("Sunners please contact …") is slightly awkward English. It is self-translated and flagged, so it is a copy pass only.

## Edge Cases Turned Up
- `/tieu-chuan-chung//`: trailing slashes are stripped, so it is public and serves the same page. OK.
- `/TIEU-CHUAN-CHUNG`: no case folding, so anonymous users are sent to `/login`. This is correct default-deny.
- A tampered locale cookie falls back to `vi` through `resolveLocale`.
- Unknown `[locale]` param: `getRouteDictionary` calls `notFound()`.

## Done Well
- The public allow-list stays an exact match, and the unit test pins both the positive and the negative-suffix case.
- The footer change is additive with an optional prop. Pages that pass nothing are untouched, and the E2E checks that the homepage footer has no `aria-current`.
- Copy has a single source with compile-time key parity. The VI E2E asserts the copy verbatim from the Figma export.
- `"use client"` is not added anywhere. The page is pure server components, with the session island behind Suspense.

## Actions In Order
1. None blocking. Optionally track L1 for when a second page needs a different footer gap.

## Numbers
I read and did not re-run these. They are from evidence/temper-results.json:
- lint: exit 0
- tsc: exit 0
- vitest: 562/562
- full E2E: 218/218
- standards spec, repeat-each=3: 30/30, 0 flaky

## Still Unresolved
- Human sign-off on the auth-gate change, as required by the risk gate. The sensitive area is authentication/authorization: the `PUBLIC_PATHS` allow-list in `lib/auth/constants.ts:25`.

```json
{
  "score": 9,
  "criticalCount": 0,
  "decision": "SEALED",
  "acceptanceCovered": [
    "a guest and a signed-in Sunner can both open /tieu-chuan-chung without being redirected to /login",
    "the page shows the ROOT FURTHER key visual, the Tiêu chuẩn cộng đồng section with its intro and exactly 10 numbered rules, a divider, and the Tiêu chuẩn bảo mật section with its statement, 2 bullet points and the support contact line, with the Figma copy",
    "the Tiêu chuẩn cộng đồng link in the Viết Kudo toolbar opens this page in a new tab and the footer Tiêu chuẩn chung link navigates to it; on this page the footer link is marked as the current page",
    "the layout matches the Figma 1161:8944 export at 1440 wide and stays readable without horizontal scroll at 375 wide",
    "every string of the page switches between VI and EN; the existing unit and E2E suites stay green"
  ],
  "regressionChecked": [
    "PUBLIC_PATHS exact match: /tieu-chuan-chung/x, /en/tieu-chuan-chung, /vi/tieu-chuan-chung remain gated",
    "SiteFooter callers without activeHref (/, /awards-information, /sun-kudos) render unchanged; homepage footer has no aria-current (E2E)",
    "footer xl:gap-x-0 verified one-row at 1440 on all four path/locale combinations",
    "HeaderSessionControls guest path renders LoginLink with no session data on a public page",
    "spec :44 pageHeading change strengthens (EN h1 asserted), no assertion weakened",
    "full suites: vitest 562, E2E 218/218 (temper-results.json)"
  ],
  "contractStatus": "OK",
  "refuted": [],
  "unproven": [],
  "reachableRegressions": [],
  "findings": [
    { "severity": "Low", "category": "maintainability", "location": "components/standards/standards-content.tsx:20", "summary": "xl:-mb-[53px] implicitly offsets SiteFooter xl:mt-[125px]; drifts silently if footer margin changes", "disposition": "Defer" },
    { "severity": "Low", "category": "visual-fidelity", "location": "components/standards/standards-hero.tsx:20", "summary": "Hero artwork composition approximates the Figma export (Figma MCP unavailable); geometry/fade/height match", "disposition": "Defer" },
    { "severity": "Low", "category": "visual-fidelity", "location": "components/site-shell/site-footer.tsx:25", "summary": "Pre-existing: shared footer wraps below ~1433px; improved at 1440 by this change", "disposition": "Defer" }
  ],
  "riskGate": {
    "touchesSensitiveArea": true,
    "signoffRequired": true,
    "humanSignedOff": false
  }
}
```

**Status:** DONE
