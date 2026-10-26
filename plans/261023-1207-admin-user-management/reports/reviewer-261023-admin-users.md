# Review pass 1 — Admin - User (strong tier, read-only) — persisted by controller 2026-10-23

**Decision:** REWORK · score 8 · 0 Critical. Verdict JSON verbatim: [reviewer-261023-pass1-verdict.json](reviewer-261023-pass1-verdict.json).

## Security core — holds
is_admin() reads profiles.role for auth.uid() + is_allowed_account; every admin RPC checks it first and leaks nothing; definer + search_path '' + schema-qualified; no dynamic SQL; revoke public/anon, grant authenticated; profiles still SELECT-only (role not self-assignable); sign-in triggers never touch role; admin_set_user_role lock → forbidden → self → invalid → not_found → ok, VOLATILE under READ COMMITTED so the second concurrent demoter sees the commit and gets forbidden; level = distinct non-anonymous senders; hearts = kudos_my_stats; search escapes \ % _; clamps; window totals before paging; rollback complete; verify not tautological. TS: connection() → requireAdmin() → forbidden() with authInterrupts and no Suspense above; CSV route gates itself; generic errors; strict zod; client-safe href; dictionary slices only; vi/en parity; files < 200 lines.

## Findings
- **H1 (Accept)** `app/[locale]/admin/users/export/route.ts:34-36` — PostgREST db-max-rows (default 1000) caps RPC results; export of 1,001–5,000 rows silently truncated. Fix: fetch in 1000-row chunks (row_no/order stable) or guard rows.length !== total.
- **M1 (Defer → owner)** migration `:125-130` — Total Heart includes hearts on the user's anonymous Kudos; per-Kudo hearts are public, so an admin could match a sender to an anonymous Kudo.
- **L1 (Accept)** `header-session-controls.tsx:17-19` — getIsAuthenticated then getIsAdmin in series; Promise.all.
- **L2 (Accept)** verify `:548-558` — V8c label "99999 -> all" does not prove the 5000 clamp; reword.
- **L3 (Accept)** `admin-users-table.tsx:53` — AdminToastProvider inside the table; lift to AdminUsersView so the status survives an emptied list.
- **L4 (Accept)** `users-csv.ts:20` — invisible literal BOM; write "﻿".
- **L5 (Accept)** `.gitignore` — `.playwright-mcp/` not ignored.
- **L6 (Defer)** role readable by every signed-in user (assumption 3, owner-accepted).
- **L7 (Defer → docs)** deploy order: migration before app, else is_admin fails closed with logs.
- **Low UX (Defer → owner)** comma CSV may open as one column in Vietnamese-locale Excel.
- Controller's two edits (Role hint removal, aria-labelledby label check): sound.

## Unproven (need records)
Real SQL verify + Google sign-in; 1440 visual; 375 runtime; build/full E2E/bundle; concurrent demotion on live DB (analysis only).
