---
phase: 01
title: "E2E RED gate (+ fake-Supabase auth fixture)"
status: completed
owner: tester
test_policy: e2e-red-first
blocked_by: []
---

# Phase 01 - E2E RED gate

## Goal
One durable spec `tests/e2e/homepage.spec.ts` (from `test-cases.csv` + clarifications) that FAILS now for the right reason (`/` is the create-next-app placeholder; anonymous `/` is not redirected), then is the exact gate for 04. Anonymous cases run on the PAST server (`E2E_PAST_URL`); authenticated cases on the AUTHED server (`E2E_AUTHED_URL`, port 3103, past `EVENT_START_AT`).

## Owned files
- Create: `tests/e2e/homepage.spec.ts` (<= 200 lines; split a second spec file `homepage-account-menu.spec.ts` if longer), `tests/e2e/support/fake-supabase-server.mjs` (<= 120 lines), `reports/e2e-red-evidence.md`
- Edit: `playwright.config.ts` only: add webServer for the fake (`node tests/e2e/support/fake-supabase-server.mjs`, health `http://127.0.0.1:54398/health`), a 4th app server `authed` (port 3103, `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54398`, publishable key fake, past `EVENT_START_AT`), export `E2E_AUTHED_URL`, `E2E_FAKE_SUPABASE_URL`. Existing 3 servers and their unreachable `:54399` stay untouched.

## Auth fixture: how authenticated-only UI gets E2E coverage
Prod code is NOT changed (no bypass flag, no preview route, no env switch). The fake is test infrastructure under `tests/` that plays the Supabase project the authed server points at:
- Generates an ES256 keypair at start (`node:crypto`, no new dependency). Serves `GET /auth/v1/.well-known/jwks.json` (public JWK + `kid`), `GET /auth/v1/user` (200 user), `POST /auth/v1/logout` (204, records the call), `GET /health`.
- `GET /__mint` returns `{name, value}`: cookie `sb-127-auth-token` (name = `sb-${hostname.split('.')[0]}-auth-token`), value `base64-` + base64url(session JSON: ES256-signed access_token with `sub`, `email: e2e@sun-asterisk.com`, `aud: authenticated`, `role: authenticated`, `exp` +1h; dummy refresh_token; `expires_at`; `user`). Must stay under one cookie chunk (< 3180 chars): assert it.
- Spec: `context.addCookies([...])` then `page.goto(E2E_AUTHED_URL + '/')`. Real `getClaims()` runs in the real proxy and verifies the signature against the fake's JWKS. A cookie signed with any other key stays unauthenticated (add one negative case: forged-key cookie -> `/login`; this proves the fixture does not weaken verification).
- **Spike first (<= 15 min):** with a trivial page assertion prove proxy accepts the minted cookie (authed `/login` -> `/` redirect is the probe; works today). If `getClaims()` rejects the fake token and the cause is not fixable in the fake, STOP, drop the authed server, and record in `reports/e2e-red-evidence.md` that authed cases are NOT E2E (covered by unit + visual check + live checklist). Do not fall back to any prod-side bypass.

## Selector contract (02, 03, 04 must match; repeat as header comment in the spec)
- Header `getByRole('banner')` (sticky); logo link `getByRole('link', {name: 'Sun* Annual Awards 2025'})` href `/` (also once inside `getByRole('contentinfo')`).
- Nav inside banner: links `About SAA 2025` (href `/`, `aria-current="page"` when active), `Awards Information` (`/awards-information`), `Sun* Kudos` (`/sun-kudos`).
- Bell `getByTestId('notification-button')` (button, `aria-expanded`); panel `getByTestId('notification-panel')` text "Chưa có thông báo"; `getByTestId('notification-badge')` must never exist.
- Language: `getByTestId('language-selector')` + listbox/options VN, EN (unchanged from Login contract).
- Account `getByTestId('account-menu-button')` (`aria-haspopup="menu"`, `aria-expanded`); menu `getByRole('menu')`; `menuitem` "Profile" (href `/profile`), `menuitem` "Sign out" (submit button in a form); no "Admin Dashboard".
- Hero `getByTestId('hero-key-visual')`, `getByRole('heading', {level: 1, name: 'ROOT FURTHER'})`, `getByText('Coming soon')` (absent after start), `getByTestId('countdown-days|hours|minutes')` (textContent exactly 2 digits; labels DAYS/HOURS/MINUTES visible), event info texts verbatim from Figma (`Thời gian:`, `18h30`, `Địa điểm:`, `Nhà hát nghệ thuật quân đội`, `Tường thuật trực tiếp tại Group Facebook Sun* Family`).
- CTA links `getByRole('link', {name: 'ABOUT AWARDS'})` -> `/awards-information`, `ABOUT KUDOS` -> `/sun-kudos`.
- `getByTestId('root-further-content')`; `getByTestId('awards-section')` with heading "Hệ thống giải thưởng"; `getByTestId('award-card')` x6, each ONE anchor (`href="/awards-information#<slug>"`, slugs `top-talent, top-project, top-project-leader, best-manager, signature-2025-creator, mvp`) containing `img`, heading (title) and text "Chi tiết".
- `getByTestId('kudos-section')` with link "Chi tiết" -> `/sun-kudos`; `getByTestId('widget-button')` (button, fixed bottom-right).
- Footer `getByRole('contentinfo')`: logo link, links About SAA 2025 / Awards Information / Sun* Kudos / Tiêu chuẩn chung (`/tieu-chuan-chung`), copyright text verbatim from Figma (spec shows "Bản quyền thuộc vè Sun* © 2025").

## Cases (E2E unless stated)
1. Anonymous (past server): `/` -> `/login` (ID-0 superseded; header comment says so); `/does-not-exist` -> `/login`; `/login`, `/auth/callback?error=x` stay reachable; forged-key cookie -> `/login`.
2. Authed `/login` -> `/` (new, replaces a live-check item).
3. Authed `/` renders regions in order at 1440 and 375 (ID-1, 7, 8, 14, 17); logo alt; active nav `aria-current` (ID-9); language VN (ID-10); bell visible, no badge (ID-11, 29); countdown 3 units 2-digit + labels (ID-12) and, at launched state, `00` x3 + no "Coming soon" (ID-41, 42).
4. Navigation: logo/footer logo/About SAA from scrolled position -> `/`, scrollY 0 (ID-2..4, 18..20); header Awards/Kudos, CTA x2, kudos Chi tiết, footer links -> expected URLs (ID-21, 22, 44, 45, 53, 55; URL only, destinations 404).
5. Award cards: 3 columns at 1440, 2 columns at 768 and 375 via bounding boxes (ID-15, 16); click image, title, Chi tiết for each of 6 -> `/awards-information#<slug>` (ID-47..50, 52).
6. Menus: bell opens panel (ID-27); account menu toggle/outside-click/Esc/Enter/Space (ID-30..35), items Profile + Sign out only (ID-36, 38, 6); language options VN/EN only (ID-24, 58).
7. Sign out: click "Sign out" -> `/login`; fake saw `POST /auth/v1/logout`; revisit `/` -> `/login` (cookie cleared).
8. Hover (ID-23, 46, 51): assert style differs from baseline; if flaky demote to visual check in 04.

## Not E2E (state in spec header, honestly)
- Unit-only (03): ID-13, 43 (before start), ID-39 (minute decrement), ID-40 (leading zero), ID-60 (invalid env -> 00, no crash), ID-56/57 (existing `getEventStartAt` tests).
- Deferred with reason: ID-0 superseded by login-required; ID-5/37 no roles; ID-28 no notifications table; ID-25/26 real i18n is its own plan; ID-54 widget menu belongs to the floating-action-button plan; ID-59 destination pages 404 by design (E2E only asserts every `a[href]` is a known route constant); ID-62 not reachable (slugs are compile-time constants).

## Steps / Success
1. Write fake + config edit + spec; `npm run test:e2e -- tests/e2e/homepage.spec.ts`.
2. RED = real assertion failures from the placeholder page / missing redirect, not config, startup, or fake-server errors. Read the first failure message. Record `redTestFiles`, `redCommand`, `redExitCode`, `redFailure` in `reports/e2e-red-evidence.md`.
3. `npx tsc --noEmit`, `npm run lint` pass; existing `login.spec.ts` and `countdown-prelaunch-gate.spec.ts` still pass (config edit must not break them).

## Risks
| Risk | L/I | Counter |
|------|-----|---------|
| `getClaims()` rejects the fake token (alg/kid/JWKS path) | M/M | 15-min spike with fallback above; never touch prod code |
| RED for the wrong reason (fake fails to start, port clash) | M/H | health check on both servers; inspect first failure before logging |
| Fake weakens prod trust | L/H | lives only in `tests/`, bound to 127.0.0.1, only the authed server's env points at it; forged-key negative case |
| Layout/hover assertions flaky | M/L | compare against baseline, bounding boxes not pixels; demote to visual check |
| Spec rewritten to turn green | M/H | 04 reruns the SAME command; edits only for selector-contract bugs, logged |

## MoMorph refs:
- Homepage SAA: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM
- Clarifications: plans/261012-1549-homepage-saa/clarifications.md
- testPolicy: e2e-red-first
