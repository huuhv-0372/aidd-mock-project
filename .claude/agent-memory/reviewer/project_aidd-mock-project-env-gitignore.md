---
name: project-aidd-mock-project-env-gitignore
description: aidd-mock-project's .gitignore blanket-excludes all .env* files, including .env.example docs
metadata:
  type: project
---

`aidd-mock-project`'s `.gitignore` (from the original create-next-app template, line `.env*`)
excludes every dotenv file from git — including `.env.example`, which is meant to document
required env vars for other developers/ops.

**Why:** Found during F001 (Countdown Prelaunch Screen) review — a freshly created
`.env.example` documenting `NEXT_PUBLIC_EVENT_START_AT` showed as `!!` (ignored) in
`git status --porcelain --ignored`, meaning it would never actually be committed despite
being explicitly required by the plan.

**How to apply:** When reviewing any change that adds a new `.env.example` (or similar
`.env*.example` docs file) in this repo, check `git status --porcelain --ignored` for it.
If ignored, flag it — the fix is adding a `!.env.example` (or `!.env*.example`) exception
to `.gitignore`, not just creating the file.
