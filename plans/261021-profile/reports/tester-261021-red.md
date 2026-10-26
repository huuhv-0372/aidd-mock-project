# Tester report: Profile phase 01 (E2E RED)

Persisted by the orchestrator from the tester's hand-back (the tester agent does not write report files). The numbers were re-checked against the logs.

- redTestFiles: `tests/e2e/profile.spec.ts` (new, 380 lines), `tests/e2e/support/profile-contract.ts` (new), `tests/e2e/support/profile-fixtures.mjs` (new). Export/wiring only: `kudos-fixtures.mjs` (5 exports, no data change), `kudo-hearts-fake.mjs` (`kudos_profile_feed` joins the overlay), `fake-supabase-server.mjs` (`profileRpc` before `kudosRpc`).
- redCommand: `npm run test:e2e -- tests/e2e/profile.spec.ts` (`next build`, then Playwright)
- redExitCode: **1** (`EXIT=1` in the log)
- redFailure: `GET /profile must answer 200 (the profile route is not built yet)`: Expected 200, Received 404
- Result: **27 failed, 3 passed** (30 tests, 4.8 min). Log: scratchpad `profile-red-run.log`.
- Fixture regression on the same build: `npx playwright test tests/e2e/sun-kudos.spec.ts tests/e2e/sun-kudos-feed.spec.ts tests/e2e/kudo-hearts.spec.ts tests/e2e/kudo-detail.spec.ts tests/e2e/write-kudo.spec.ts` gave **120 passed, exit 0**.

## Per-test result

| Test | Result | Failure |
|---|---|---|
| R1 signed in `/profile`: title, header/footer current, no widget | FAIL | 404 |
| R2 `/profile/<id>` another Sunner | FAIL | 404 |
| R3 `/profile/<own sub>` redirects to `/profile` | FAIL | `profile-hero` not found |
| R4 unknown guid → 404 + not-found h1 | PASS (guard) | — |
| R5 malformed ids → 404 | PASS (guard) | — |
| R6 guest → `/login`, no `next`, no profile data | PASS (guard) | — |
| S1–S15 own page: hero (New Hero, no stars), icons, stats, KUDOS dropdown Đã nhận (3) / Đã gửi (2), direction switch, re-pick no-op, no write bar, card links, Copy Link, hearts, own-sent heart disabled, 375, EN, empty (EMPTY_USER_ID), EN empty Sent | FAIL | 404 |
| O1–O9 another Sunner: hero + icons, Super Hero + 1 star (13 received), write bar → recipient filled, static "Đã nhận: N Kudos" with no "Đã gửi", anonymous alias, infinite scroll 10 → 13, sparse profile, 375, EN | FAIL | 404 |

## Fixtures

- Self: random sub per test, mapped to "viewer" ("E2E User", CEVC1). It has 3 received (KUDOS 1, 5, 13) and 2 sent (KUDOS 0, 18). Stats: received 3, sent 2, hearts 20, boxes 4 / 2.
- EMPTY_USER_ID `e0000000-0000-4000-8000-000000000000`: zero stats, zero-count card, empty feeds.
- Other Sunners:
  - p01 `2a000000-0000-0000-0000-000000000001` "Huỳnh Dương Xuân Nhật": 3 received, New Hero.
  - p05 `…0005` "Phạm Thu Hà": sent one anonymous Kudo.
  - p06 `…0006` "Võ Anh Khoa": its only received Kudo is anonymous.
- Busy `2a000000-0000-0000-0000-0000000000f1` "Đỗ Thanh Hằng": 13 profile-only received rows `c2000000-…-0000000000NN`, 12 distinct senders, so Super Hero and 1 star.
- Sparse `…00f2` "Lâm Quốc Thái": no avatar, no department, 0 Kudos.
- Heart target: KUDOS[5] `c1000000-0000-0000-0000-000000000006`. Own sent: KUDOS[0].

## Notes for the next phases

- Contract additions: `profile-avatar`, `profile-hero-badge`, `profile-hero-stars`, h2 headings for icons and KUDOS, and the static count as its own element.
- The end-of-feed line reuses the board's "Bạn đã xem hết Kudos.".
- The re-pick test counts `Next-Action` POSTs, so feed paging must stay a server action.
- The write-bar test reads the recipient box, so it depends on 02c.
- Not representable in the fake, so they go in the 02b SQL verify file:
  - SEC_002: own anonymous Kudo in Sent;
  - SEC_003: two sessions see disjoint Sent lists;
  - SEC_004: no email or auth id in the `profile_card` payload.
- Dropped: FUN_005 (`?id=` empty or repeated): the path route has no analogue.
- The agent's own memory notes went to `.claude/agent-memory/tester/`. That path is gitignored.
