---
phase: 01
title: "E2E RED gate"
status: completed
owner: tester
test_policy: e2e-red-first
blocked_by: []
---

# Phase 01 - E2E RED gate

## Goal
One durable spec `tests/e2e/awards-information.spec.ts` from `test-cases.csv` + `clarifications.md` that FAILS now for the right reason (authed `/awards-information` renders the Next 404, so every content assertion fails) and is the exact gate for 04. Authenticated cases run on the AUTHED server (`E2E_AUTHED_URL`, port 3103, fake Supabase, helpers `signIn`/`openPage` copied from the style of `tests/e2e/homepage.spec.ts`; if copied twice, extract to `tests/e2e/support/authed-session.ts`). Anonymous case on the PAST server (`E2E_PAST_URL`).

## Owned files
- Create: `tests/e2e/awards-information.spec.ts` (<= 200 lines; split `awards-information-nav.spec.ts` if longer), optional `tests/e2e/support/authed-session.ts`, `reports/e2e-red-evidence.md` (under the plan dir).
- Edit: none. `playwright.config.ts` and the fake Supabase already serve this spec; do not touch them. Do not edit existing homepage specs.

## Selector contract (02, 03, 04 must match; repeat as header comment in the spec)
- Header `getByRole('banner')`, nav link `Awards Information` has `aria-current="page"`; the other two header links do not. Footer `getByRole('contentinfo')` present. Widget `getByTestId('widget-button')`.
- Hero `getByTestId('awards-keyvisual')` (img alt `Keyvisual Sun* Annual Award 2025`). Title block `getByTestId('awards-title')`: text `Sun* annual awards 2025` + `getByRole('heading', {level: 1, name: 'Hệ thống giải thưởng SAA 2025'})`.
- Nav `getByRole('navigation', {name: 'Danh mục giải thưởng'})` (testid `awards-nav`); 6 items `getByTestId('awards-nav-item')`, each an `<a href="#<slug>">`, in order with labels `Top Talent, Top Project, Top Project Leader, Best Manager, Signature 2025 - Creator, MVP`. Active item has `aria-current="true"` (exactly one at any time); inactive items have no `aria-current`.
- Cards `getByTestId('award-section')` x6, `id` = slug (`top-talent, top-project, top-project-leader, best-manager, signature-2025-creator, mvp`), each with h2 title, `getByTestId('award-image')` (img, rendered 336x336 at 1440), `award-quantity`, `award-prize` (Signature has two prize lines). Titles per Figma (MVP card title is `MVP (Most Valuable Person)`). Expected values: read the Figma node via MoMorph MCP; spec rows: Top Talent `10 Đơn vị` / `7.000.000 VNĐ`, Top Project `02 Tập thể` / `15.000.000 VNĐ`, Top Project Leader `03 Cá nhân` / `7.000.000 VNĐ`, Best Manager `01 Cá nhân` / `10.000.000 VNĐ`, Signature `01` / `5.000.000 VNĐ (cá nhân)` + `8.000.000 VNĐ (tập thể)`, MVP `01` / `15.000.000 VNĐ`. Figma wins on any mismatch (the CSV test case says "7tr"; assert the numeric part).
- Kudos `getByTestId('kudos-section')`: `Phong trào ghi nhận`, `Sun* Kudos`, link `Chi tiết` href `/sun-kudos`.
- 404 page (`app/not-found.tsx`): `getByRole('heading', {name: 'Không tìm thấy trang'})`, link `Về trang chủ` href `/`; HTTP status 404.

## Cases (E2E unless stated)
1. ID-1: anonymous (past server) `/awards-information` -> `/login`.
2. ID-0: authed `/awards-information` shows h1 title. ID-2: authed from `/`, click header `Awards Information` -> URL `/awards-information` AND h1 visible (content assertion, otherwise it is green today).
3. ID-3: regions order top-to-bottom at 1440: banner, keyvisual, title, nav (left of cards: nav right edge <= first card left edge), cards, kudos, footer. At 375: chip bar above cards.
4. ID-4 title texts; ID-5 six nav labels in order; ID-6 all six cards with title/quantity/prize; ID-7 each `award-image` box 336x336 at 1440; ID-8 kudos texts + `Chi tiết`.
5. ID-9: click each nav item -> expect.poll `aria-current` on that item only and its section top within the viewport top band (below sticky bars) and `location.hash === #slug`. ID-11: Top Talent -> MVP, only MVP active. Scroll-spy: scroll to a card via `evaluate` -> matching item becomes active. Landing on `/awards-information#best-manager` (as from Homepage) -> section in view + item active. Under `reducedMotion: 'reduce'` click still lands (instant).
6. ID-13: `/awards-information#nope`, then `location.hash = '#nope'` via evaluate: no `pageerror`, `scrollY` stays 0, first item active.
7. ID-12/14: click kudos `Chi tiết` -> URL `/sun-kudos`, response 404, 404 page heading + `Về trang chủ` link; clicking it returns `/`.
8. Mobile 375: nav is a horizontally scrollable bar (`scrollWidth > clientWidth`), still sticky (box top stays within the first 100px after scrolling 1000px), cards stack (image above content).
9. Not E2E: ID-10 hover (visual check in 04).

## Steps / Success
1. Check ports (`netstat -ano | findstr "3100 3101 3102 3103 54398"`); run `npm run test:e2e -- tests/e2e/awards-information.spec.ts`.
2. RED = real assertion failures on the missing page content, not startup, port, or fake-server errors; read the first failure. ID-1 may already pass (default-deny) - fine. Record `redTestFiles`, `redCommand`, `redExitCode`, `redFailure` in `reports/e2e-red-evidence.md`; kill servers you started.
3. `npx tsc --noEmit` + `npm run lint` pass; existing specs untouched and still pass.

## Risks
| Risk | L/I | Counter |
|------|-----|---------|
| Scroll assertions flaky (smooth scroll) | M/M | `expect.poll`, bounding boxes with tolerance, never fixed sleeps; demote to visual check if unfixable |
| RED for wrong reason (stale server) | M/H | netstat before run; inspect first failure |
| Spec weakened to go green in 04 | M/H | 04 reruns the same command; edits only for selector bugs, logged |

## MoMorph refs:
- Hệ thống giải: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/zFYDgyj_pD
- Clarifications: plans/261013-1554-awards-information/clarifications.md
- testPolicy: e2e-red-first

## Completion notes (2026-10-13)
- Done: spec files + `support/{authed-session,awards-contract}.ts` written. RED exit 1, 23/24 failed on missing content; ID-1 green via default-deny (expected).
- Evidence: `reports/e2e-red-evidence.md`.
