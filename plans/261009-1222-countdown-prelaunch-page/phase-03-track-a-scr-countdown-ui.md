---
phase: 03
title: "Track A — SCR-countdown presentational UI"
status: completed
feature: F001
owner: momorph-ui-implementer
test_policy: e2e-red-first
blocked_by: [02]
---

# Phase 03 — SCR-countdown UI (Track A)

- **Screen:** SCR-countdown · fileKey `9ypp4enmFmdK3YAFJLIu6C` · screenId `8PJQswPZmU` · `spec/countdown-prelaunch-gate/screens/SCR-countdown/spec.md`
- **Goal:** Static background (E01) + title "Sự kiện sẽ bắt đầu sau" (E02) + LED two-digit unit with label (E03-E08), matching the frame; one row scaling down on mobile (D002).
- **Owned files:** `components/countdown/countdown-screen.tsx`, `components/countdown/countdown-unit.tsx`, `public/images/countdown/*`, `app/globals.css`
- **Out of scope:** timer/interval, date math, redirects, `proxy.ts`, `app/countdown/page.tsx`, `app/layout.tsx` (report needed font/`lang` changes to phase 08), i18n, seconds.
- **Integration contract (server components, no `"use client"`):**
  - `CountdownScreen({ children }: { children: ReactNode })` — background (`next/image` fill + `sizes="100vw"`, dark overlay) + `<h1>` title + slot for the timer row.
  - `CountdownUnit({ label, value, testId }: { label: 'DAYS'|'HOURS'|'MINUTES'; value: string; testId: string })` — renders `value` as two LED digit boxes; wrapper carries `data-testid={testId}` whose text content is exactly `value`; accessible name reads the number once (e.g. `aria-label="{value} {label}"`, digit boxes `aria-hidden`), no live region.
- **RED evidence:** read-only from phase-02 `## RED Evidence`.
- **Planned checks:** `npm run lint`, `npm run build`; tester owns E2E/visual in phase 08.
- **test_policy:** e2e-red-first

## Delivery Notes
✓ Completed. Components delivered: `countdown-screen.tsx`, `countdown-unit.tsx`, `CountdownRow` exported. Also created `app/fonts/digital-numbers-regular.ttf` (OFL 1.1 per embedded metadata, provenance note added); responsive design (D002) folded in; layout now uses Montserrat + local Digital Numbers fonts, `lang="vi"` on page. Separate polish pass waived by user for time. Visual render-asserted at 1512/768/375px, text positions match Figma to pixel.
