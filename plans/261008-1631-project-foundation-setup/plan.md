---
title: "Project foundation: Cloudflare Workers, Supabase auth, security baseline, conventions"
description: "Lay the shared technical foundation for the Next.js 16 app: Workers deploy, Supabase auth scaffolding, OWASP baseline, code/responsive conventions, health check."
status: cancelled
priority: P1
effort: 9.5h
branch: main
tags: [feature, infra, backend, auth, critical]
blockedBy: [261012-0926-login-google-supabase-auth]
blocks: []
work_type: feature
spec_draft: plans/261008-1631-project-foundation-setup/spec/project-foundation/
created: 2026-10-08
---

# Project Foundation Setup

Background feature, no UI screens. Requirements are owned by the spec draft (FR/BR/SM/US/CAP codes);
phases cite them and do not re-derive them.

## Phases

| # | Phase | Spec codes | Effort | Depends on | Status |
|---|-------|------------|--------|------------|--------|
| 01 | [Cloudflare Workers deploy tooling + deps](phase-01-cloudflare-workers-deploy-tooling.md) | CAP-01, A1, FR-001, US001 | 2h | — | completed (qua plan Countdown/Login: `wrangler.jsonc`, `open-next.config.ts`, `.env.example`) |
| 02 | [Security hardening primitives](phase-02-security-hardening.md) | CAP-03, A0, FR-003/004/601/602/604, BR-002/003/004, US003 | 2h | 01 | cancelled (chưa làm: `lib/security/*`, CSP nonce, header bảo mật qua `next.config.ts`; chỉ có `public/_headers` cho cache asset) |
| 03 | [Supabase client + auth scaffolding](phase-03-supabase-client-and-auth-scaffolding.md) | CAP-02, A2-A7, FR-002/401-405, BR-005/006, SM-001, US004 | 3h | 01, 02 | partial (`lib/supabase/{env,server,update-session}.ts` làm ở plan Login; `client.ts`, `admin.ts` chưa cần nên chưa làm) |
| 04 | [Code-organization + responsive conventions doc](phase-04-code-and-responsive-conventions-doc.md) | CAP-04, FR-005, FR-603, BR-001/007, US002, US006 | 1.5h | — (parallel) | cancelled (quy ước nằm trong `CLAUDE.md` và `.claude/rules/`, không có `docs/code-standards.md`) |
| 05 | [Deployment smoke-test health check](phase-05-deployment-health-check.md) | CAP-05, A8, FR-006, BR-004, US005 | 1h | 01, 02, 03 | cancelled (chưa có `/api/health`) |

**Kết quả thực tế (cập nhật 2026-10-26):** plan này không chạy như một khối. Phần nền cần cho các màn được làm dần trong plan Countdown (`261009-1222`) và Login (`261012-0926`); issue #1 đã đóng. Những phần chưa làm (header bảo mật + CSP nonce, `verify-origin`, client trình duyệt/admin của Supabase, `docs/code-standards.md`, `/api/health`) vẫn là việc mở.

Order: `01 → 02 → 03 → 05`; `04` runs in parallel with any phase (docs only, disjoint files).
Numbering differs from the brief: security (02) precedes Supabase (03) because auth actions consume
`lib/errors/handle-action-error.ts`.

## File ownership (no two phases touch the same file)

- **01:** `package.json`, `package-lock.json`, `wrangler.jsonc`, `open-next.config.ts`, `.gitignore`, `.env.example`, `vitest.config.ts`
- **02:** `next.config.ts`, `public/_headers`, `lib/security/*`, `lib/errors/*`
- **03:** `lib/supabase/*`, `lib/auth/*`, `lib/validation/auth.ts`, `proxy.ts`, `app/actions/auth.ts`, `app/auth/callback/route.ts`
- **04:** `docs/code-standards.md`
- **05:** `app/api/health/route.ts`

Phase 01 installs ALL runtime/dev dependencies up front so later phases never edit `package.json`.

## Key decisions

- **Adapter:** `@opennextjs/cloudflare` (versions pinned exact). Keep `cacheComponents`, `partialPrefetching`, `experimental.agentFeedback`.
- Phase 03 superseded by 261012-0926-login-google-supabase-auth (Google OAuth only; Supabase clients + proxy session refresh live there).
- **D001:** new Supabase key names only (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`).
- **v1 auth:** email/password only; `/auth/callback` handles email confirmation only, no OAuth.
- **Spec deviation (needs sign-off) — FR-003 CSP:** static CSP in `next.config.ts headers()` with `script-src 'self' 'unsafe-inline'` (all other directives strict), NOT nonce CSP. Vendored Next 16 docs: nonce CSP forces every page dynamic and is incompatible with PPR/`cacheComponents`, which must stay on. Proposed FR-003 amendment: "strict script-src (nonce or SRI) mandatory before first authenticated/user-data page ships."
- **`proxy.ts`** = session refresh only (Next 16 proxy is always Node runtime; OpenNext supports it experimentally since PR #1309, Aug 2026).
- **Health check** round-trips Supabase Auth `GET /auth/v1/health` (no table needed, no session needed). `auth.getUser()` with no session short-circuits locally and proves nothing.
- **No schema / migrations:** no `public` tables exist; FR-603/BR-001 enforced as a documented review gate (phase 04).

## Verification boundary

Sandbox may lack Cloudflare/Supabase credentials and runs Windows (OpenNext Windows support "not guaranteed").
Each phase splits done-criteria into **[local]** (typecheck/lint/build/unit/curl on `next start`) and
**[live]** (needs real Cloudflare account or Supabase project). `[live]` items are release gates, not phase gates.

## Rollback

Every phase is additive on a fresh scaffold: revert the phase commit. No data migrations, no deployed state
except the Worker (roll back with `wrangler rollback`).

## Open questions

1. Approve FR-003 CSP deviation (static CSP now, strict script-src before first user-data page)?
2. Windows dev: is `cf:build`/`cf:preview` run via WSL/CI acceptable if native Windows fails?
3. INT-001 retry policy stays "no app-level retry" (spec § 5.3 #2) — confirm.
4. Cloudflare Rate Limiting Rule on `/auth/*` actions: dashboard-only, out of repo scope for v1 — confirm.
