# Clarifications — Homepage SAA

MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM (fileKey `9ypp4enmFmdK3YAFJLIu6C`, screenId `i87tDx10uM`, Figma node 2167:9026)
Specs: plans/momorph-specs/homepage-saa-i87tDx10uM/specs.csv (47 rows) · Test cases: plans/momorph-specs/homepage-saa-i87tDx10uM/test-cases.csv (62 cases)

## Session 2026-10-12

- Q: Countdown target on Homepage (Homepage is only reachable after EVENT_START_AT because proxy gates every route to /countdown before launch)? Options: separate AWARDS_CEREMONY_AT env / reuse EVENT_START_AT. → A: Reuse EVENT_START_AT. Consequence accepted: in production the Homepage countdown always shows 00 and "Coming soon" is hidden; E2E can only exercise the past/launched state (ID-41/42); before-event visibility (ID-13/43) and auto-decrement (ID-39) are proven by unit tests on the shared countdown logic, not E2E.
- Q: Unauthenticated access to Homepage (test ID-0 says public; Login plan said Homepage adds protection)? → A: Require login — unauthenticated → /login (proxy rule using the existing getClaims result). ID-0 superseded (documented in the E2E spec header).
- Q: Notifications (bell/panel/badge) and account menu (Profile / Sign out / Admin Dashboard by role) scope — no notifications table, no roles? → A: Real Sign out (server action) + Profile link; bell button with empty panel ("Chưa có thông báo"), no badge; Admin Dashboard hidden until roles exist. ID-5, ID-28, ID-37 deferred; ID-29 (no badge) holds.
- Q: Routes for not-yet-built destination pages? → A: /awards-information, /sun-kudos, /tieu-chuan-chung, centralised in one constants file. Award cards link to /awards-information#<slug> (top-talent, top-project, top-project-leader, best-manager, signature-2025-creator, mvp). Destination pages are separate plans (404 until built).

## Defaults chosen by orchestrator (override if wrong)

- Language selector VN/EN: UI + dropdown only (same decision as Login plan); real switching belongs to the separate "Đa ngôn ngữ" item → ID-25/26 deferred. Reuse/extract the Login `LanguageSelector` (second use → `components/ui/` per CLAUDE.md YAGNI rule).
- Widget button (floating, bottom-right): render the button; its quick-action menu belongs to the floating-action-button screens plan → ID-54 deferred to that plan.
- Header "About SAA 2025" is the Homepage itself: active state on `/`, click scrolls to top. Logo (header + footer) → `/` and scroll to top.
- All copy (award descriptions — spec rows are empty for 5 of 6 cards — event info, Root Further text, footer copyright incl. the spec's "vè" typo) is taken verbatim from the Figma node tree, never from spec prose.
- Countdown reuses lib/countdown + lib/event (minute-level updates, 2-digit padding, 00 at/after start, invalid env → fallback 00 + server log, no crash — ID-60).
- Test policy: e2e-red-first (behavioral interactions: navigation, menus, sign out, protection).

## Session 2026-10-13

- Q: Homepage countdown env — revisit "reuse EVENT_START_AT"? → A: User corrected the decision: use a NEW server-only env `AWARDS_CEREMONY_AT` (ISO-8601 with explicit offset, same format rules as EVENT_START_AT). EVENT_START_AT keeps gating prelaunch only. SUPERSEDES the 2026-10-12 countdown answer. Missing/invalid → server log + 00/00/00 and "Coming soon" hidden (ID-60), never crash. With a future ceremony date the Homepage now shows a live countdown and "Coming soon" (ID-12/13/39/43 become reachable in E2E on the authed server).

## Session 2026-10-13 (after polish audit)

- Q: Keep typo corrections "Awards Information" / "Coming soon" or use Figma's "Award Information" / "Comming soon"? → A: Keep the corrected spelling.
- Q: Widget button: bottom-6 (24px) or flush with the viewport bottom like Figma? → A: Keep 24px (bottom-6). No change.
- Q: Align the shared countdown component with the Homepage Figma (unit 116px vs 116.67px; digit backdrop blur 16.64px vs fixed 25px)? → A: Yes, adjust the shared component — on condition that /countdown (screen 8PJQswPZmU) stays pixel-identical to its own Figma.

## Session 2026-10-13 (public homepage per spec)

- Q: Must Homepage require login? Spec test ID-0 says an unauthenticated user sees the homepage with all public content; bell/account menu are logged-in only (ID-1, 11, 27-29, 36-38). → A: Follow the spec. SUPERSEDES the 2026-10-12 "Require login" answer. `/` becomes public (added to PUBLIC_PATHS); every other non-public path stays default-deny.
- Q: What does a guest see at the header's right side (no Figma design)? → A: Language selector + a "Đăng nhập" button linking to /login. Signed-in users keep bell + account menu (no login button).
- Q: Tests? → A: ID-0 becomes "guest sees /" (E2E); add guest-header cases; countdown spec test-8 updated back to the new contract (anonymous `/` is not redirected on the invalid-date server).
