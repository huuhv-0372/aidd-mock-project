---
name: project-nextjs16-docs-blocked-and-env-ignore
description: Snags hit when planning in aidd-mock-project — Next 16 docs path blocked by tkmignore, .env* ignore swallows example files
metadata:
  type: project
---

- AGENTS.md demands reading `node_modules/next/dist/docs/`, but the kit hook blocks any path matching `dist` (tkmignore). Agents cannot edit the ignore list.
  **Why:** guardrail hook; only the user may add `!dist`.
  **How to apply:** in plans, tell implementers to ask the user or use `tkm:search-docs` for Next.js 16 (proxy.ts) docs.
- `.gitignore` has `.env*` → any `.env*.example` is ignored too; plans must add a `!.env*.example` negation.
- F001 Login plan (2026-10-05): `plans/261005-1220-login-google-oauth-supabase/` — MoMorph e2e-red-first; RED E2E gate is a separate tester phase before Track A/B.
