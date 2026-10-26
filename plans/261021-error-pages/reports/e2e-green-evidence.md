# E2E GREEN evidence: error pages 404 + 403 (phase 03)

**Verdict: NOT GREEN.** Everything except one assertion helper passes. The 375px `error-bg` check in `tests/e2e/error-pages.spec.ts` is a timing race in the spec (not a missing product feature) and fails intermittently. The spec is out of scope for this run, so the fix needs a go-ahead. Date: 2026-10-21, Windows 11, Chromium (Playwright), Next 16.4.0.

## Commands (real exit codes; raw log: `evidence/raw-temper-runs.json`, final runs: `evidence/temper-results.json`)

| # | Command | Exit | Result |
|---|---------|------|--------|
| 1 | `npm run lint` | 0 | clean |
| 1 | `npx tsc --noEmit` | 0 | clean |
| 1 | `npx vitest run` | 0 | 40 files, 565 tests passed |
| 2 | `npm run test:e2e` (full, incl. `next build`) | 1 | 227 passed, 2 failed, 6.5 min |
| 3 | `npx playwright test tests/e2e/error-pages.spec.ts --repeat-each=3` | 1 | 30 passed, 3 failed (33 runs) |
| 3 | `npm run test:e2e -- tests/e2e/error-pages.spec.ts` (the RED command, GREEN re-run) | 1 | 10 passed, 1 failed |
| 4 | `npx opennextjs-cloudflare build` | 0 | Worker saved, warnings only (below) |
| 4 | `npx wrangler deploy --dry-run --outdir <scratchpad>/wrangler-dry` | 0 | gzip 2272.13 KiB (limit 3072 KiB, 74 %) |
| 4 | `npx opennextjs-cloudflare preview` + curl | 0 | see Worker section |
| 5 | visual capture (12 live screenshots) and pixel compare | 0 | see visual-check.md |

Full suite, excluding the two error-pages failures: all 227 other tests pass, including `language-switch-authed.spec.ts` (3 of 3, including the EN 404 case with h1 "NOT FOUND") and `language-switch.spec.ts`. The `error-pages.spec.ts` cases that pass: guest /login redirect, signed-in 404 (VI and EN, h1, body, illustration, home link, title, no banner/contentinfo), VI uppercase CSS, home-link click, guest /403 (403, stays on /403), signed-in /403 (VI and EN), 403 home click.

## Failure (both runs, same assertion)

```
Error: error-bg background image is rendered
Expected: true
Received: false
> 80 |   expect(hasBackground, "error-bg background image is rendered").toBe(true);
    at expectBackgroundAndFit (tests/e2e/error-pages.spec.ts:80)
    at tests/e2e/error-pages.spec.ts:131   (404, 375px)
    at tests/e2e/error-pages.spec.ts:173   (403, 375px)
```

Intermittency: the 404 check failed in the full run, in 1 of 3 repeats, and in the RED re-run. The 403 check failed in the full run, in 2 of 3 repeats, and passed in the RED re-run. The same code passed 2 of 2 when run alone against warm servers.

### Root cause

1. Spec: `expectBackgroundAndFit` (`tests/e2e/error-pages.spec.ts:74-86`) samples the DOM once, synchronously, right after `goto` resolves on `load`. It has no auto-wait. The h1 and image assertions in `expectErrorPage` use `expect(...)`, which waits, so they pass. The background probe does not wait.
2. Product behaviour behind it: the raw HTML for both `/error-pages-no-such-page` (404) and `/403` is the Next client-render shell `<html id="__next_error__">` with no h1, no `<img>`, and no `error-bg` in the response body. The error UI is rendered on the client. Probes against the live server: at `load`, error-bg is absent in 20/20 signed-in 404 loads and 18/20 signed-in 403 loads. After 1.5-2 s it is present in every load.
3. The repo's memory (`i18n-locale-rewrite-pitfalls`) already records the same shell for `notFound()` under `app/[locale]`, which was accepted as the cost of losing the server-side locale. The 403 page (`forbidden()`) now shows the same shell, which is new behaviour that nobody has accepted yet.

### Proposed fix (not applied; spec is out of scope)

In `expectBackgroundAndFit`, wait for the rendered background before the probe, e.g. `await expect(page.locator('img[src*="error-bg"]')).toHaveCount(1);` then run the existing evaluate. The visual capture script waited for the same image and found it on all 12 loads. The patched spec has not been run.

Product decision needed: accept the client-rendered 403 and 404 shell (consistent with the accepted 404 decision), or make the error UI server-rendered. A no-JS visitor currently sees an empty body on both pages.

## Flakiness

No Playwright `flaky` status (retries are 0). Pass/fail varies across identical runs of the same assertion (see above), so this is intermittent in the spec, not deterministic. Repeat run: 30/33 passed.

## Worker (OpenNext, Cloudflare)

- Build: `opennextjs-cloudflare build` exit 0. Warnings: "OpenNext is not fully compatible with Windows" (x3) and "Node.js middleware support is experimental in cloudflare" (proxy.ts). Next build: no warnings.
- Dry-run size: total upload 10924.37 KiB, gzip 2272.13 KiB, limit 3072 KiB (74 %).
- Preview (`opennextjs-cloudflare preview`, 127.0.0.1:8787):
  - `GET /403` VI: 403, title "Truy cập bị từ chối", h1 present.
  - `GET /403` EN (`NEXT_LOCALE=en`): 403, "Access Denied".
  - Guest `GET /error-pages-no-such-page`: 307 to `/login` (default-deny), not a 404.
  - No 1101 or 500 in any response.
- Not verified: signed-in unknown path on the Worker. `NEXT_PUBLIC_SUPABASE_*` is inlined at build time from `.env.local` (real project), so a signed-in check needs a rebuild against the fake Supabase. Signed-in 404 and 403 were verified on `next start` instead.

## Visual (live app)

Full detail in `reports/visual-check.md` ("Tester verification"). Captures in `reports/visual/`. Summary:
- Title ink width and baseline match Figma (EN 404: 358 and 179; EN 403: 430 and 178-179).
- Illustration box 702x545 at x 368, y 190 (matches).
- Pixel MAE vs Figma, button excluded: 3.05 (404), 3.61 (403). Not zero, so no exact claim.
- Background about 2.7 levels darker than Figma (qualitative).
- Open: group not vertically centred (top margin 128 px, bottom margin 37 px; horizontally centred); EN 403 description intentionally differs from Figma (clarifications.md); no overlap for the added button; no horizontal scroll at 375.

## Side notes

- All ports freed after the runs (3100-3103, 54398, 54399, 8787 checked). The three diagnostic probe runs were reruns, not product changes.
- `git status` before and after is identical: no product code or spec was edited. Nothing committed.
- Diagnostic-run timestamps in `raw-temper-runs.json` are approximate (no log files); the eleven final runs use real log times.
- `temper-results.json` validates with `validateEvidence` (stage temper): `ok: true`, 0 blocking, 3 warnings for the red E2E commands plus the missing `inspection-verdict.json`.

## Blockers for the orchestrator

1. Approve a spec patch to `expectBackgroundAndFit` (wait for the error-bg image before the probe), then re-run the RED command and `--repeat-each=3` for GREEN.
2. Decide on the client-rendered 403 and 404 shell (accepted for 404 per memory; now also 403).
3. Decide on vertical group centring with the added button (currently top margin 128 px, bottom margin 37 px).
4. Decide whether the background tone (about 2.7 levels darker than Figma) is acceptable.
5. Signed-in Worker check needs a rebuild with the fake Supabase env if you want it.
