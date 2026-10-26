# Research: Responsive Next.js 16 + Tailwind v4 conventions (2025/2026)

Date: 2026-10-08. Sources: official Next.js 16 docs (vendored in `node_modules/next/dist/docs`),
Tailwind v4 docs via web search, WCAG/accessibility references, 2025/2026 practitioner writeups.
Verified against project's actual files: `next.config.ts`, `app/globals.css`, `app/layout.tsx`, `package.json`.

## 1. CSS-first config (`@theme`) vs JS config — USE CSS-FIRST

Confirmed: `app/globals.css` already uses `@import "tailwindcss"` + `@theme inline` — no
`tailwind.config.js` present, and none is needed. This is the v4 default and the only path
that gets the 10x build / 100x incremental-build speedup v4 ships for Turbopack (project already
wires `@tailwindcss/turbopack` in `next.config.ts`). A JS config file still works in v4 (loaded via
`@config`) but exists only for migration compat — adding one here would be reintroducing a legacy
path with no payoff. **Recommendation: stay CSS-first, no `tailwind.config.js`.**

Token model in `@theme`:
```css
@theme {
  --color-brand-500: oklch(0.6 0.2 250);
  --font-display: "Geist", sans-serif;
  --spacing-18: 4.5rem;          /* extends the default spacing scale */
  --breakpoint-xs: 30rem;        /* adds a breakpoint, keeps the rest */
  --breakpoint-*: initial;       /* only if you want to fully replace the default scale */
}
```
Every `--color-*`, `--font-*`, `--spacing-*`, `--breakpoint-*` var auto-generates matching
utilities/variants. Current `app/globals.css` already does this correctly for color/font; extend
the same block, don't start a second `@theme` block (DRY — Tailwind merges them but one source of
truth is easier to scan).

## 2. Breakpoint scale — keep Tailwind defaults, no custom breakpoints yet

Default v4 scale (`sm 40rem/640px, md 48rem/768px, lg 64rem/1024px, xl 80rem/1280px, 2xl 96rem/1536px`)
already covers mobile → tablet → desktop → wide-desktop cleanly. No evidence in the codebase
(no components yet) of a device target the default scale doesn't fit. Per YAGNI: **don't add
custom breakpoints speculatively** — add one only when a real layout needs a cut point the
default scale misses (e.g. a `xs` for a 375px design comp). Mobile-first order (unprefixed →
`sm:` → `md:` → ...) is the only convention to enforce from day one.

Separately, v4 ships **container queries** natively (`@container`, `@sm`/`@lg`/`@max-*` variants,
no plugin) with their own default scale (`@sm 20rem ... @2xl 42rem`). These are a *different
axis* from viewport breakpoints — reach for them on components that must resize by their parent
(a card in a sidebar vs. a card in a 3-col grid), not as a blanket replacement for viewport
breakpoints. Worth adopting selectively, not as the default pattern for page-level layout.

## 3. Shared layout primitives — `components/ui/`, build on demand

2025/2026 convention split, consistent across every source checked: `app/` stays routing-only
(`page.tsx`, `layout.tsx`, route handlers); `components/ui/` holds dumb, stateless, reusable
primitives (Container, Stack, Grid, Button); `components/features/` or `components/<feature>/`
holds domain-aware composition. This matches the project's current empty `app/` scaffold — no
restructure needed, just establish the split before the first feature component lands.

YAGNI call: **do not build Container/Grid/Stack speculatively before a second screen needs them.**
Build the first screen directly with Tailwind utility classes on the container element
(`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`); promote the pattern into `components/ui/container.tsx`
only once it repeats a second time (DRY kicks in on repetition, not in anticipation of it).

## 4. Responsive patterns to set as convention now

- **Fluid typography**: prefer a small number of `clamp()`-based `--text-*` tokens in `@theme`
  over long breakpoint chains (`text-2xl md:text-4xl lg:text-6xl`) for headings that must scale
  continuously. Keep body text on the static utility scale — fluid everywhere is over-engineering.
- **No fixed pixel widths** on layout containers — use `max-w-*` + fluid `%`/`rem` children;
  reserve fixed `px` for icons, borders, and other intrinsically-sized elements.
- **`next/image` `sizes` prop is mandatory on every responsive image** — omitting it makes the
  browser assume 100vw and fetch an oversized variant, directly hurting LCP/CLS. Map `sizes`
  breakpoints 1:1 to the Tailwind breakpoints already in use, e.g.
  `sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"`. Always pair with explicit
  `width`/`height` (or `fill` + a sized parent) to avoid layout shift; add `priority` only on the
  above-the-fold hero/LCP image.
- **Touch targets**: WCAG 2.2 SC 2.5.8 (AA) requires ≥24×24px; usability research and Apple HIG
  both converge on **44×44px** as the practical minimum for primary mobile controls. Enforce via
  a utility convention (`min-h-11 min-w-11` = 44px at default rem) on buttons/links in mobile
  layouts, not as an afterthought pass.

## 5. Accessibility basics intersecting with responsive design

- **Viewport meta tag**: Next.js App Router injects `<meta name="viewport" content="width=device-width, initial-scale=1">` automatically via the framework's built-in metadata — confirmed no manual tag needed in `app/layout.tsx`. Only override via the `viewport` export in `layout.tsx`/`page.tsx` if a route genuinely needs different zoom/scale behavior (rare, and disabling user zoom is itself an accessibility anti-pattern — don't).
- **Focus states**: Tailwind's `focus-visible:` variant (keyboard-only) over bare `focus:`
  (fires on mouse click too) for interactive primitives — keeps focus rings from appearing on
  tap/click in touch/mouse contexts while preserving them for keyboard nav.
- **Reduced motion**: use the opt-in pattern — ship no/minimal motion by default, add transitions
  inside `motion-safe:` variant (Tailwind maps this to `@media (prefers-reduced-motion: no-preference)`),
  so animation is additive rather than something to strip out later. Where motion carries meaning
  (e.g. a loading state), swap to a static equivalent under `motion-reduce:`, don't just delete it.

## 6. Next.js 16 `cacheComponents` + `partialPrefetching` — impact on client/server split

Both flags are confirmed enabled in `next.config.ts` and are the **stabilized, top-level** config
in 16.0.0 (no longer `experimental.*`) per the vendored docs. Implications for responsive/interactive UI:

- `cacheComponents: true` makes data fetching dynamic-by-default; a route needs an explicit
  `use cache` boundary to get a static shell. Keep **server components for structural/responsive
  layout** (the parts that don't change per-viewport-interaction — nav shell, grid scaffolding)
  so they can be cached/prerendered into the static shell Next streams immediately.
  **Client components should be reserved for the actual interactive leaf** (a mobile nav-toggle,
  an accordion, a carousel) — push `"use client"` as far down the tree as possible so the static
  shell stays maximally cacheable. This is the existing RSC-boundary best practice, now with a
  concrete payoff: smaller client boundaries directly produce a bigger/cheaper static shell.
- `partialPrefetching: true` means Next prefetches one shared **App Shell** per route (the
  viewport-independent structural markup) and resolves `params`/`searchParams`-dependent content
  after navigation. A responsive layout built as one big client component defeats this — the
  whole thing becomes part of the dynamic hole instead of the reusable cached shell. Practical
  rule: **keep the top-level responsive grid/container as a server component**; only the specific
  widget that needs `useState`/`matchMedia`/viewport JS goes client.
- `<Activity>`-based navigation (new in 16, tied to `cacheComponents`) preserves component state
  across client-side nav instead of unmounting — relevant for responsive patterns like an open
  mobile drawer or scroll position: effects still clean up on hide/show, so don't assume
  mount-time setup logic reruns on every navigation. See `preserving-ui-state.md` guide in the
  vendored docs for the specific gotchas (timers, subscriptions, test assumptions).

## Ranked recommendation

1. **Keep CSS-first `@theme`**, extend the existing block in `app/globals.css` — no JS config.
2. **Keep default Tailwind breakpoints**; add a custom one only when a real design forces it.
3. **Don't scaffold `components/ui/{container,stack,grid}` yet** — write the first screen inline,
   extract on second repetition (YAGNI/DRY balance).
4. **Adopt container queries selectively** for components reused across differently-sized parents,
   not as the default responsive mechanism.
5. **Bake in now, as non-negotiable conventions**: mandatory `next/image sizes`, `min-h-11 min-w-11`
   touch targets, `focus-visible:` not `focus:`, `motion-safe:`/`motion-reduce:` for any animation.
6. **RSC boundary discipline**: server components own layout/structure, client components are
   pushed to the smallest interactive leaf — this is now a performance requirement, not just style,
   given `cacheComponents`/`partialPrefetching` are on.

## Open questions / left uncovered

- No actual design/breakpoint requirements exist yet (project has only the default scaffold) —
  this report cannot confirm whether a custom breakpoint will eventually be needed; revisit once
  the first real screen comps exist.
- Did not benchmark container-query browser support floor against this project's target
  audience — v4's `@container` relies on baseline-modern browser support; confirm with the team's
  actual browser support matrix before leaning on it for anything load-bearing.
- Fluid-typography `clamp()` token values are a design decision (min/max rem, viewport scaling
  factor) that needs real content/brand input, not just a technical pattern — left to design.
