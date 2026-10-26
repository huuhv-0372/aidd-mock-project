# Homepage header at 375px: old vs new

**Verdict: PRE-EXISTING.** The header renders the same at 375px before (`1512219`) and after (`a9a7c2d`, HEAD) the shell move in `440601c`. Guest and signed-in, the markup is byte-identical, the screenshots are pixel-identical, and the layout metrics match. The nav wrap is not a regression from `440601c`.

## Setup
- OLD = `1512219` (before the shell move). NEW = `a9a7c2d` (HEAD of main). Both built in detached worktrees under the session scratchpad. The main tree was not built or tested.
- Turbopack production build (`npx next build`) in each worktree, exit 0 for both. Turbopack needed `node_modules` as a real directory, not a junction, so it was hardlink-copied (`cp -al`).
- Fake Supabase: `E2E_FAKE_SUPABASE_PORT=54411 node tests/e2e/support/fake-supabase-server.mjs` (the port override in the server file). Port 54398 was not used. `/health` returned `{"ok":true}`.
- Servers: `npx next start -p 3301` (OLD) and `-p 3302` (NEW), both with `EVENT_START_AT=2020-01-01T00:00:00+07:00`, `AWARDS_CEREMONY_AT` = now + 2d 3h 4m 30s in `+07:00` (2026-10-16T11:25:16+07:00), `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54411`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_e2e_fake`.
- Signed-in state: one cookie `sb-127-auth-token` from `GET /__mint`, added for each origin.
- Viewport 375x812, DPR 1, `isMobile: true`. The pointer was parked at (0,0) and focus blurred before capture.
- Ports 3301, 3302, 54411 were confirmed free before start, and no listener remains after cleanup.

## Layout metrics (`header` element, Turbopack builds)

| Capture | Header height | Distinct link top-y values | Visual rows | Links | scrollWidth |
|---|---|---|---|---|---|
| old-guest | 172 | 16, 18, 68, 116 | 3 (logo row, nav row 1, nav row 2) | 5 | 375 |
| new-guest | 172 | 16, 18, 68, 116 | 3 | 5 | 375 |
| old-authed | 172 | 16, 68, 116 | 3 | 4 | 375 |
| new-authed | 172 | 16, 68, 116 | 3 | 4 | 375 |

The nav links wrap to 2 lines in both states. "About SAA 2025" and "Awards Information" share row 1, and "Sun* Kudos" drops to row 2. The 16/18 pair is the logo, VN selector and login/avatar row, which sits 2px off. It is not a second nav row.

Earlier measurements (header 168/206px) came from a first attempt using `next build --webpack`. That build emits no Tailwind utilities (the project uses `@tailwindcss/turbopack`), so the page was unstyled and those numbers are discarded.

## Pixel diff (browser canvas, exact RGBA compare)
- guest: full viewport 0 / 304,500 pixels differ. Header region (0..206px) 0 / 77,250.
- authed: full viewport 0 / 304,500 pixels differ. Header region 0 / 77,250.
- Diff ratio 0. Metric is exact, so OLD and NEW are identical at this viewport.

## Rendered banner HTML (`outerHTML` of `<header>`)
- guest: `old-guest-banner.html` and `new-guest-banner.html` are both 5193 bytes. `cmp` exit 0.
- authed: `old-authed-banner.html` and `new-authed-banner.html` are both 6760 bytes. `cmp` exit 0.

## Screenshots
Directory: `plans/261013-1554-awards-information/reports/visual/header-compare/`
- `old-guest-375.png`, `new-guest-375.png` (md5 f1624ee5..., identical pair)
- `old-authed-375.png`, `new-authed-375.png` (md5 0e067236..., identical pair)

Both guest captures show the nav wrapping to 2 lines under the logo row. The signed-in capture shows the bell icon and avatar in place of the login button.

## Commands and exit codes
- `git worktree add --detach <scratch>/old-1512219 1512219`: 0
- `git worktree add --detach <scratch>/new-head HEAD`: 0
- `mklink /J node_modules` into both worktrees: created, but Turbopack then failed (`next build` exit 1, "Symlink node_modules could not be resolved"). Discarded.
- `npx next build --webpack` (OLD, NEW): exit 0 each. Discarded because the output lacks Tailwind CSS.
- `cp -al <main>/node_modules <wt>/node_modules` (both): exit 0
- `npx next build` (OLD, turbopack): exit 0
- `npx next build` (NEW, turbopack): exit 0
- `node tests/e2e/support/fake-supabase-server.mjs` with port 54411: running; `curl /health` returned `{"ok":true}`
- `npx next start -p 3301` and `-p 3302`: both `/favicon.ico` returned 200
- `node capture-header.cjs` (Playwright, chromium): exit 0
- `node diff-pixels.cjs`: exit 0
- `cmp` old vs new banner HTML, guest and authed: exit 0 and 0
- `taskkill` on the server and fake-server PIDs: SUCCESS (3301, 3302, 54411)
- `rmdir` of the node_modules junctions (the target directory was not touched): exit 0
- `rm -rf` of the hardlinked node_modules copies in the scratch worktrees: exit 0. Main `node_modules` still has 312 top-level entries and `next/package.json` resolves.
- `git worktree remove --force` on both: failed with "Filename too long" (exit 255). Removed the directories with `rm -rf` after clearing node_modules. Then `git worktree prune`: exit 0. `git worktree list` now shows only the main tree.

## Working tree note (not caused by this task)
`git status --short` in the main tree currently shows:
- ` M components/awards/awards-hero.tsx` (5 insertions, 4 deletions)
- `?? public/images/awards/`

These were not present at session start. They come from the other agent working in the main tree. This task created no change there. The tracked files were not edited, and no main-tree build or e2e run was made.

## Concerns
- No deterministic exact-match claim beyond the pixel metric above. The `isMobile` flag and Turbopack-built output are the conditions under which the zero-diff result holds. A desktop or non-turbopack build was not checked.
- The row-count test measures link tops, not text wrapping. The visual confirmation came from the screenshots.

**Status:** DONE
