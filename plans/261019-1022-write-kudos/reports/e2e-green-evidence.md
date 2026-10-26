# E2E GREEN evidence — Viết Kudos (#12), phase 06 Stage 4

Policy `e2e-red-first`. Date 2026-10-19. Owner: tester. No app code touched (nothing under `app/`, `components/`, `lib/`, `supabase/`, `messages/`).

## Result

- **greenCommand (same as RED):** `npm run test:e2e` (full suite, `next build` then `playwright test`, 2 workers) -> **exit 0, 165 passed, 0 failed, 0 flaky, 0 skipped (4.6 min)**. RED was 70 failed / 0 passed on the two new specs (`write-kudo.spec.ts` 55, `kudos-quick-actions.spec.ts` 15). All 70 are GREEN; the 95 older tests that share the fake or the servers stayed green (165 = 70 new + 95 existing).
- Ports 3100-3103 + 54398 free before the run, after every run, and after the visual servers (killed by PID, my own).
- Unit/gates: `npm run lint` 0 · `npx tsc --noEmit` 0 · `npm test` 0 (33 files, 404 tests, 0 failed).
- Flakiness: `npx playwright test tests/e2e/write-kudo.spec.ts tests/e2e/kudos-quick-actions.spec.ts --repeat-each=5` -> **350 passed, 0 failed (8.3 min)**. The first attempt gave 349/350 (one guest-widget sync gap, below), so it was fixed and the whole repeat re-run.
- Sequence of runs (honest log): full run #1 = 164 pass + 1 fail (ID-26) · full run #2 after fix = 165 pass · repeat #1 = 349 pass + 1 fail (guest Thể lệ strict-mode) · repeat #2 after fix = 350 pass. The full-suite GREEN (run #2) was taken **before** the `openWidgetMenu` helper edit; that edit only touches the two new specs and the contract file, and both specs were re-run 5x afterwards, so the full suite was not repeated (judgment, noted).

## Spec edits (all in tests/e2e, each one justified)

| Edit | Why | Weakened? |
|---|---|---|
| `support/kudos-contract.ts` `ADD_LINK` = `{ title: "Thêm đường dẫn", text: "Nội dung", url: "URL" }`; `write-kudo.spec.ts` Add link block uses `ADD_LINK.text/.url` for the two textboxes and the label click | intentional contract change (VI per Figma `OyDLDuSGEa`); EN stays Add link / Text / Link | no, same assertions, new names |
| `write-kudo.spec.ts` ID-26: `fill("An")` -> `fill("Nguyễn Văn An")` | **test bug found by the first GREEN run**, not an app bug: the fake (like the SQL: ordered by name, `limit 10`) returns 10 of 19 matches for "An" and "Nguyễn Văn An" is the 14th, so the option was never rendered. RED could not reveal it (every body sat behind the missing pill). Same assertions: pick the suggestion, field gets the full name, list closes | no |
| `support/kudos-contract.ts` new `openWidgetMenu(page)`; `kudos-quick-actions.spec.ts` `openMenu` and `write-kudo.spec.ts` "success from / and /awards-information" use it (`toPass`: wait for exactly one `widget-button`, click, menu visible) | the Homepage streams the widget behind a Suspense fallback pill with the same test id. For a moment two `widget-button` elements exist (fallback + hidden streamed segment) and a click before hydration opens nothing: one strict-mode failure in 350 runs (guest "can open Thể lệ"). Synchronisation only; assertions unchanged | no |
| Rules dialog always in DOM: no change needed | the specs already assert visibility/`toBeHidden`, never absence of `rules-badge` / `rules-scroll` when closed | n/a |

Guest "Viết KUDOS" link, pill A.1 enabled, EN strings: needed no spec change (the specs already matched).

## RED -> GREEN mapping

RED reason in the evidence file -> now GREEN:
- 54 x "pill A.1 must be an enabled control" (53 `openWriteModal` users + 1 pill test) -> pill is enabled and opens the modal; all 55 `write-kudo.spec.ts` bodies ran for the first time against a UI and passed (after the ID-26 query fix).
- 16 x "widget-menu not found" -> menu, red ✕, Esc, Thể lệ panel, Viết KUDOS, guest link to /login: all 15 `kudos-quick-actions.spec.ts` pass; the 2 "success from / and /awards-information" cases in `write-kudo.spec.ts` pass.
- The RED "Limit" warning (bodies not exercised) was real: it cost one query fix (above); nothing else needed a selector tweak.

## Worker size (phase 06 step 7)

- `npx opennextjs-cloudflare build` exit 0 (2m36s), then `npx wrangler deploy --dry-run --outdir <scratch>` (nothing uploaded) exit 0: **Total Upload 10653.17 KiB / gzip 2217.34 KiB**.
- Baseline 2219.36 KiB (live-board temper run) -> **-2.0 KiB**; free limit 3 MiB = 3072 KiB -> 854 KiB (28%) headroom.
- Tiptap/ProseMirror: **0 matches** in the bundled `worker.js` (10.9 MB, `grep -oi tiptap|prosemirror`), 0 files in `.open-next/server-functions`, `worker.js`, `middleware`. It is only in one client chunk `.open-next/assets/_next/static/chunks/0vip8ygfk2t2u.js` (444 KiB raw, 141 KiB gzip), which counts against static assets, not the Worker script.
- Not done: `npm run preview` with a 5 x 5 MB body (phase 06 Risk), needs a real session / user.

## Not run / out of scope

Real Supabase SQL (migration + verify, user), real Google login, 5 x 5 MB Server Action body on `npm run preview`, MoMorph image diff (see `visual-check.md`, no tool).

## Findings for the controller (details in visual-check.md)

1. Editor has no visible focus ring (a11y). 2. 20 px remove buttons / 24 px checkbox under 44 px on mobile. 3-8 cosmetic, need the Figma frames.
2. Possible UX gap, not asserted: a guest who taps the Suspense fallback pill before the real widget hydrates gets no menu (the retry helper in the test hides this; a user would just tap again).

## Fix round 1

Date 2026-10-19. Scope Contract as delegated (createKudo upload path/order, JPEG strip, fake Storage/create_kudo, one UI error mapping; visuals skipped). No app code touched.

| Gate | Result |
|---|---|
| `npm run lint`, `npx tsc --noEmit` | 0 / 0 (re-run after the fake edit: 0 / 0) |
| `npm test` | 35 files, **450 passed**, 0 failed (9.8 s) |
| `npm run test:e2e` full (run 1) | **165 passed**, 0 failed, 0 flaky (5.2 m) |
| `write-kudo.spec.ts --repeat-each=3` attempt 1 and 2 | 164 passed + **1 failed each** (ID-45, `repeat2`, `read ECONNRESET` on the fake's `GET /__kudo-log`) |
| same, after keep-alive fix | **165 passed** (55 x 3), 0 ECONNRESET (7.6 m) |
| `npm run test:e2e` full (re-run, shared fake changed) | **165 passed**, 0 failed, 0 flaky (4.9 m) |

**The one failure (test infra, not app).** Twice the repeat run failed at `kudoLog()` with `apiRequestContext.get: read ECONNRESET`, always ID-45 (the longest idle between two requests of the test). `-g ID-45 --repeat-each=12` passed 36/36, so it needs load. Cause (inferred, not proven by a repro): `fake-supabase-server.mjs` used Node's 5 s keep-alive default and these tests idle 4-12 s on this machine, so Playwright's request context reuses a socket the server just closed. Fix in the fake only (`server.keepAliveTimeout = 30_000`), no assertion weakened. After it: 0 ECONNRESET in 330 repeat runs + one full suite. Because the shared fake changed, the full suite was re-run.

**New image-path assertions** (flat `{uuid}.{ext}` names, URL without sender, owner from JWT in the fake, JPEG structure) all pass, including ID-46.

**Workerd 5 x 5 MB: NOT RUN.** Controller skipped it (fix round 2 will change `lib/kudos/*`); no OpenNext build started, no Worker size measured this round (last known: 2217.34 KiB gzip, see above). Prepared outside the repo for the next run: a scratch Playwright spec that drives the real UI through `openWriteModal`/`fillKudo` with 5 JPEGs of 4.9 MB (SOI, JFIF, Exif Orientation APP1, SOS, padding, EOI) and a generator script; plan = `.dev.vars` (gitignored) pointing `NEXT_PUBLIC_SUPABASE_URL` at the fake on 54398, build env the same, `opennextjs-cloudflare preview`, then read workerd `PeakWorkingSet64` and wrangler output. Caveat for that run: local workerd does not enforce the 128 MB isolate limit, so RSS is an indicator, not a proof.

Servers: none started by me are left; ports 3100-3103/8787/54398 free; no `.dev.vars`.

## Fix round 2 (final)

Date 2026-10-19. Code frozen (fix round 2 + C2PA chunk drop). No app code touched by me. Scope: full unit, full E2E, repeat-each=3, workerd 5 x ~4.9 MB.

| Gate | Result |
|---|---|
| `npm run lint`, `npx tsc --noEmit` | 0 / 0 |
| `npm test` | 37 files, **499 passed**, 0 failed |
| `npm run test:e2e` full | **165 passed**, 0 failed, 0 flaky, 0 skipped (4.3 m), 0 ECONNRESET |
| `write-kudo.spec.ts --repeat-each=3` | **165 passed** (55 x 3), 0 failed (6.4 m), 0 ECONNRESET |

### Workerd 5 x ~4.9 MB (review finding M1): PASS

Setup: `npx opennextjs-cloudflare build` with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54398` (the E2E fake, started by me), `.dev.vars` (gitignored, deleted afterwards) with the same URL, the fake publishable key and an opened `EVENT_START_AT`, `opennextjs-cloudflare preview` on 8787 (wrangler reported "Using secrets defined in .dev.vars", workerd local). A scratch Playwright spec (outside the repo, reusing `openWriteModal`/`fillKudo` from `kudos-contract.ts`) signed in with a minted session cookie and sent ONE Kudo through the real UI.

- **Run A, 5 x 5138005 B JPEG** (JFIF + a 36-byte orientation-only Exif APP1): 5 uploads, 1 `create_kudo` with 5 image URLs, 0 deletes, 0 page errors. Upload sizes equal the inputs (nothing to strip).
- **Run B, fresh preview restart, 5 x ~4.9 MB JPEG with heavy metadata** (40 KB Exif with SECRET description/Make strings + Orientation=6, XMP APP1, IPTC APP13, COM): 5 uploads of 5096796..5096864 B (about 41 KB removed per file), 1 `create_kudo` with 5 URLs, 0 deletes, 0 page errors, `POST /sun-kudos 200` (1354 ms in wrangler, 1.7 s in the UI). Stored object 1 re-read from the fake's public URL: segments JFIF + exactly one 36-byte APP1 (Orientation=6 present) then SOS; no `SECRET`, `SecretCam`, `xmpmeta`, `8BIM`, `Photoshop` or `GPS` bytes.
- **Wrangler output:** 0 lines matching exceeded / 1101 / memory / error / 500 across both runs (only the OpenNext-on-Windows WARN banner).
- **workerd working set (indicator, not a limit check):** the user-worker process idle 130.8 MB, after one tiny-image Kudo (page loads included) 205.3 MB, after the 5 x 4.9 MB Kudo 363.4 MB, peak 416.5 MB (100 ms sampler max 411.7 MB). That is whole-process memory (V8, runtime, caches, the earlier page loads), and **local workerd does not enforce the 128 MB isolate limit**, so this shows the request completes and costs roughly +150-210 MB of process memory over a one-image Kudo, not that production stays under 128 MB. Only a real Cloudflare deploy proves that.
- **Worker size (same build):** `wrangler deploy --dry-run` Total Upload 10658.66 KiB / **gzip 2218.85 KiB** (free limit 3072 KiB, 28% headroom; +1.51 KiB vs the earlier 2217.34).

Cleanup: preview tree, fake and sampler killed by PID; `.dev.vars` removed; ports 3100-3103/8787/54398 free; no env file in git status. Note: the `.next`/`.open-next` build on disk now has the fake Supabase URL baked into the client bundle (gitignored); `npm run test:e2e` rebuilds it.

## Fix round 3 (final)

Date 2026-10-19. Code frozen after fix round 3: recipient search by name or email (`kudos_search_sunners` SQL + fake mirror), no-result status row, "choose from the list" error, i18n. No app code or test touched by me. Scope contract: full unit + full E2E (shared fake changed, search RPC is safety-critical) + `write-kudo.spec.ts --repeat-each=3`; workerd/Worker size skipped (no dependency or upload-path change; last measured 2218.85 KiB gzip, 5 x 4.9 MB JPEG pass above).

| Gate | Result |
|---|---|
| Ports 3100-3103/8787/54398 before | no listeners |
| `npm run lint`, `npx tsc --noEmit` | 0 / 0 |
| `npm test` | 37 files, **499 passed**, 0 failed (22.4 s) |
| `npm run test:e2e` full | **173 passed**, 0 failed, 0 flaky, 0 skipped (5.3 m), 0 ECONNRESET |
| `write-kudo.spec.ts --repeat-each=3` | **189 passed** (63 x 3), 0 failed (5.4 m), 0 flaky, 0 ECONNRESET |
| Ports after | no listeners (only TIME_WAIT client sockets); Playwright's own webServers exited with the run |

Round-3 behaviors seen green in the full run: typing a full email, an email local part, an email in capitals with surrounding spaces, and an email fragment matching several Sunners all find and list Sunners by name; suggestions carry no email; a search with no match shows a status row (not an option) and Gửi stays disabled; text typed with no Sunner picked says to choose from the suggestions on leaving the field.

Notes: the `[WebServer] getClaims failed ... Invalid JWT signature` and `fake: injected failure boom-secret-detail` lines in the log are the expected output of the tampered-JWT and server-failure tests, not failures. The unit count did not change from round 2 (499); round-3 coverage is in E2E only, so the SQL `kudos_search_sunners` email branch is exercised through the fake's mirror, not real Postgres (the `supabase/verify` script is not run here).

## Final

Date 2026-10-19. Code frozen after: recipient-picker blur fix, Figma fidelity pass (classNames + Noto_Sans_JP in root layout), phase 07 "@ + tên" (`kudos_search_sunners` p_name_only/blank query, mention minQueryLength 0 + allowSpaces), mention exit when a spaced query finds nobody. No app code or test touched by me. Scope contract: full unit + full E2E (layout + shared fake + search RPC, safety-critical) + repeat-each=2 on `write-kudo` and `kudos-quick-actions` + Worker size; workerd 5 x 5 MB skipped (upload path unchanged).

| Gate | Result |
|---|---|
| Ports 3100-3103/8787/54398 before | no listeners |
| `npm run lint`, `npx tsc --noEmit` | 0 / 0 |
| `npm test` | 37 files, **501 passed**, 0 failed (9.7 s) |
| `npm run test:e2e` full | **183 passed**, 0 failed, 0 flaky, 0 skipped (3.5 m), 0 ECONNRESET |
| `write-kudo.spec.ts` + `kudos-quick-actions.spec.ts` `--repeat-each=2` | **176 passed** (88 x 2), 0 failed (4.0 m), 0 ECONNRESET |
| `npx opennextjs-cloudflare build` (normal `.env.local`, no fake, no `.dev.vars`) | exit 0 |
| `wrangler deploy --dry-run --outdir <scratch>` | Total Upload 10660.82 KiB / **gzip 2220.12 KiB** (limit 3072 KiB, 28% headroom; +1.27 KiB vs 2218.85) |
| Ports/workerd/env files after | no listeners, no workerd, no env or `.dev.vars` in git status |

Deltas vs fix round 3: unit 499 -> 501, E2E 173 -> 183 (+10 from phase 07 and the mention-exit case).

Notes: `[WebServer] getClaims failed ... Invalid JWT signature` lines are the expected output of the tampered-JWT test. The `.next`/`.open-next` on disk now come from the normal-env build (gitignored); `npm run test:e2e` rebuilds them. The SQL `p_name_only`/blank-query branch is exercised through the fake's mirror, not real Postgres (`supabase/verify` not run here). The root-layout font change is covered only by build + E2E rendering, not by a pixel/visual assertion in this run.

## Final-2

Date 2026-10-19. Code frozen after: `components/kudos-compose/kudo-mention-extension.ts` gives the Mention suggestion its own `PluginKey("kudoMention")` and calls `exitSuggestion(view, pluginKey)`; E2E case "an unmatched '@word' followed by more text..." (`write-kudo.spec.ts:380`) now also asserts the `kudos_search_sunners` count stops growing after the exit (was RED: expected 2, received 3). No app code or test touched by me. Scope contract: full unit + full E2E + `write-kudo.spec.ts --repeat-each=2` + Worker size; workerd 5 x 5 MB skipped (owner-accepted known risk, upload path unchanged).

| Gate | Result |
|---|---|
| Ports 3100-3103/8787/54398 before | no listeners |
| `npm run lint`, `npx tsc --noEmit` | 0 / 0 |
| `npm test` | 37 files, **501 passed**, 0 failed (14.6 s) |
| `npm run test:e2e` full | **183 passed**, 0 failed, 0 flaky, 0 skipped (4.4 m), 0 ECONNRESET; mention-exit case green |
| `write-kudo.spec.ts --repeat-each=2` | **146 passed** (73 x 2), 0 failed (4.2 m), 0 flaky, 0 ECONNRESET |
| `npx opennextjs-cloudflare build` (normal env, no `.dev.vars`) | exit 0 |
| `wrangler deploy --dry-run --outdir <scratch>` | Total Upload 10660.81 KiB / **gzip 2220.10 KiB** (limit 3072 KiB, 28% headroom; -0.02 KiB vs Final 2220.12) |
| Ports/workerd/env files after | no listeners, no workerd, no env or `.dev.vars` in git status |

Notes: Playwright's own webServers exit with the run, so I started no servers of my own. The `[WebServer] getClaims failed ... Invalid JWT signature` and `fake: injected failure boom-secret-detail` lines are expected output of the tampered-JWT and server-failure tests. The `.next`/`.open-next` on disk come from the normal-env build (gitignored). Not run: workerd 5 x 5 MB upload (accepted risk); real-Postgres `supabase/verify`.
