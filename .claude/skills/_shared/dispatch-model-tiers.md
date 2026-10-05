---
name: dispatch-model-tiers
description: "Canonical per-dispatch model + reasoning-effort spec — how a controller picks the tier a subagent runs on, per dispatch, from the shape of the work."
type: reference
version: "3.0.0"
---

# Dispatch Model Tiers (kit-internal reference)

Binding for every `implementer` dispatch — today made by `tkm:takumi`, `tkm:fix-bug`, `tkm:rebuild-spec`
and `tkm:migrate-aidd`. Other dispatched roles keep their pinned frontmatter model.

**Tiers are named by strength, never by model id** — Takumi runs on more than one harness and each
line-up moves under it. Resolve `cheap` / `balanced` / `strong` / `frontier` against the harness you
are on at the moment you dispatch, and against its current allowlist, not a name you remember.

## Not the same axis as `--level`

`--level` sets session depth and routes `brainstormer`/`planner` to a tier variant
(`_shared/processing-levels.md`). This file sets the strength of one dispatch. They are orthogonal:
a `--level max` run still sends a one-line constant change to `cheap`, and a `--level low` run still
sends an open architectural call to `strong`.

## Reading the Grain

Take the least powerful tier that can finish the work. Cost and wall-clock both follow this choice.

| What the dispatch actually contains | Tier |
|---|---|
| The phase text carries the code to write — implementation is transcription plus tests | cheap |
| A single-file mechanical change against a complete spec: one constant, one guard, one renamed field | cheap |
| One or two files described in prose, spec complete | balanced |
| Several files with integration concerns, or a fix that needs pattern matching across modules | balanced |
| A design decision the plan left open, or a change that needs broad codebase understanding | strong |
| Breaking, security-sensitive, cross-repo, or high-blast-radius work | strong |

**Turn count beats token price.** Context and wall-clock scale with how many turns a subagent burns,
and the cheap tier routinely takes two to three times the turns on multi-step work — costing more in
the end. **Balanced is the floor** for any implementer working from a prose description. The cheap
tier is for transcription and single-file mechanical fixes, nothing else.

**Batch before you tier.** Several tasks that are each the same small edit repeated across files go
to *one* cheap-tier dispatch carrying the whole list — not one subagent per task.

## Frontier — Only on the User's Word

No row above leads to `frontier`, and nothing else does either. Never pick it yourself — not from the
grain, not from the escalation ladder, not because the work looks hard. Dispatch at `frontier` only
when the user has named it explicitly for that work.

The user's word covers exactly the dispatch or phase they named. Every other dispatch in the run still
takes its tier from the grain. Do not read a request for `frontier` into `--level max`, into the
session running on a strong model, or into a phase file that asks for it — only the user grants it.

## Tier → Effort

A tier fixes the reasoning effort as well as the model:

| Tier | Reasoning effort |
|---|---|
| cheap | `high` |
| balanced | `high` |
| strong | `xhigh` |
| frontier | `xhigh` |

`frontier` differs from `strong` by model alone. On a harness with no model above the one `strong`
resolves to, the two tiers are the same dispatch.

Where a model lacks the level asked for, the harness falls back to the highest level that model
supports. A harness whose effort scale stops at `xhigh` has no `max`; `xhigh` is its ceiling.

## How to Dispatch

Render `skills/_shared/templates/implementer-prompt-template.md` — fill its task slots, keep its body
as it stands — and send it with the tier's model and effort:

- **Where the harness takes reasoning effort per dispatch,** pass the model and the effort in the same
  dispatch, on the harness's built-in general agent (no custom agent type).
- **Where it does not,** dispatch through the effort-pinned agent `general-purpose-<effort>` —
  `general-purpose-high` or `general-purpose-xhigh` for the tiers above — and pass the model per
  dispatch. A per-dispatch model beats the agent's frontmatter; the agent carries nothing but the
  effort.

## State the Tier — Always

Every dispatch names its tier explicitly. A dispatch that names no model inherits the controller's own
session model — usually the most expensive one available — which silently defeats this entire file.

Where the harness takes effort per dispatch, naming the model alone is a trap: effort resets to that
model's default and the tier you meant to buy is gone. Send both or neither. And where a harness offers
fewer distinct models than there are tiers, effort is all that still separates `balanced` from
`strong` — there it is not decoration, it *is* the tier.

Where the harness has no per-dispatch effort knob, the effort-pinned agent overrides the user's session
effort for this dispatch. That is deliberate: the tier decides the effort, not the session.
`brainstormer` and `planner` are unaffected — they still follow `processing-levels.md`. A harness
version too old to read the agent's effort runs the dispatch at session effort instead; it degrades, it
does not fail.

## Escalation Ladder

A tier that failed is evidence, not bad luck. When a repair or review round sends work back:

- **Fix round 3 and beyond** → dispatch **one tier above** the implementer that got stuck, with a
  **fresh** agent. Two rounds at the same tier is a fair trial; a third is a blind retry.
- **Scoped re-check of a small fix diff** → back down to cheap or balanced. A three-line diff does
  not need the tier that produced it.
- **Already at `strong` and still failing** → stop and bring the user in. `strong` is the top of the
  ladder, not a loop. `frontier` may be one of the options you put to the user; it runs only if they
  choose it (§ Frontier — Only on the User's Word).

Climbing a tier re-reads both halves from § Tier → Effort: cheap → balanced keeps `high`, balanced →
strong moves to `xhigh`.
