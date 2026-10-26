---
phase: 03
title: "Track A: Login UI (presentational)"
status: completed
owner: momorph-ui-implementer
test_policy: e2e-red-first
blocked_by: [02]
notes: "Background key visual is an approximation (Figma export of node 662:14389 failed with HTTP 500/401 — open item for visual polish)."
---

# Phase 03 - Track A UI

- **Screen:** fileKey `9ypp4enmFmdK3YAFJLIu6C`, screenId `GzbNeVGJHz` (Login). Read frame + spec via MoMorph MCP first; confirm Montserrat weights/sizes there.
- **Goal:** Figma-exact header (logo, language selector + dropdown), hero (key visual, h1 ROOT FURTHER, two text lines), Google button, footer; selectors per phase-02 contract. Mobile-first, 1440 and 375.
- **Owned files (create):** `components/login/{login-header,language-selector,login-hero,google-login-button,login-error-banner,login-footer}.tsx`, `public/images/login/*` (exported assets). **Edit:** `app/layout.tsx` (extra Montserrat weights only), `app/globals.css` (`@theme` tokens only).
- **Out of scope:** `app/login/page.tsx` (05), auth action/callback/proxy/`lib/**` (01, 04), form wiring, real locale switching, tests (02 owns the spec).
- **Integration contract (fixed, 04/05 depend on it):**
  - `GoogleLoginButton({ pending?: boolean })` in `google-login-button.tsx`: plain `<button type="submit">` (no onClick, no action); `pending` => `disabled`, `aria-busy`, shows `data-testid="login-loader"`. Always renders `google-icon`.
  - `LoginHero({ children })`: `children` slot sits where the button goes; page passes the 05 form leaf.
  - `LoginErrorBanner({ message?: string })`: renders `role="alert"` only when `message` is set. Message text comes from `lib/auth/constants.ts` (01), never hard-coded here.
  - `LanguageSelector`: `"use client"` leaf, local open/close state, VN selected, options VN/EN, no persistence; keyboard + Escape/outside-click close.
- **Rules:** server components by default, `"use client"` only for `language-selector`; `next/image` with `sizes`; `min-h-11 min-w-11` targets; `focus-visible:`; `motion-safe:` animations; files < 200 lines.
- **Success:** `npm run lint`, `npx tsc --noEmit` (full tsc may only fail on the missing `app/login/page.tsx` consumers; none expected), `npm run build`. Visual diff against frame is done in 05.
- **Risks:** custom fonts/weights bloat (M/L: only weights Figma uses); Figma title is an image (M/L: keep h1 accessible name "ROOT FURTHER"); dropdown a11y (L/M: listbox/option roles per contract).
