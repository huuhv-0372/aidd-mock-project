# Docs — View Kudo (/sun-kudos/{id}) delivery step

Docs impact: major (new route, new RPC, auth redirect contract changed). Every claim was checked against the working tree (`git diff`, new files); nothing was run (docs-only change).

## Files updated

| File | Change |
|---|---|
| `docs/codebase-summary.md` (214 -> 244 lines) | New route row, new section "Xem Kudo" + "CSDL Xem Kudo"; rows for login page, callback, google-login-form, kudos components (`wrap`/`plain` props, post-card link, detail-*, rich-content), routes (`/sun-kudos/<id>` now exists), `lib/kudos`, `lib/auth` (`post-login-next.ts`, new `resolveAuthRedirect` signature returning `string | null`, `signInWithGoogle(FormData)`), supabase migrations, `kudoIdSchema`, unit and E2E test rows; proxy and Google-login flow diagrams now show `next` and the cookie; "no `next` / no open redirect" bullet replaced with the allow-list + cookie contract; "Chưa có" and "Chưa làm" lists no longer claim the detail page is missing; link-safety notes (lines on `hasOnlySafeLinks` and the pending security note) rewritten: View Kudo is the first Markdown renderer and filters on read, `create_kudo` still unchecked. |
| `docs/system/permissions.md` | Visitor and signed-in bullets (`/sun-kudos/<id>` signed-in only, 404 cases, the single `?next` exception), Kudos data bullet (`kudo_detail`), Access Boundaries (read boundary in DB), "Phiên đăng nhập" (stale "luôn về `/`, không nhận địa chỉ đích từ client" replaced with allow-list + cookie details), link-content condition (now guarded on read, not on write), new "Xem Kudo, trạng thái SQL" condition. |
| `docs/features/F001_CountdownPrelaunchGate/functional-spec.md` | One edge-case row (§ 8): guest on `/sun-kudos/<id>` goes to `/login` with `?next=`. Row-level edit only, CRLF kept. |
| `docs/features/F001_CountdownPrelaunchGate/technical-spec.md` | Same note in the A1 row about `resolveAuthRedirect`. |
| `docs/project-changelog.md` | Two entries dated 2026-10-21: "Thêm: trang Xem Kudo" and "Thêm (bảo mật): quay lại đúng Kudo sau đăng nhập, `next` theo danh sách cho phép". |
| `README.md` | Access-control paragraph (`?next` exception), new "View Kudo" section, Login section (`next` allow-list + cookie), Write Kudo "Known limits" link-safety sentence. |

Not touched: `docs/generated/*` (only F001 entries, nothing stale), `docs/screens/*`, `docs/decisions/*`, code, tests, plans (apart from this report).

## Verdict

Docs now match the tree. All pages are well under the 800-line ceiling (largest: `docs/codebase-summary.md`, 244 lines; no split needed).

## Left deliberately honest (not guessed)

- `kudo_detail` migration is written as "not recorded as applied on the real Supabase project" in codebase-summary, permissions and README. Update those three lines (and add the verify count/date, like the heart RPC) once the user runs migration + verify and signs the riskGate.
- Reviewer Medium #1 (Close after OAuth goes back to `/login`) is already fixed in the current close-button code (previous-entry check, `/login` excluded) and the docs describe the fixed behaviour. Reviewer Low #4 (leading `2025. ` / `>` rendered as list/quote) is documented as a known limit.
- No new F###/spec was created for View Kudo (the feature is outside SDD in this repo, like the other Kudos screens). If one is wanted: `/tkm:rebuild-spec --features`.
- E2E evidence and the Figma visual comparison (reviewer criterion 6) are not mentioned in docs: they live in `plans/261021-view-kudo/evidence`.

**Status:** DONE_WITH_CONCERNS
**Summary:** Updated six doc files (codebase-summary, permissions, F001 functional and technical spec edge-case rows, changelog 2026-10-21, README) to cover the View Kudo route, `kudo_detail` RPC, rich-content renderer and the post-login `next` allow-list; every stale claim from the auth implementer's list was fixed.
**Concerns/Blockers:** `kudo_detail` SQL is documented as not yet applied on real Supabase (update after the user runs migration + verify); `create_kudo` still does not validate link targets (documented as read-side mitigation only).
