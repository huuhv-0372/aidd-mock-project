# Re-review fix round 1 (strong tier) — persisted by controller 2026-10-23

**Decision:** REWORK · score 9 · 0 Critical. Verdict JSON verbatim: reviewer-261023-rereview-1-verdict.json.

- Addressed: H1 export chunking (fetch-admin-users-for-export.ts:23-51 + tests :95-144), M1 hearts exclude anonymous (migration :127-133, live V6a/V6a2), L2 V8c label, L3 toast provider lifted, L4 BOM escape, L5 .gitignore. L1 Promise.all rejection upheld (is_admin revoked from anon).
- Resolved by named records: export refutation; unproven 1 (role column/triggers/no API write — live 24/24, V2 real trigger path), 2 (1440 visual), 3 (VI/EN, 375, 44px), 4 (suites, build, Worker, verify).
- **Still unproven:** concurrent demotion (criterion 7) — structure proven live (S1 VOLATILE, S3 lock before is_admin, V9), but behaviour depends on READ COMMITTED; close with a two-tab test or a recorded `default_transaction_isolation = 'read committed'` (no role override).
- New Lows (Accept): export chunks can duplicate/miss a row if data reorders between chunks without changing total (fetch-admin-users-for-export.ts:36, fix: Set of userIds → error); row menu floats when the table box is scrolled sideways (admin-user-actions-menu.tsx:67, fix: also close when outside admin-table-scroll rect).
- riskGate: touchesSensitiveArea + signoffRequired (migration + RBAC verify), humanSignedOff false.
