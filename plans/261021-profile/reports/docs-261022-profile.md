# Docs report: Profile delivery (2026-10-22)

Every statement was checked against the working tree (routes, `lib/profiles/*`, `components/profile/*`, the migration and verify SQL, messages, E2E and unit test files). Test totals (lint 0, tsc 0, vitest 826/826, E2E 298/298, gzip 2259 KiB) are controller-reported, not re-run; the 14/14 SQL verify is the owner's confirmation in `clarifications.md`.

## Changed
| File | What changed |
|---|---|
| `README.md` | Nav line: `/profile` is built (was "shows the 404 page"). New section "Profile": routes, access (guest to `/login`, no `next`; own id redirects; malformed/unknown id 404), both faces, the two RPCs and the sent-list-only-for-caller rule, apply/verify/rollback files, **run 2026-10-22, 14/14 PASS**, shared changes (pencil only on `is_mine`, `kudos-kv-backdrop`), known limits. Write Kudo section: Profile pages are also wrapped in `KudosComposer`. |
| `docs/codebase-summary.md` | Table: rows for the two profile routes, `components/profile/`, `lib/profiles/`; updates to `components/kudos/` (backdrop, `KudosFeedLoadMore`, `spacious`, pencil rule, `HeroTitle`/`Stars`), `components/kudos-compose/` (`openComposer(options?)`, `normalize-composer-options`), `messages/`, `routes.ts` (profile routes exist), `lib/kudos/` (`readBlock` exported), `supabase/`, `lib/validation/`, unit and E2E test rows, fake-Supabase row. Removed "chưa làm" for the profile pages (two places). New section "Hồ sơ" (data flow, access, two faces, list behaviour, layout, copy) and "CSDL Hồ sơ" (RPC table, 14/14 PASS). |
| `docs/system/permissions.md` | System-type paragraph names the new RPCs; the old "`/profile` chưa làm, 404" sentence replaced; new Curated bullet "Hồ sơ" (who reads what, sent list owner-only, no email); new Special Conditions bullet with the SQL status (run 2026-10-22, 14/14 PASS); Access Boundaries notes the profile read boundary lives in the database. |
| `docs/project-changelog.md` | New entry "Thêm: trang Hồ sơ" under 2026-10-22: routes, UI, code, SQL run 14/14 PASS, shared changes, the board pencil behaviour change (owner decision 2026-10-22), tests, known limits. Older entries left as history (they correctly said the profile page was not built at the time). |

## No change needed
| File | Why |
|---|---|
| `docs/features/F001_CountdownPrelaunchGate/functional-spec.md`, `technical-spec.md` | View Kudo touched them only for the `?next=` exception to the guest redirect. Profile adds none: a guest on `/profile` goes to plain `/login`, which the existing A1 / edge-case row already states; `PUBLIC_PATHS` and the gate are unchanged. No `/profile` or `kudo_detail` text in them. |
| `docs/screens/SCR001_CountdownPrelaunch/spec.md`, `docs/generated/*` | Only list F001 / SCR001. Profile runs without SDD (`spec_waived`), so no F### or SCR### exists; adding one would invent codes. |
| `docs/development-roadmap.md` | Does not exist in the repo (nor `docs/system-architecture.md`, `docs/code-standards.md`, named in `.claude/rules/documentation-management.md`). Not created: outside a surgical update. Profile status lives in `plans/261021-profile/plan.md` (frontmatter still `pending`, phase table not reconciled; plans are out of scope for this task). |
| `docs/journals/*` | Journal-writer's namespace; not touched. |

## Checked, no stale text left
Grep for `profile`, `/profile`, `kudo_detail`, "chưa làm", "not built" in README, docs/: remaining hits are historical changelog lines or the still-true `getCurrentProfile()` note ("no page calls it": confirmed, the profile page uses `profile_card`, not `getCurrentProfile`). No `doc_lock: user` in any touched file. Sizes: README 153, codebase-summary 275, permissions 56, changelog 205 lines.

## Open items
- `plans/261021-profile/plan.md` still says `status: pending` and phases 02a-03 pending; reconcile it (delivery-tracker), not touched here.
- The riskGate sign-off was still pending in the re-review (`humanSignedOff: false`); the docs state the SQL run, not a sign-off.

**Status:** DONE
**Summary:** README, codebase-summary, permissions and changelog updated for the Profile pages (routes, RPCs, sent-list rule, SQL run 14/14 PASS on 2026-10-22, shared changes, board pencil change). F001 specs, generated lists and screen spec need no change; no roadmap doc exists.
**Concerns/Blockers:** None blocking. `plan.md` status is stale; roadmap/architecture/code-standards docs named in the rules do not exist.
