---
title: "Homepage SAA 2025 (login-protected, Figma-exact)"
description: "SAA 2025 Homepage (MoMorph i87tDx10uM): proxy login protection, Sign out action, countdown reuse, Figma-exact UI, E2E red-first."
status: completed
priority: P1
effort: 4h
branch: main
tags: [feature, ui, momorph, auth]
blockedBy: []
blocks: []
created: 2026-10-12
work_type: feature
test_policy: e2e-red-first
spec_waived: "SDD mode disabled (takumi.sddMode: off)"
---

# Homepage SAA

MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM (fileKey `9ypp4enmFmdK3YAFJLIu6C`, screenId `i87tDx10uM`).
Inputs: `clarifications.md` (authoritative), `plans/momorph-specs/homepage-saa-i87tDx10uM/{specs,test-cases}.csv`.
**Commit order:** the uncommitted user-profiles plan (261012-1330) is committed BEFORE this plan's work starts.

## Phases

| # | Phase | Owner | Effort | Blocked by | Status |
|---|-------|-------|--------|-----------|--------|
| 01 | [E2E RED gate (+ fake-Supabase auth fixture)](phase-01-e2e-red-gate.md) | tester | 1h | - | completed |
| 02 | [Track A: Homepage UI](phase-02-track-a-homepage-ui.md) | momorph-ui-implementer | 1.25h | 01 | completed |
| 03 | [Track B: protection, sign-out, routes, countdown logic](phase-03-track-b-auth-routes-countdown.md) | implementer | 0.75h | 01 | completed |
| 04 | [Integration + GREEN + live check](phase-04-integration-green-live-check.md) | implementer + tester + user | 1h | 02, 03 | completed (live check user-confirmed 2026-10-13) |
| 05 | [Countdown targets AWARDS_CEREMONY_AT](phase-05-awards-ceremony-env.md) | implementer + tester | - | 04 | completed |
| 06 | [Public homepage per spec (guest header, login link)](phase-06-public-homepage.md) | tester + implementer + momorph-ui-implementer | - | 05 | completed (implementation 2026-10-13; committed in `0d296b8` "make homepage public with session-aware header", issue #5) |

Order: `01 -> (02 || 03) -> 04`. 02 and 03 own disjoint files. Soft dep: 02's final wiring imports `lib/navigation/routes.ts`, which is 03's step 1 (names fixed in phase 03), so run 03 first or in parallel.

## Key decisions

- **Default-deny in `resolveAuthRedirect`** (pure, unit-tested): unauthenticated + path not in `PUBLIC_PATHS` -> `/login`. Public = exact `/login`, `/auth/callback`, `/countdown` (pre-launch gate target must stay reachable; the gate already ran first), and exact `/` (added in phase 06: public homepage, guest header shows "Đăng nhập"). Static assets are already outside the proxy matcher. `proxy.ts` keeps its order (gate -> `getClaims()` -> auth redirect) and needs no edit. Never `getSession()` (verified: no call in app/lib/components).
- **Countdown target = `AWARDS_CEREMONY_AT`** (server-only env; supersedes `EVENT_START_AT` per clarifications 2026-10-13). Missing/invalid → `00` + hidden "Coming soon", logged. Prelaunch gate still uses `EVENT_START_AT`.
- **Homepage cannot reuse `CountdownTimer`** (it `router.replace("/login")` on completion). Reuse `splitRemainingTime` + `server-clock-offset` + (if Figma matches) `CountdownUnit`; the ticking leaf is new (04).
- **Sign out = server action**, `scope: "local"`, redirect outside try/catch, details only in `console.error`. Form is a server component (no client JS).
- **Authed-UI E2E without weakening prod**: a test-only fake Supabase (tests/e2e/support) serves JWKS + `/auth/v1/user|logout` and mints an ES256 session cookie for a 4th "authed" server (past `EVENT_START_AT`, Supabase URL -> the fake). Prod code is unchanged; real projects verify against their own JWKS. Spike-gated in 01 with an honest fallback (see phase 01).
- **Language selector** moves to `components/ui/` (second use); UI only, no switching (ID-25/26 deferred).
- Destination pages (/awards-information, /sun-kudos, /tieu-chuan-chung, /profile) are other plans: 404 until built; tests assert URL only.

## Test matrix (summary; detail in phase 01)

Unit (03/05): auth redirect table, route helpers, `getHomeCountdown`, `getAwardsCeremonyAt` (ID-39/40/41/42/56/57/60). E2E past + authed server (01/04/05): protection, ID-1..4, 6..13, 14..24, 27, 29..36, 38, 43..45, 47..53, 55, 58 (ID-12/13/43 via `AWARDS_CEREMONY_AT`). Visual check (04): ID-23/46 hover, 1440/375 frame diff. Deferred: ID-0 (superseded), 5/28/37 (no roles/notifications), 25/26 (i18n plan), 54 (widget quick-action menu: now delivered by `plans/261019-1022-write-kudos`, in-review; E2E `kudos-quick-actions.spec.ts` 15/15), 59 (destinations 404 by design).
Cross-ref: homepage test cases ID-25/26 (language switch) are delivered by `plans/261014-1115-multi-language-vi-en` (in-progress, commit pending).

## Verification commands (every code phase)

`npm run lint` · `npx tsc --noEmit` · `npm test` · `npm run build` · `npm run test:e2e -- tests/e2e/homepage.spec.ts`. Safety-critical (proxy/auth/session): run full `npm test` + full `npm run test:e2e` in 03 and 04.

## Rollback

Revert the phase commit(s). No DB/schema change. New server-only env `AWARDS_CEREMONY_AT` (phase 05): **user must set it in `.env.local` and production vars** before the live check; unset → countdown shows 00, hidden, `/` still renders. Revert 03 alone re-opens `/` to anonymous users (placeholder page). Phase 06 changes the `/` rule: `/` is now public by design, so reverting phase 06 alone restores login-redirect for guests on `/` (the signed-in header is unaffected). Phase 06 is not committed yet; its revert set is the phase-06 commit(s) once committed.

## Open questions

1. `/profile` is the assumed Profile link target (no profile page plan yet): OK to 404 until built? **Resolved:** defaults applied (404 until profile plan ships); user may override.
2. Sign out `scope: "local"` (this browser) vs `"global"` (all devices): plan picks local. **Resolved:** scope local confirmed.
3. Footer copyright: Figma/spec text is "vè" (typo) vs Login's "về": copy Figma verbatim as clarified; fix upstream later? **Resolved:** "về" per Figma; upstream typo noted.
4. If the 01 spike fails, authed-only UI (ID-1..4, 6.., 27, 36) relies on unit + visual + live check only. **Resolved:** spike passed; full E2E with fake-Supabase fixture delivered.

## Follow-ups (deferred findings from review)

**SEALED 8.6 (phases 01-04); phase 05 SEALED 8.7. No critical/high findings.**

- **Scroll-to-top E2E timeout (20s):** ~6s headless main-thread long task; revisit after hero image fix. Do not weaken the assertion.
- **Unit coverage:** two extra cases for `getAwardsCeremonyAt` / `parseIsoWithOffset` (phase 05 review).
- **Proxy auth-server exclusion:** verify unanchored route matcher does not accidentally exclude auth paths; document scope.
- **Data pages re-verification:** `/awards-information`, `/sun-kudos`, `/profile`, `/tieu-chuan-chung` must re-verify auth server-side before serving data (not blocking; applies to their own plans).
- **Award card accessible name:** one card has duplicate accessible name via image + heading; audit when award imagery finalized.
- **SVG in `next/image`:** countdown SVG assets need `sizes` attribute for LCP compliance.
- **Widget button no-op:** button in footer sends no request and has no state change; verify interaction design matches intent or add hover feedback.
- **Cloudflare images binding at deploy:** hero is now WebP (315 KB, was 4.4 MB PNG); check the image binding for the remaining images before production deploy.
- **Resolved 2026-10-13:** widget button stays `bottom-6` (user); shared `CountdownUnit` aligned to Figma via CSS vars, `/countdown` unchanged (measured, e2e 62/62 x2).
- **Polish pass 2026-10-13 (phase 04):** 0 typography/colour deltas on 78 probes; 8 layout/asset deltas fixed; 8 Low left (see `reports/polish-audit.md`). Tests: e2e 62/62 (repeat x2).
- **Phase 06 (review SEALED 9, 0 critical), deferred Low, 2026-10-13:**
  - Signed-in header layout shift when the Suspense fallback resolves (owner: momorph-ui-implementer; fix: reserve the signed-in control width in the placeholder).
  - Invalid token is logged twice (proxy + RSC) (owner: implementer; fix: log once or downgrade one).
  - `claims.sub` (header) vs proxy any-claims check: align the identity check (owner: implementer).
  - Phase 06 file status: reconciled in the phase file (owner: controller, done).
  - No 375px guest E2E case (owner: tester; add one case to `tests/e2e/homepage-guest.spec.ts`).
- **Phase 06 blocker:** human sign-off on the auth change (riskGate) and the commit. Owner: hoang.van.huu. Done = sign-off recorded, then the commit lands on `main`.
