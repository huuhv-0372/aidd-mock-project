# Mutation proofs (expected RED, all reverted)

- `MUTATION feedPage cursor -> ms < cursorMs; npx playwright test -g ID-6` → exit 1 (expected fail). expected RED: sun-kudos-feed.spec.ts:27 expected 28 received 27 (tie at page boundary skipped); mutation reverted, cmp identical (2026-10-19T09:03:00+07:00)
- `MUTATION kudo-post-card sender unmasked + fixture rowFor sender for anonymous; next build; npx playwright test -g 'anonymous kudo'` → exit 1 (expected fail). expected RED: sun-kudos-feed.spec.ts:80 expected 'Đồng đội ẩn danh' received 'Phạm Thu Hà'; both files reverted, cmp identical (2026-10-19T09:07:00+07:00)
