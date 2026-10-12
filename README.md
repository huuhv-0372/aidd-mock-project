# SAA 2025 (AIDD mock project)

Next.js 16 (App Router, TypeScript) + Tailwind CSS v4. Supabase and Cloudflare Workers (OpenNext) are planned but **not installed yet**. See `CLAUDE.md` for the target stack and conventions.

## Run

```bash
npm install
cp .env.example .env.local   # then adjust EVENT_START_AT
npm run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest, `tests/unit/`) |
| `npm run test:e2e` | `next build` then Playwright (`tests/e2e/`); starts three servers on ports 3100-3102 |

First time running e2e: `npx playwright install chromium`.

## Prelaunch gate

`proxy.ts` gates every route on the server environment variable `EVENT_START_AT` (see `.env.example`):

- Before that time, every route except `/countdown` and static assets redirects (307) to `/countdown`.
- After that time, `/countdown` redirects to `/login`; other routes pass through.
- `EVENT_START_AT` missing or invalid: the gate stays open (no countdown) and an error is logged on the server.
- Format: ISO 8601 with an explicit offset, e.g. `2025-12-01T09:00:00+07:00`. Server-only, never prefix with `NEXT_PUBLIC_`.

**`/login` is not implemented yet**: once the event starts (or the countdown reaches zero) the redirect lands on a 404.

To preview the countdown locally, set `EVENT_START_AT` to a future time in `.env.local`.

## Docs

- `docs/codebase-summary.md` — layout of the code and how the gate works.
- `docs/features/F001_CountdownPrelaunchGate/` — functional and technical spec of the gate.
- `docs/screens/SCR001_CountdownPrelaunch/spec.md` — countdown screen spec.
