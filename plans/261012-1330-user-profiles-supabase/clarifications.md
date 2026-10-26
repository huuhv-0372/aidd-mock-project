# Clarifications — User profiles in Supabase (for Sun* Kudos Live Board)

Origin: request during Login plan (261012-0926-login-google-supabase-auth) — "khi user đăng nhập vào hệ thống, cần lưu vào database trên supabase để sau này tận dụng" (Sun* Kudos Live Board).
Inputs: plans/momorph-specs/sun-kudos-live-board-MaZUn5xHXZ/specs.csv, profile-ban-than-3FoIx6ALVb, dropdown-phong-ban-WXK5AYB_rG.

## Session 2026-10-12

- Q: Scope — fold into Login commit or separate? → A: Seal Login first (after live check #3), then this separate plan.
- Q: Mechanism to create/update profile on login? → A: Postgres trigger on auth.users (insert + update of user metadata), not app upsert in /auth/callback.
- Q: Migration tooling (no Supabase CLI in repo)? → A: SQL migration files committed under supabase/migrations/ (plus rollback), user runs them manually in Supabase SQL Editor. No CLI dependency.
- Q: Restrict sign-in to @sun-asterisk.com? → A: No restriction; any Google account can sign in and gets a profile.

## Derived from specs (orchestrator, override if wrong)

- Kudos needs per user: full name, Gmail avatar, email, department ("Phòng ban", list queried from DB). Google does not provide department → `department` nullable at login, assigned later (Kudos/Profile plan).
- Danh hiệu / số hoa thị are derived from kudos data → not stored on profiles now (YAGNI).
- RLS on from the first migration: authenticated users can read all profiles (Kudos shows sender/receiver); a user can update only their own row; no insert/delete from clients (trigger runs security definer).

## Defaults chosen by orchestrator

- **Decision change (RLS):** the line above said "a user can update only their own row". Tightened to **no client writes at all** for now (SELECT-only for `authenticated`, `anon` fully revoked). Reason: least privilege; nothing in scope writes profiles from a client (trigger writes as definer). Add a narrow own-row policy (e.g. `department` only) when a feature such as the department picker needs it.
- Backfill existing `auth.users` rows in the migration (the Login test user already exists).
- Google metadata mapping: `full_name` falls back to `name`; `avatar_url` falls back to `picture`.
- Read helper limited to `getCurrentProfile` (YAGNI); no generated DB types, `Profile` type comes from zod.

## Session 2026-10-12 (after Stage 5 review)

- Q: Review High — open Google sign-in + `select using (true)` lets any outsider enumerate employee emails/names. Options: restrict to @sun-asterisk.com / hide email column / accept? → A: Restrict sign-in to @sun-asterisk.com. SUPERSEDES the earlier "No restriction" answer. Enforce in depth: DB (BEFORE INSERT trigger on auth.users rejects other domains; RLS select requires the caller's JWT email domain; backfill only domain users), app (Google `hd` hint, callback rejects + signs out non-domain sessions with the generic error).
- Q: Review Medium — full_name/avatar_url from user-editable raw_user_meta_data allow spoofing via updateUser. Options: source from auth.identities / only tighten avatar_url / defer? → A: Source full_name/avatar_url from auth.identities.identity_data (provider = google), which users cannot edit via the API; raw_user_meta_data is no longer read.
