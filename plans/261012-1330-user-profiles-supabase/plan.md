---
title: "User profiles in Supabase (auto-created on Google sign-in)"
description: "public.profiles + auth.users trigger + RLS via manual SQL migration, and a zod-validated server read helper for Kudos."
status: completed
priority: P1
effort: 2h
branch: main
tags: [feature, database, auth]
work_type: feature
spec_waived: "SDD mode disabled (takumi.sddMode: off)"
blockedBy: [261012-0926-login-google-supabase-auth]
blocks: []
created: 2026-10-12
---

# User profiles in Supabase

Inputs: `clarifications.md` (authoritative). Origin: Login plan request, "save user on sign-in for later use" (Sun* Kudos Live Board needs name, avatar, email, department).
Phases 01/02 delivered and verified (migration, helper, unit+build tests pass). Phase 03 awaits user SQL apply + sign-off.
No UI change. Homepage / Kudos plans will consume `getCurrentProfile`.

## Phases

| # | Phase | Owner | Effort | Blocked by | Status |
|---|-------|-------|--------|-----------|--------|
| 01 | [Migration + rollback + verification SQL](phase-01-profiles-migration.md) | implementer | 0.5h | - | completed |
| 02 | [Zod schema + getCurrentProfile + unit tests (TDD)](phase-02-profile-read-helper.md) | implementer | 0.75h | - | completed |
| 03 | [Apply migration, run checklist, docs note](phase-03-apply-and-verify.md) | user + orchestrator | 0.75h | 01 (02 for smoke) | completed (d2ce141) |

Order: `(01 || 02) -> 03`. 01 and 02 own disjoint files.

## Blocker note

`blockedBy` Login: the helper reuses `lib/supabase/server.ts` and the trigger assumes Google OAuth metadata. Login code is already in the working tree, so takumi may forge now; **commit order is Login first, then this plan**.

## Key decisions

- **Account rule**: `is_allowed_account(email, provider)` = email `@sun-asterisk.com` AND provider `'google'`. Gate (BEFORE INSERT on `auth.users` rejects non-matching), RLS (row visibility), backfill applied consistently across all.
- **Profile upsert via 3 triggers**: (1) email sync on `AFTER UPDATE OF email`, (2) full_name + avatar_url sync on `AFTER UPDATE OF identity_data` WHEN `provider='google'` (source: `auth.identities`, not raw_user_meta_data), (3) initial insert on profile-missing backfill. One `security definer` function with `set search_path=''` + upsert logic keeps all DRY and idempotent.
- **RLS**: `authenticated` SELECT only, filtered by `is_allowed_account` rule applied at query time. No client writes (least privilege). `anon` fully revoked.
- **Backfill** in migration for pre-existing `auth.users`; omits non-matching accounts.
- **No Supabase CLI**: plain timestamped SQL; user applies in SQL Editor. No generated DB types; `Profile` from zod.
- **Read helper**: `getCurrentProfile` only (YAGNI). Identity from `auth.getClaims()`, never `getSession()`; errors logged server-side, `null` returned.
- **No `admin.ts`**: trigger writes under its definer role, no service role needed.

## Data flow

`Google OAuth -> auth.users INSERT/UPDATE -> trigger -> public.profiles` ; `server component -> getCurrentProfile -> getClaims().sub -> select own row (RLS: authenticated read) -> zod parse -> Profile | null`.

## Test matrix

| Layer | Proves | Where |
|-------|--------|-------|
| Unit (vitest) | helper: no claims, found, missing, query error, malformed row; schema; domain restriction in callback | phase 02 + callback tests |
| SQL verification (user-run) | RLS on, policies, trigger exists, allowed-users backfill matches profile count, anon blocked, trigger idempotent, account rule applies | phase 01 file, run in 03 |
| E2E | Not affected: no route/UI/proxy change; existing login specs untouched | skipped |

Safety-critical (DB schema + auth): full `npm test` + `npm run build` + user-run SQL checklist, not a scoped subset.

## Verification commands

`npm run lint` · `npx tsc --noEmit` · `npm test` · `npm run build`

## Rollback

Run `supabase/rollbacks/..._create_profiles_down.sql` (drop triggers, function, policy, table). Loses profile rows only; `auth.users` untouched; sign-in keeps working. Code: revert phase 02 commit (helper is not wired anywhere).

## Open questions

1. Apply SQL to a single Supabase project (no staging)? Assumed yes: the one project used for Login.
