# Clarifications — Login (Google via Supabase Auth)

MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/GzbNeVGJHz
Specs: plans/momorph-specs/login-GzbNeVGJHz/specs.csv · Test cases: plans/momorph-specs/login-GzbNeVGJHz/test-cases.csv

## Session 2026-10-12

- Q: Foundation plan (261008-1631) phase 03 = email/password Supabase auth, conflicts with Login spec (Google only). → A: Fold minimal Supabase + Google OAuth into THIS plan; foundation phase 03 is superseded. Foundation deploy/CSP/health phases stay for later.
- Q: Post-login redirect (spec says /todo, Homepage not built)? → A: `/` (Homepage SAA). Keep it as one constant so it is easy to change.
- Q: Language selector VN/EN scope? → A: Figma UI + dropdown opens (VN/EN items) only. Real switching (NEXT_LOCALE cookie + translations) belongs to the separate "Đa ngôn ngữ" item.
- Q: Supabase project + Google OAuth client available? → A: Yes, the user has both. Plan includes a live Google login check using the user's `.env.local`.

## Defaults chosen by orchestrator (override if wrong)

- Process: lean (SDD off, `spec_waived`), `--level low`.
- Login error (Google failed / user cancelled) → message from spec: "Đăng nhập không thành công. Vui lòng thử lại." shown on /login (via `?error=` from the callback). No raw provider error is shown.
- Authenticated user visiting /login → redirect to `/`. Protecting other pages (unauthenticated → /login) is out of scope here; the Homepage plan adds it.
- Countdown gate still runs FIRST in proxy.ts; Supabase session refresh (`getClaims()`, never `getSession()`) composes after it.
- Test case "Google flow starts in a new tab or popup" → implemented as a full-page redirect (Supabase `signInWithOAuth` default). The E2E asserts navigation to the Supabase authorize URL with `provider=google`.
- Logo is not a link (test case says non-interactive). Footer text "Bản quyền thuộc về Sun* © 2025".
