# E2E RED evidence: Trang Tiêu chuẩn chung (/tieu-chuan-chung)

Policy: `e2e-red-first` (web). Date: 2026-10-21. No product code changed; no commit made.

## Raw facts for the UI agent

- **redTestFiles:** `tests/e2e/standards.spec.ts` (new, the only file created)
- **redCommand:** `npm run test:e2e -- tests/e2e/standards.spec.ts`
- **redExitCode:** `1`
- **Result:** 10 failed, 0 passed (10 tests, chromium, 2 workers)
- **Build step:** `next build` passed (Compiled successfully, TypeScript finished, 14 static pages). The spec type-checks. The failure is not a config, server, or type error.
- **Route table at RED:** no `/[locale]/tieu-chuan-chung` route exists (expected).

## redFailure (each failure is the missing feature)

| # | Test | Real error | Missing piece |
|---|------|-----------|---------------|
| 1 | guest GET /tieu-chuan-chung: 200, stays, header login link | `guest must not be redirected to /login` — Expected `/tieu-chuan-chung`, Received `/login` | Route not in `PUBLIC_PATHS` (default-deny redirect) |
| 2 | signed-in user opens /tieu-chuan-chung | `toBeVisible()` on h2 "Tiêu chuẩn cộng đồng": element(s) not found | Page / route missing |
| 3 | document title, sr-only h1, ROOT FURTHER img, both h2 | redirected to `/login` (same as 1) | Public access + page |
| 4 | gold intro, white notice, `<ol>` of 10 | redirected to `/login` | Public access + page + list |
| 5 | statement, `<ul>` of 2, contact line | redirected to `/login` | Public access + page + list |
| 6 | footer "Tiêu chuẩn chung" aria-current on this page; others none | redirected to `/login` | Public access + page + `aria-current` |
| 7 | homepage footer link → /tieu-chuan-chung, then aria-current | `toHaveURL(/\/tieu-chuan-chung$/)` — Received `http://localhost:3101/login` | Public access; `SiteFooter activeHref` / `aria-current` |
| 8 | Viết Kudo toolbar link opens popup; modal stays open | popup h2 "Tiêu chuẩn cộng đồng": element(s) not found | Page content missing (popup path check passed; link `href`, `target=_blank` and popup path already correct) |
| 9 | EN switch: h2 "Community Standards", h1 "General standards", 10 `ol` / 2 `ul` items | redirected to `/login` | Public access + page |
| 10 | 375px: no horizontal scroll | redirected to `/login` | Public access + page |

Test 1 is the first assertion after the 200 check, so the status check passed on the `/login` page; the path assertion is the one that fails.

## Regression guard (must stay green)

- Command: `npm run test:e2e -- tests/e2e/homepage.spec.ts tests/e2e/homepage-guest.spec.ts`
- Exit code: `0`, 11 passed, 0 failed (1.4m).
- The `getClaims failed ... Invalid JWT signature` lines in the log come from the existing forged-key cookie test and are expected.
- Ports 3100–3103, 54398, 54399 were free before the run and were released after it.

## Selector and contract notes for the implementer

- h1 "Tiêu chuẩn chung" is asserted by role, level, exact name and count (1). Visual hiding is not asserted by the spec. Hide it with `sr-only`.
- Lists are scoped to `main` (`main > ol` with 10 `li`; `main > ul` with 2 `li`). The page must render inside a `<main>` element.
- Curly quotes “ ” are used in items 7 and 10 of the list. Item 9 uses straight quotes `"."`, `","`, `"..."`, as shown in the image. Item 3 ends with a single ellipsis `…`. Verify these glyphs against the image at GREEN time; a mismatch there is a copy bug, not a test bug.
- Footer `aria-current="page"` applies only to "Tiêu chuẩn chung" on `/tieu-chuan-chung`. The other footer links carry none. Homepage `/` must carry none.
- The toolbar link keeps `href="/tieu-chuan-chung"` and `target="_blank"`. The popup must render the h2 "Tiêu chuẩn cộng đồng" with no login redirect (the signed-in user is on the authed server).
- EN: `html[lang=en]`, h2 "Community Standards", h1 "General standards". The item counts are asserted, not the body text.

## Not covered by this spec (by design)

- Gold vs white text colour, Figma pixel metrics, and the keyvisual gradient. These belong to the visual check in phase 03 (`reports/visual-check.md`).
- The iOS MoMorph screen `xms7csmDhD` (no web spec).
