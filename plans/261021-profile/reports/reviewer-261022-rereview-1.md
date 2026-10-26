## Re-Review: fix round 1

### Findings Under Verification
- addressed Medium components/profile/profile-page-layout.tsx:11-44 — band + ALERT_CARD extracted — components/kudos/kudos-kv-backdrop.tsx:24-50 (KudosKvBackdrop cover/dimmed/preload) and :53 (KUDOS_PAGE_ALERT_CARD); consumed by kudos-kv-banner.tsx:16 (preload), kudo-detail-layout.tsx:27 (dimmed, alert card :40), profile-page-layout.tsx:22,41. Board classes, sizes="100vw", object-position, 957px Cover and 25deg gradient identical to removed copies.
- carried unchanged Low x5 (Defer x4, Reject x1).

### Verdict Entries Under Verification
- resolved unproven (entry 1) — tester-261022-visual.md matches table + Round 1 re-capture PASS, owner decisions in clarifications.md, raw-temper-runs.json final lint 0 / tsc 0 / vitest 826 / E2E 298 / gzip 2259 KiB. Moved to acceptanceCovered under criterion 6.
- resolved unproven (entry 2) — clarifications.md Session 2026-10-22: 14/14 PASS on the real project. The three supabase/ files are untracked, no tracked supabase file changed (git diff main --stat empty); file mtimes 16:12-16:15 predate the clarifications entry 19:02, so the verified SQL is the reviewed SQL.

### New Findings From The Fix Diff
None. Notes (no finding): tooltip change additive (TIP_ALIGN start/end = left-0/right-0, TIP_ANCHOR relative, kudo-person.tsx:15-22); Stars accepts "page" but does not apply TIP_ANCHOR, unused today; spacious default false (kudos-stats-panel.tsx:61); pencil is_mine correct on board and profile (kudo-post-card.tsx:75), E2E RED then GREEN per raw-temper-runs.

### Assessment
Ready. No open findings, refuted, unproven or regressions. riskGate unchanged: signoffRequired true, humanSignedOff false (human sign-off still pending).

```json
{
  "score": 9,
  "criticalCount": 0,
  "decision": "SEALED",
  "acceptanceCovered": [
    "a guest opening /profile or /profile/<id> is sent to /login and sees no profile data — proxy default-deny (lib/auth/resolve-auth-redirect.ts:19, /profile not in PUBLIC_PATHS); E2E 'guest on /profile or /profile/<id> lands on /login with no next, and no profile renders' passes",
    "/profile shows the signed-in Sunner's avatar, name, department, Hero badge and stars, six grey icon slots under 'Bộ sưu tập icon của tôi', the statistics card with the Secret Box button, and the KUDOS section with Received selected — profile-view.tsx:42-71, profile-hero.tsx, profile-icons.tsx, KudosStatsPanel reuse; E2E 'Profile: my own page' hero/icons/statistics/KUDOS cases pass (against the fake RPCs)",
    "/profile/<id> shows that Sunner's hero, the 'Bộ sưu tập icon của {tên}' heading, a write-Kudo bar that opens Write Kudo with that Sunner pre-selected, and the static 'Đã nhận: N Kudos' count; their sent count and sent Kudos never appear — self=false renders a static count, no dropdown, no kudos_my_stats call (profile-kudos-section.tsx:85-95, get-profile-page-data.ts:55-60); prefill path provider->dialog->form->hook->picker reviewed; E2E write-bar and 'Đã gửi is nowhere' cases pass in VI and EN; the server-side backstop (RPC sent = 0 rows for others) is correct on reading but proven on real Postgres only by the verify run",
    "/profile/<own id> lands on the self view; a malformed or unknown id returns HTTP 404 — z.guid() before any query, case-insensitive redirect_self, notFound() before render ([id]/page.tsx:33-35); E2E redirect, unknown-guid 404 and 5 malformed-id 404 cases pass; unit test covers the upper-case own id",
    "switching Received/Sent loads page 1 of that list, infinite scroll loads further pages without duplicates, each direction has its own empty message, and hearts, hashtags and Copy Link behave as on the board — cursor:null first page per switch with request-counter race guard (profile-kudos-section.tsx:58-71), KudosFeedList keyed by direction with id dedupe, emptySent vs board empty; E2E switch, re-pick, infinite scroll 13 in order, empty lines VI/EN, card links, Copy Link and heart cases pass against the fake; real keyset proven only by verify R2",
    "the page matches the Figma export at 1440 wide and has no horizontal scroll at 375; every string switches between VI and EN; the existing unit and E2E suites stay green — visual report tester-261022-visual.md: 1440 hero/icons/write bar/card within 1px; round 1 re-capture PASS (M1 tooltip x35.5-339.5 at 375, M4 6deg band, M5 64px trigger, D1 padding 40/24); no horizontal scroll at 375 on own/other/busy; owner accepted other-face band, own-only pencil and end-of-feed line (clarifications.md Session 2026-10-22); VI/EN via typed Dictionary + E2E; final suites lint 0, tsc 0, vitest 826/826, full E2E 298/298, Worker gzip 2259 KiB (raw-temper-runs.json)"
  ],
  "regressionChecked": [
    "openComposer(options?) callers: board pill kudos-compose-trigger.tsx:25 wraps to openComposer(); widget-button.tsx:80-83 calls onWriteKudo() with no args; rules dialog kudos-composer-provider.tsx:85 wraps; guest redirect kudos-composer-provider.tsx:71-73 runs before setInitialRecipient; getInitialRecipient rejects events/non-objects",
    "WriteKudoDialog/Form/useWriteKudoForm/RecipientPicker: new props optional with null/'' defaults, form mounted per open so no stale prefill",
    "KudosFeedList loadMore type widened to KudosFeedLoadMore; board still passes loadMoreKudos (tsc 0)",
    "kudo-person.tsx HeroTitle/Stars exported, align union widened with center; board cards still pass start/end (kudo-post-card.tsx:51-54, kudo-highlight-card.tsx, kudo-detail-card.tsx)",
    "readBlock exported from get-kudos-board-data.ts with unchanged behaviour",
    "Dictionary type gains profile; en typed so missing keys fail tsc (tsc 0)",
    "shared E2E fixtures: kudos-fixtures.mjs only adds exports; applyKudoHearts list adds kudos_profile_feed; fake server routes profileRpc before board RPCs; full E2E 297/297",
    "SQL: no change to existing functions, tables, grants or indexes; rollback drops exactly the two new functions",
    "fix round 1: KudosKvBackdrop board cover/preload/sizes/classes identical to the removed inline copies (kudos-kv-banner preload, kudo-detail-layout dimmed overlay); HeroTitle start/end keep relative + left-0/right-0; KudosStatsPanel spacious defaults false so board classes unchanged; KudoPostCard pencil gated on kudo.is_mine (true for the real sender of an anonymous Kudo)"
  ],
  "contractStatus": "CHANGED",
  "refuted": [],
  "unproven": [],
  "reachableRegressions": [],
  "findings": [
    {
      "severity": "Medium",
      "category": "Maintainability",
      "location": "components/profile/profile-page-layout.tsx:11-44",
      "summary": "addressed — Third copy of the Kudos key-visual band (also kudos-kv-banner.tsx, kudo-detail-layout.tsx) and second verbatim copy of ALERT_CARD; extract KudosKvBackdrop({ dimmed, preload }) + shared ALERT_CARD per the CLAUDE.md reuse rule",
      "disposition": "Accept"
    },
    {
      "severity": "Low",
      "category": "Performance",
      "location": "supabase/migrations/20261022100000_create_profile_rpcs.sql:63-88",
      "summary": "Profile feed filters on single-column recipient/sender indexes then sorts all of that person's rows; composite (recipient_id|sender_id, created_at desc, id desc) indexes would make keyset pages range scans if volume grows",
      "disposition": "Defer"
    },
    {
      "severity": "Low",
      "category": "Verification",
      "location": "supabase/verify/20261022100000_create_profile_rpcs_verify.sql:96",
      "summary": "P1 checks profile_card contains is_allowed_account but not that it precedes kudos_person_json (P2 checks ordering for the feed)",
      "disposition": "Defer"
    },
    {
      "severity": "Low",
      "category": "Accessibility",
      "location": "components/profile/profile-direction-dropdown.tsx:48",
      "summary": "Listbox stays open when Tab moves focus out (useDismissable handles only outside pointerdown and Escape); same as the board dropdown",
      "disposition": "Defer"
    },
    {
      "severity": "Low",
      "category": "Maintainability",
      "location": "tests/e2e/profile.spec.ts:1-380",
      "summary": "Spec is 380 lines vs the ~200-line guide; could split into self/other specs (precedent: write-kudo.spec.ts 821)",
      "disposition": "Defer"
    },
    {
      "severity": "Low",
      "category": "Style",
      "location": "lib/kudos/get-kudos-board-data.ts:49",
      "summary": "readBlock logs profile RPC failures under a [kudos] prefix; cosmetic, the RPC name is in the message",
      "disposition": "Reject"
    }
  ],
  "riskGate": {
    "touchesSensitiveArea": true,
    "signoffRequired": true,
    "humanSignedOff": false
  }
}
```
