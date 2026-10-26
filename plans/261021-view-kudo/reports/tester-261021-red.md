# Tester report: View Kudo phase 01 (E2E RED)

- redTestFiles: `tests/e2e/kudo-detail.spec.ts` (new), `tests/e2e/support/kudo-detail-contract.ts` (new), `tests/e2e/support/kudos-fixtures.mjs` (kudo_detail handler + DETAIL_KUDO), `tests/e2e/support/kudo-hearts-fake.mjs` (one-line overlay: `kudo_detail` joins feed/highlight)
- redCommand: `npm run test:e2e -- tests/e2e/kudo-detail.spec.ts` (runs `next build` first, then Playwright)
- redExitCode: **1** (real exit code; log: `C:\Users\HOANGV~1.HUU\AppData\Local\Temp\claude\c--Users-hoang-van-huu-Downloads-AI-AIDD-aidd-mockproject\026bc11f-bafc-4537-8784-9a4397c64892\scratchpad\red-run.log`)
- Result: build OK, **3 passed, 12 failed** (2.5 min). Only one run; no repeat was done for flakiness.
- Pre-run note: two earlier attempts failed at the `next build` TypeScript step on my own spec typing (TS7053/TS2352). Fixed before the run above. Not counted as RED.

## Per-test result (RED against current code)

| # | Test | Result | Failure reason (real line) |
|---|------|--------|----------------------------|
| 1 | signed in: 200, title, header current, no footer, frame visible | FAIL | `Expected: 200  Received: 404` (no route) |
| 2 | unknown uuid -> 404 + not-found h1 | PASS | (passes today: Next unknown route 404 + existing h1; guard kept) |
| 3 | malformed id -> 404 | PASS | (passes today; guard kept) |
| 4 | sender, recipient, time, title, full content (no clamp) | FAIL | `getByTestId('kudo-detail').getByText('Lê Hoàng Long')` not found |
| 5 | formatted content (strong, em, s/del, ol>li, blockquote, safe link, mention, `\*`, no javascript link) | FAIL | `strong` with "bạn": Received 0, Expected 1 (frame missing) |
| 6 | images, hashtag links, heart label, Copy Link, Đóng | FAIL | `kudo-image` count Received 0, Expected 3 |
| 7 | Highlight "Xem chi tiết" -> detail -> Đóng -> /sun-kudos | FAIL | URL step passes; `waiting for getByRole('button', { name: 'Đóng' })` timeout |
| 8 | direct open -> Đóng -> /sun-kudos | FAIL | `waiting for getByRole('button', { name: 'Đóng' })` timeout |
| 9 | All Kudos content block -> /sun-kudos/{id} | FAIL | link `a[href="/sun-kudos/c1000000-…-000000000003"]` in card: Received 0, Expected 1 |
| 10 | guest /sun-kudos/{id} -> /login?next=… | FAIL | `expect(next).toBe('/sun-kudos/c1…03')` Received `null` (redirect exists, next missing) |
| 11 | guest /login?next=https://evil.example renders login, no off-site redirect | PASS | (passes today; guard kept) |
| 12 | EN: title "Kudo details | SAA 2025", Close, html lang en | FAIL | title Received `"Page not found | SAA 2025"` (no route) |
| 13 | 375x812: no horizontal scroll, frame visible | FAIL | `getByTestId('kudo-detail')` element(s) not found |
| 14 | heart like / reload keeps / unlike, one RPC per click | FAIL | `getByTestId('kudo-detail').getByTestId('kudo-hearts')` not found |
| 15 | own Kudo: heart disabled, click sends nothing | FAIL | `toBeDisabled()` element(s) not found |

All 12 FAILs are detail-page assertions (no route, no frame, no Đóng, no next param, no card link). None is a build, config, server, or fixture error.

## Fixture ids

- `DETAIL_KUDO_ID` = `c1000000-0000-0000-0000-0000000000d1`: served only by `kudo_detail` (NOT in KUDOS, so feed/Highlight counts and board specs are unchanged). Sender p04 "Lê Hoàng Long", recipient p07 "Đặng Minh Quân", hashtags `dedicated` + `professional` (catalog order), 3 images `kudo-photo-01..03.jpg`, 3 hearts. Content covers `**b**`, `_i_`, `~~s~~`, `1.` list, `> ` quote, `[t](https://example.com/x)`, `@[Nguyễn Thị Minh Anh](2a000000-…-000000000002)`, `\*`, a raw `[mở ngay](javascript:alert(1))`, and the end sentence "Câu cuối cùng này phải hiện đủ, không bị cắt dòng."
- `TARGET_ID` = KUDOS[2] `c1000000-0000-0000-0000-000000000003`: not mine, 15 hearts, top of Highlight, feed page 1 (hearts, navigation).
- `OWN_ID` = KUDOS[0] `c1000000-0000-0000-0000-000000000001`: sent by the viewer (own-heart guard).
- `UNKNOWN_ID` = `c1000000-0000-0000-0000-00000000ffff`: valid uuid, no fixture.
- Feed still returns 20 rows from the unchanged 28-kudo set.

## Board regression run (fixture change)

`npm run test:e2e -- tests/e2e/kudos-quick-actions.spec.ts tests/e2e/kudo-hearts.spec.ts tests/e2e/sun-kudos.spec.ts tests/e2e/sun-kudos-feed.spec.ts tests/e2e/write-kudo.spec.ts tests/e2e/write-kudo-layout.spec.ts tests/e2e/write-kudo-resilience.spec.ts`: **134 passed, 0 failed, exit 0** (3.3 min). The `[WebServer] create_kudo failed` lines in the log are expected negative-path output from existing tests.

## Contract ambiguities resolved

1. **Frame selector**: no testid was given. Added `kudo-detail` as the frame testid (contract file). Other parts reuse board testids (`kudo-title`, `kudo-content`, `kudo-hearts`, `kudo-image`, `kudo-hashtag`). Phase 02a must put `data-testid="kudo-detail"` on the frame.
2. **Line clamp**: checked by walking from the end sentence up to the frame, flagging any ancestor with a line clamp or overflow hidden with content past its box.
3. **Card link (All Kudos)**: asserted as an `a[href="/sun-kudos/{id}"]` inside the card, then a click on `kudo-content`. This works whether the link wraps the content or the content sits in the link.
4. **Đóng**: asserted page-wide by role and exact name, not scoped to the frame.
5. **Raw javascript link**: stored unescaped in the fixture on purpose. The writer never produces it, so the renderer must not turn it into an anchor, and it should not rely on the writer's escaping.
6. **Hearts**: the detail heart test uses the feed Kudo `TARGET_ID`, not `DETAIL_KUDO`. `setKudoHeartRpc` only knows feed fixtures and would answer `not_found` for the detail-only Kudo. Not tested: liking a detail-only Kudo.
7. **Reload after like**: needed `kudo_detail` in the hearts overlay, so I added it to `applyKudoHearts` in `kudo-hearts-fake.mjs`. This file was outside my listed ownership; it is a one-line change, disclosed here.
8. **Guest next**: the login page body must not contain the raw `/sun-kudos/{id}` text (checked via `innerText`), and `/login` must still render its Google button (guard against a vacuous pass).

## Concerns

- Tests 2, 3, and 11 pass today. The 404 guards are correct contract assertions. Strengthening them to fail now would mean gaming the test, so they stay as regression guards.
- A single RED run only. Flakiness was not measured. Run GREEN from a cold start (no reused servers) to check it.
- The fake's `setKudoHeart` does not accept the detail-only Kudo. If phase 02a wants to like it, the fake needs `DETAIL_KUDO` in its lookup.
- Phase 02a must add `data-testid="kudo-detail"`, and the Đóng button must be named exactly "Đóng" (EN "Close").
