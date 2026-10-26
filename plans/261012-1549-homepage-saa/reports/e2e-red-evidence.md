# E2E RED evidence: Homepage SAA (phase 01)

Date: 2026-10-12 · testPolicy: e2e-red-first · MoMorph i87tDx10uM

## Spike: fake Supabase accepted by the real proxy
- Result: **ACCEPTED**. Minted ES256 cookie on the authed server (3103): `/login` -> `/` (307). Same-kid cookie signed with a different key: stays on `/login`; server log `getClaims failed: AuthInvalidJwtError: Invalid JWT signature`.
- Why it works (auth-js 2.117.3 `getClaims`): `alg` ES256 + `kid` present -> `fetchJwk(kid)` GETs `${url}/auth/v1/.well-known/jwks.json` (cached per storage key, refetched when kid unknown) -> WebCrypto ECDSA P-256 verify of a raw r||s signature (`dsaEncoding: "ieee-p1363"`). HS* alg or unknown kid falls back to `getUser(token)`; so the fake's `/auth/v1/user` also verifies the signature (401 otherwise) and cannot be used to skip verification.
- Cookie: `sb-127-auth-token` (supabase-js `sb-<first host label>-auth-token`), value `base64-` + base64url(session JSON), asserted `< 3180` chars (one @supabase/ssr chunk). Fresh keypair + random kid per fake start, so a stale JWKS cache can never match.
- No production code changed. Fake bound to 127.0.0.1:54398; only the authed server's env points at it.

## RED
- redTestFiles: `tests/e2e/homepage.spec.ts`, `tests/e2e/homepage-account-menu.spec.ts` (fixture: `tests/e2e/support/fake-supabase-server.mjs`; config: `playwright.config.ts`)
- redCommand: `npm run test:e2e -- tests/e2e/homepage.spec.ts tests/e2e/homepage-account-menu.spec.ts`
- redExitCode: **1** · totals: 16 tests, 15 failed, 1 passed (4.8m). All 5 webServers started (no startup/config errors).
- Passing now (expected, behaviour already exists): `authenticated /login -> /`.

| Test | First failure (real message) | Right reason |
|------|------------------------------|--------------|
| anonymous / and unknown paths -> /login | `anonymous /` Expected "/login" Received "/" | no default-deny yet |
| forged-key cookie / -> /login | Expected "/login" Received "/" (proxy did reject the token) | no default-deny yet |
| render 1440 / render 375 | `getByRole('banner')` element(s) not found | placeholder `/` |
| header: active nav, VN, bell | banner link 'About SAA 2025' not found | placeholder `/` |
| logo/footer logo/About SAA scroll-top | banner logo link not found | placeholder `/` |
| header/CTA/kudos/footer links | wait for banner 'Awards Information' (timeout 90s) | placeholder `/` |
| award cards | `columns at 1440px` Expected 3 Received 0 | placeholder `/` |
| bell panel | `notification-button` not found | placeholder `/` |
| account menu toggle/outside/Esc | `account-menu-button` not found | placeholder `/` |
| account menu Enter/Space | locator.focus timeout on `account-menu-button` | placeholder `/` |
| menu items Profile + Sign out | click timeout on `account-menu-button` | placeholder `/` |
| language VN/EN only | click timeout on `language-selector` | placeholder `/` |
| sign out | click timeout on `account-menu-button` | placeholder `/` |
| hover nav/CTA/card | wait for banner 'Awards Information' (timeout) | placeholder `/` |

## Regression + static checks
- `npx playwright test tests/e2e/login.spec.ts tests/e2e/countdown-prelaunch-gate.spec.ts`: exit 0, 15 passed.
- `npx tsc --noEmit`: exit 0 · `npm run lint`: exit 0.

## Notes for phases 02-04
- Award card contract: `award-card` is a wrapper with exactly ONE descendant anchor (the testid must not sit on the anchor itself).
- Sign out: menuitem 'Sign out' must be `type="submit"` inside a `<form>`; fake records `POST /auth/v1/logout` per `session_id`.
- Hover test fingerprints computed bg/color/shadow/transform/border/filter/decoration/opacity; demote to visual check in 04 only if flaky (log it).
- Fake returns 404 for `/auth/v1/token` (refresh): sessions are minted with 1h expiry so no refresh is expected.
