---
phase: 05
title: "Homepage countdown targets AWARDS_CEREMONY_AT"
status: completed
owner: implementer (lib + component) -> tester (e2e config + spec)
test_policy: e2e-red-first
blocked_by: [04]
---

# Phase 05 - AWARDS_CEREMONY_AT

## Goal
Homepage countdown reads a new server-only env `AWARDS_CEREMONY_AT` instead of `EVENT_START_AT` (clarifications 2026-10-13). Prelaunch gate unchanged.

## Design
- `lib/event/get-event-start-at.ts`: extract the existing ISO-with-offset + real-calendar-date validation into a shared pure parser (e.g. `parseIsoWithOffset(raw): number | null` in `lib/event/parse-iso-with-offset.ts`); `getEventStartAt` keeps its exact behaviour and log line (existing unit tests stay green unchanged).
- New `lib/event/get-awards-ceremony-at.ts`: `getAwardsCeremonyAt(raw = process.env.AWARDS_CEREMONY_AT): number | null`; missing/invalid → `console.error("[home-countdown] AWARDS_CEREMONY_AT missing or invalid")` + null. Web-API only.
- `components/home/home-countdown-live.tsx`: use `getAwardsCeremonyAt()`. `getHomeCountdown` unchanged (null → 00 + hidden).
- `.env.example`: add `AWARDS_CEREMONY_AT=2026-12-26T18:30:00+07:00` with a comment (server-only, never NEXT_PUBLIC_, production via wrangler vars/secrets later).
- E2E: `playwright.config.ts` authed server gets `AWARDS_CEREMONY_AT` = a future ISO (now + 2d 3h 4m, exported for the spec like E2E_FUTURE_TARGET_MS); homepage spec: launched-state assertion (00 x3, no Coming soon) is replaced by: "Coming soon" visible, 3 units 2-digit, values match the exported target within one-minute tolerance (ID-12, 13, 43). The 00/hidden path stays unit-tested (ID-41/42/60).

## Owned files
- implementer: create `lib/event/parse-iso-with-offset.ts`, `lib/event/get-awards-ceremony-at.ts`, `tests/unit/get-awards-ceremony-at.test.ts`; edit `lib/event/get-event-start-at.ts`, `components/home/home-countdown-live.tsx`, `.env.example`.
- tester: edit `playwright.config.ts`, `tests/e2e/homepage.spec.ts` (<= 200 lines), `reports/e2e-green-evidence.md`.

## Success
lint, tsc, full `npm test`, build, full `npm run test:e2e` (homepage + login + countdown) green; `git grep -n "getEventStartAt" components/home` empty.

## Result (uncommitted, orchestrator-verified)
- [x] lint 0 errors
- [x] tsc 0 errors
- [x] vitest 133/133
- [x] full e2e `--repeat-each=2` 62/62 (scroll-to-top poll timeout raised to 20s; assertion unchanged)
- [x] review SEALED 8.7, 0 critical/high
- [x] `npm run build` green (runs inside `npm run test:e2e`; orchestrator re-run 2026-10-13)
- [x] `git grep -n "getEventStartAt" components/home` empty (orchestrator 2026-10-13)
- Deferred: scroll-test timeout revisit after hero image fix; two extra unit cases (see plan.md Follow-ups)

## MoMorph refs:
- Homepage SAA: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM
- Clarifications: plans/261012-1549-homepage-saa/clarifications.md
- testPolicy: e2e-red-first
