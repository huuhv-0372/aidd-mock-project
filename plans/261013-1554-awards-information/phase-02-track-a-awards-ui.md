---
phase: 02
title: "Track A: Awards UI (presentational)"
status: completed
owner: momorph-ui-implementer
test_policy: e2e-red-first
blocked_by: [01]
---

# Phase 02 - Track A UI

- **Screen:** fileKey `9ypp4enmFmdK3YAFJLIu6C`, screenId `zFYDgyj_pD` (Figma node 313:8436). Read frame + specs via MoMorph first. ALL copy verbatim from the Figma node tree. Selectors per phase-01 contract (read-only RED files).
- **Goal:** keyvisual hero (title "ROOT FURTHER" art), title block A, two-column layout (sticky left nav C + 6 award cards D.1-D.6, image 336x336 alternating left/right, title/description/quantity/prize, Signature has two prize lines), Sun* Kudos block, 1440 and 375 (chip bar sticky under header, cards stacked image-on-top). Section `id={slug}` + `scroll-mt-*` clearing sticky bars.
- **Owned files:** create `app/awards-information/page.tsx` (composes `SiteHeader activeHref={AWARDS_INFORMATION_PATH}`, main, `SiteFooter`, `WidgetButton` from `components/site-shell/*`; header controls = `HeaderSessionControls` in `Suspense` as in `app/page.tsx`; metadata title), `components/awards/*` EXCEPT `use-active-award.ts` (awards-keyvisual, awards-title, awards-layout, awards-nav ("use client" leaf), award-section, award-sections-data.ts, ...), `public/images/awards/*` (only new exports; reuse `public/images/home/award-*.png` when Figma matches). Append-only edits to `app/globals.css` `@theme` if new tokens needed.
- **Out of scope:** `components/site-shell/*` and `components/home/*` (03 moves them; import only), `use-active-award.ts`, `lib/**`, `app/not-found.tsx`, `playwright.config.ts`, tests, proxy, real i18n.
- **Integration contract (fixed):** `AwardsNav({ items: readonly {slug: AwardSlug; label: string}[] })` calls `useActiveAward(slugs)` from `@/components/awards/use-active-award` (03) and renders `<a href="#slug" aria-current={active ? "true" : undefined}>`; click -> `preventDefault` + `select(slug)`. Slugs/labels come from `AWARD_SLUGS` in `lib/navigation/routes.ts`. Kudos block is imported from `components/site-shell/kudos-section`; fork only if MCP data differs (note why).
- **Rules:** server components by default; `next/image` with `sizes`; `min-h-11 min-w-11`; `focus-visible:`; `motion-safe:` + `motion-reduce:`; Tailwind v4 `@theme`; files < 200 lines; no hard-coded paths.
- **Success:** `npm run lint`, `npx tsc --noEmit`, `npm run build` green (after 03 step 1-2 lands). Visual diff + E2E GREEN happen in 04. Kill any server you start.
- **Risks:** Figma asset export fails (approximate + log); award image weight (optimize, lazy below fold); file size (split by section).

## MoMorph refs:
- Hệ thống giải: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/zFYDgyj_pD
- Clarifications: plans/261013-1554-awards-information/clarifications.md
- testPolicy: e2e-red-first

## Completion notes (2026-10-13)
- Done: `app/awards-information/page.tsx`, `components/awards/*`. Reused `public/images/home/award-*` assets; no new `public/images/awards`.
- Open: hero keyvisual approximated with `keyvisual-bg.webp` (Figma export 500/401). Composition close, not exact. Owner: momorph-ui-implementer.
