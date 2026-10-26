# Phase 02c — Return to the Kudo after sign-in (`next`), implementation report

Date: 2026-10-21 · Owner: implementer (02c) · Not committed.

## Files touched (line counts)

| File | Lines | Change |
|---|---|---|
| `lib/auth/post-login-next.ts` | 39 | new: `POST_LOGIN_NEXT_PARAM`, `POST_LOGIN_NEXT_COOKIE = "saa_post_login_next"`, `POST_LOGIN_NEXT_MAX_AGE = 600`, `parsePostLoginNext`, `postLoginNextCookieOptions(maxAge)` |
| `lib/auth/resolve-auth-redirect.ts` | 24 | optional 3rd param `next`; returns `string \| null` |
| `lib/auth/constants.ts` | 32 | doc comment on `POST_LOGIN_PATH` now describes the allow-list (value unchanged `/`) |
| `proxy.ts` | 39 | passes `searchParams.get("next")` to `resolveAuthRedirect` |
| `lib/auth/sign-in-with-google.ts` | 76 | `signInWithGoogle(formData)`; stores or clears the cookie after the authorize URL resolves |
| `app/auth/callback/route.ts` | 61 | `redirectClearingNext` on every exit; success → re-checked cookie or `/` |
| `app/[locale]/login/page.tsx` | 53 | `GoogleLoginFormFromQuery` inside `<Suspense>` (fallback: same form, no next) |
| `components/login/google-login-form.tsx` | 35 | `next` prop → hidden input only when non-null |
| `tests/unit/post-login-next.test.ts` | 123 | new |
| `tests/unit/resolve-auth-redirect.test.ts` | 92 | old cases untouched + new `next` describe block |
| `tests/unit/sign-in-with-google-next.test.ts` | 91 | new (mocks `next/headers`, `next/navigation`, Supabase, as `set-locale-action.test.ts` / `create-kudo-action.test.ts` do) |
| `tests/unit/auth-callback-next.test.ts` | 108 | new (real `NextRequest` → `GET`, Supabase mocked) |

## Acceptance criteria → evidence

- Guest on `/sun-kudos/{uuid}` → `/login?next=/sun-kudos/{uuid}`: `resolve-auth-redirect.test.ts` "sends an anonymous user on %s to /login with next" (checks `searchParams.get("next")` equals the path). Other protected paths still go to a bare `/login`.
- Signed-in user on `/login?next=<valid>` → `next`; invalid → `/`: same file, 11 hostile values tested.
- Login page never prints `next`: it only becomes a hidden `<input>` after `parsePostLoginNext`. `innerText` skips hidden inputs. The E2E covers this at integration.
- `/login?next=https://evil.example` renders normally: `parsePostLoginNext` → null → plain form; proxy treats `/login` as public for guests.
- Sign-in action stores the cookie (httpOnly, Lax, Secure in prod, path `/`, 600 s) and clears it when `next` is invalid or missing. The OAuth `redirectTo` stays `${origin}/auth/callback` (a test checks that no part of the OAuth call contains `sun-kudos`).
- Callback: success + cookie → Kudo; tampered cookie (11 values) → `/`; the cookie is cleared (`Max-Age=0; Path=/; HttpOnly`) on success, fallback, invalid query, exchange error, non-domain account, and thrown error.

## Unit results

- RED first: `post-login-next` (module missing), `resolve-auth-redirect` (5 failures), `sign-in-with-google-next` (9 failures), `auth-callback-next` (17 failures). Then GREEN.
- Auth surface (10 files incl. `auth-callback-query`, `sign-in-origin`, `routes`, `rewrite-with-session`): **189/189, exit 0**.
- Full suite: the first run passed with **exit 0**, before Track B's files existed. A later run showed 13 failures, all in Track B's in-progress `tests/unit/get-kudo-detail.test.ts`. Full suite minus that one file: **45 files / 712 tests, exit 0**.
- `npx tsc --noEmit`: only error is `tests/unit/get-kudo-detail.test.ts` (Track B, module not yet written). None in 02c files.
- `npx eslint <12 files>`: **exit 0**.

## Security self-check

1. **Only `/sun-kudos/<guid>` can ever be a redirect target.** `parsePostLoginNext` is an anchored, flag-free regex `^/sun-kudos/(hex8-hex4-hex4-hex4-hex12)$`, with a 64-char length cap and a string-only check. Output is rebuilt from `kudoDetailHref(id.toLowerCase())`. Tested rejects include `//evil`, `/\evil`, `\\evil`, `https://…`, `javascript:`, `data:`, `%2F` forms, `%2e%2e`, `../`, `./`, query, hash, trailing or extra slash, leading/trailing whitespace, `\n`, `\r\n`, `\t`, NUL, wrong case prefix, `/en/…`, malformed ids, 2 000- and 5 000-char inputs, and non-strings (`String` object, array, `toString` object). The value is re-checked at every hop: proxy (path and query), login page, server action, callback cookie.
2. **Cookie:** `httpOnly`, `SameSite=Lax`, `Secure` when `NODE_ENV=production` (unit-tested via `vi.stubEnv`), `path=/`, `maxAge=600`. One options builder is used for both set and clear, so the clear always matches path and attributes.
3. **Cleared after use and on failure:** every callback exit goes through `redirectClearingNext`. The action also clears a stale cookie whenever the submitted `next` is invalid or absent.
4. **Never reflected as text:** hidden input only, and only after the allow-list. React escapes attribute values.
5. **CSRF/Origin unchanged:** `getGoogleAuthorizeUrl` and its Origin check are byte-identical. A missing Origin still returns `/login?error=auth_failed` before Supabase or the cookie is touched (tested). The callback still reads only `code`/`error` from the query (`auth-callback-query` "strips next" test unchanged and green).
6. **No PII logged:** new log lines are fixed strings plus the thrown error object. Neither `next` nor the email is logged.

## Deviations / decisions

- `parsePostLoginNext` lowercases the id for the canonical form. The E2E ids are lowercase, so `next` matches `detailPath(id)`.
- An `i` flag would have made `/SUN-KUDOS/…` pass, so the regex is flag-free and the hex class lists both cases (caught by a test).
- `resolveAuthRedirect`'s `next` is an optional third param, so the old 2-arg test cases run unchanged.
- The cookie is written only once the Google authorize URL has resolved, so an Origin or Supabase failure leaves it alone. A failed cookie write is logged and sign-in continues; the user then lands on `/`, which is better than a hard login error.
- Added `postLoginNextCookieOptions(maxAge)` (not in the brief) so set and clear stay identical across action and callback.
- Login page: the form moved inside a `<Suspense>` whose fallback is the same form without `next`, following the existing `LoginErrorFromQuery` rule for when cacheComponents is on. With it off today, the page is dynamic either way.

## Follow-ups (not mine)

- `docs/codebase-summary.md` lines 58, 75 and 86 describe the old `resolveAuthRedirect(pathname, isAuthenticated)` and the action without a cookie. Doc-writer should update these in phase 03.
- The E2E guest cases (`kudo-detail.spec.ts` "View Kudo: guest") run at integration.

**Status:** DONE
**Summary:** Allow-listed `next` (only `/sun-kudos/<guid>`) carried proxy → login → httpOnly cookie → callback, re-checked at every hop and cleared on every callback exit; 4 RED→GREEN unit files, auth surface 189/189 green, tsc/eslint clean for 02c files.
**Concerns/Blockers:** None for 02c. The full suite and tsc currently fail only on Track B's in-progress `get-kudo-detail` test.
