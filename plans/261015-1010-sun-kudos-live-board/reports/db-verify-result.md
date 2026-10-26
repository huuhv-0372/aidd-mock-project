# DB verify result — real Supabase (2026-10-15)

Run by hoang.van.huu in the Supabase SQL Editor, in order: migration `20261015100000_create_kudos.sql` → seed `20261015_kudos_demo_seed.sql` → verify `20261015100000_create_kudos_verify.sql`. Result reported as screenshots (summarised here).

**20/20 PASS**

| # | Check | Result | Detail (abridged) |
|---|-------|--------|-------------------|
| 1 | S1 10 tables exist, RLS enabled on all | PASS | rls_on=10 |
| 2 | S2 anon has no table privileges | PASS | none |
| 3 | S3 authenticated: select on catalogs only | PASS | ok |
| 4 | S4 catalog policies use is_allowed_account; no other policies | PASS | catalog_policies=3 all_policies=3 |
| 5 | S5 RPC execute: authenticated only; helpers: nobody | PASS | bad_rpcs=none bad_helpers=none |
| 6 | S6 RPCs definer + stable + search_path + account rule | PASS | ok |
| 7 | S7 catalogs: 50 departments, 13 hashtags (VI+EN), ≥1 gift | PASS | departments=50 hashtags=13 gifts=1 |
| 8 | S8 FK profiles.department → departments | PASS | fk_count=1 |
| 9 | S9 sign-in triggers intact; kudo_hearts triggers present | PASS | sign_in=3 kudo_hearts=2 |
| 10 | B1 checks reject self-kudo, blank title, stray alias, half-open box, unknown dept | PASS | rejected=5/5 |
| 11 | B2 own heart rejected; x1 normal day; x2 special day; heart_count +1 per heart | PASS | own=cannot heart own kudo |
| 12 | B3 kudos_feed: order, keyset, anonymous sender hidden, row shape, limit 1..20 | PASS | — |
| 13 | B4 filters: hashtag / department / both / unknown slug (feed + highlight) | PASS | unknown_slug_rows=0 |
| 14 | B5 highlight order, spotlight, my_stats, latest gifts, catalogs readable | PASS | my_stats=1,2,3,1,1 |
| 15 | B6 authenticated cannot select/insert transactional tables directly | PASS | denied=8/8 |
| 16 | B7 liked_by_me / is_mine per viewer; anonymous sender hidden from recipient | PASS | — |
| 17 | B8 wrong domain / non-Google / no claims see nothing | PASS | ok |
| 18 | B9 anon denied on 5 RPCs + 3 catalogs | PASS | denied=8/8 |
| 19 | B10 heart_count = count(*) after unheart/delete; dept delete sets null | PASS | mismatched_kudos=0 |
| 20 | B11 anonymous Kudo does not change recipient distinct_senders | PASS | before=1 after=1; kudos_received 2→3 |

Real-app check: after migration + seed the user signed in with Google and opened `/sun-kudos` (sign-in path intact). A zod `z.uuid()` rejection of md5-derived seed ids surfaced there and was fixed (`z.guid()`, see plan Scope drift).
Not reported: a second migration run to prove idempotency.
