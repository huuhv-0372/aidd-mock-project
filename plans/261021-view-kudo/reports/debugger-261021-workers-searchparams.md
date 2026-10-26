# Workers searchParams loss: root cause (2026-10-21)

## Verdict
Not a production bug. Local-preview artifact: `npm run preview` hit via `127.0.0.1:8787`. Via `localhost:8787` (or any other hostname) the query string arrives intact on workerd. No production code changed.

## Evidence chain
1. Instrumented the built Worker (`.open-next/worker.js`, throwaway, restored; `.open-next` is git-ignored). Request to `http://127.0.0.1:8787/login?error=auth_failed` produced TWO `worker.fetch` calls plus a 307:
   - `GET http://127.0.0.1:8787/login?error=auth_failed` (the curl)
   - `GET http://localhost:8787/vi/login?error=auth_failed` (self-fetch from inside the Worker) -> wrangler log `GET /vi/login 307`
   - `GET http://localhost:8787/login` (no query; fetch followed the 307 Location) -> 200 page with `searchParams = {}`
2. Mechanism:
   - Next `NextURL` rewrites hostnames matching 127.x.x.x / [::1] to `localhost` (`node_modules/next/dist/server/web/next-url.js:15-19`), so the `x-middleware-rewrite` URL is `http://localhost:8787/vi/login?...`.
   - OpenNext `handleMiddleware` (`@opennextjs/aws/dist/core/routing/middleware.js:151`) calls `isExternal(newUrl, headers.host)`; `isExternal` (`routing/util.js:16-26`) compares `URL.host` to the Host header: `localhost:8787` != `127.0.0.1:8787` -> `isExternalRewrite = true`.
   - `adapters/middleware.js` then takes the `externalRequestProxy.proxy()` branch (`proxyExternalRequest: "fetch"`) instead of handing the Request to the server function. That fetch hits the Worker again as a direct `/vi/login` request, which our own proxy sends through the auth gate (guest on a non-public path) -> 307 to `/login` without query -> fetch follows the redirect -> `/login` rewritten again, no query. The "two proxy invocations" the controller saw are this chain; the second one has no query because the redirect target has none.
3. Control experiments on the same build and same workerd (all single `worker.fetch`, no 307):
   - `http://localhost:8787/login?error=auth_failed` -> banner present (`role="alert"` count 1)
   - `curl --resolve app.example.test:8787:127.0.0.1 http://app.example.test:8787/login?error=auth_failed` -> banner present
   - `http://127.0.0.1:8787/login?error=auth_failed` -> banner absent (reproduces the report); `?next=` hidden input also absent
4. Prior knowledge matches: memory note `opennext-cloudflare-next-16-4-pitfalls.md` already recorded "curl localhost:8787, not 127.0.0.1"; the report hit the same trap through a different symptom.

## Hypotheses
- H1 our rewrite (`request.nextUrl.clone()` + pathname) drops the query: rejected. Rewrite target in the first invocation carried the full query; with a matching host the page receives it.
- H2 OpenNext routing/requestHandler loses `initialSearch`/`invokeQuery`: rejected. Same code, same build, works on `localhost`.
- H3 Host/URL mismatch -> external-rewrite self-fetch: confirmed (steps 1-3).

## Production reasoning
In production the request host is the real domain; `request.url`, Host header and rewrite URL all carry it unchanged (NextURL only rewrites loopback addresses), so `isExternal` is false and the in-Worker path is used. The Sun* Kudos board filters (`/sun-kudos?hashtag=..&department=..`) go through the same `rewriteWithSession` branch as `/login?error=`, which is proven on workerd with a non-loopback host. Board filters themselves could not be run on workerd: they need a session and the only Supabase is behind `.env.local`; I did not log in. Guest `/sun-kudos?hashtag=a&department=b` -> 307 `/login` (as designed, no `next` for the board).

## Fix
- No code patch to `proxy.ts`/OpenNext (YAGNI; a patch would change production routing for a local-only artifact). No OpenNext config option exists for this comparison.
- `CLAUDE.md`: one bullet under "Next.js 16 + Cloudflare Workers" telling people to open preview via `localhost:8787`. The client-side `?next` mitigation in `components/login/google-login-form.tsx` stays as is.

## Verification (workerd preview on `http://localhost:8787`)
- `/login?error=auth_failed` -> banner in server HTML (PASS)
- `/login?next=%2Fsun-kudos%2F<guid>` -> `<input type="hidden" name="next" value="/sun-kudos/<guid>"/>` (PASS)
- `/login?next=https%3A%2F%2Fevil.example` -> no `name="next"` (PASS)
- guest `/sun-kudos/<guid>` -> 307 `Location: /login?next=%2Fsun-kudos%2F<guid>` (PASS)
- `npx tsc --noEmit -p .` exit 0; `npm run lint` exit 0; `npx vitest run` exit 0 (46 files, 725 tests)
- `npx wrangler deploy --dry-run`: exit 0, gzip 2241.46 KiB (limit 3072)

## Gap and proposal
- Gap: preview was driven by `127.0.0.1`, and nothing checks query params on the Workers bundle; E2E runs on `next start` only.
- Proposal (cheap): a `scripts/smoke-workers-query.mjs` run after `opennextjs-cloudflare build` + `preview`, curling `http://localhost:8787/login?error=auth_failed` and asserting `role="alert"`, plus the `next` hidden input. Run it in CI/deploy pre-check (once, no browser). Also have that script fail fast if its base URL host is a loopback IP.

## Unresolved
- Board filters with a real session on workerd not exercised (see above).
- Direct `/vi/...` self-redirect behaviour is unchanged and not a concern outside the artifact.
