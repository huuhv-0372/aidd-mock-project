---
name: project-aidd-mock-project-countdown-proxy-gate
description: F001 countdown feature gates the entire aidd-mock-project site via proxy.ts + NEXT_PUBLIC_EVENT_START_AT
metadata:
  type: project
---

`aidd-mock-project` ships a site-wide navigation lock as its first feature (F001, Countdown
Prelaunch Screen): `proxy.ts` (Next.js 16's renamed `middleware.ts` — see
`node_modules/next/dist/docs/.../proxy.md`) redirects every route except `/` to `/` until
`NEXT_PUBLIC_EVENT_START_AT` (ISO-8601 env var) passes, then unlocks the whole site with no
further redirects (including `/` itself, to avoid a self-redirect loop).

**Why:** This makes `proxy.ts` the de facto auth/permission-adjacent gate for every future
route in the repo (Homepage, Login, etc. per the plan's Next Steps) — any later feature
touching routing or the matcher config inherits this gate and must be reviewed against it
(fail-open correctness, matcher gaps, redirect loops), per `development-rules.md`
safety-critical rules.

**How to apply:** When reviewing any new route or static asset path added to this repo,
confirm it's covered (or deliberately excluded) by `proxy.ts`'s matcher — a path not matched
by the exclusion regex but also not intended to be gated will incorrectly redirect; a static
asset path *not* excluded risks a redirect loop. Also: `app/countdown/countdown-screen.tsx`'s
`TITLE_TEXT` locale lookup (`NEXT_LOCALE` cookie) was found vulnerable to a prototype-chain
key crash (`__proto__`/`constructor` as cookie value) — any future i18n lookup keyed directly
off external cookie input in this repo should be checked for the same pattern.
