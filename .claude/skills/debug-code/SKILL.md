---
name: tkm:debug-code
description: "Locate the fault before you reach for a tool. Reach for this on bugs, failing tests, behavior that surprises you, slowdowns, call-stack tracing, layered validation, reading logs, broken CI/CD runs, database trouble, and wider system investigation."
languages: all
argument-hint: "[error or issue description] [--level low|medium|high|max]"
metadata:
  author: takumi-agent-kit
  version: "4.0.0"
module: bug-fixing-debugging
triggers: ["investigate", "why is X happening", "root cause", "strange behavior", "unexpected", "trace", "diagnose"]
---

# Finding the Flaw

Sand over a crack and the crack comes back — every time, until you chase it to where it began.
Each repair that misses the origin only leaves the work more brittle than you found it.

What this skill gives you is a disciplined hunt for that origin: follow the symptom back to its
source, prove the failure at each layer it passes through, and earn the word "fixed" with evidence.

## The Debug Law

**Prove the root cause before you change a single line.**

Guessing burns hours and seeds fresh defects. Pin down where the failure is actually born.
Repair it there. Confirm it holds at every layer. Show the evidence before you call it done.

## When to Use

**Code-level:** Failing tests, defects, behavior that surprises you, broken builds, integration snags
**System-level:** Server faults, broken CI/CD runs, things getting slower, database trouble, log reading
**Always:** Before you call any work finished

## Processing Level

Takes `--level low|medium|high|max` (default: `medium`).
Global semantics live in `_shared/processing-levels.md`.

| Level | Investigation depth | Task tracking | Parallel collection |
|-------|--------------------|--------------|--------------------|
| `low` | Root cause only (Phase 1) | No | No |
| `medium` *(default)* | Phase 1–2 + root cause tracing | No | No |
| `high` | Full 4-phase + defense-in-depth | Yes (3+ steps) | No |
| `max` | All techniques + perf diagnostics | Yes | Yes |

## Techniques

The method itself — investigate before you touch, trace to the origin, fix the source not the
symptom — is yours to run. These references carry what the method alone does not: our tools,
our contracts, our evidence rules.

### Verification (`references/verification.md`)

**Iron law:** NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE. Run the command. Read what
it prints. Then — and only then — state the result.

**Load when:** You're about to call work done, fixed, or passing

### Log & CI/CD Analysis (`references/log-and-ci-analysis.md`)

Pull and read logs from servers, CI/CD pipelines (GitHub Actions), and application layers.
Tools: `gh` CLI, structured log queries, correlation across sources.

**Load when:** Red CI job, server incident, anything whose evidence lives in logs

### Performance Diagnostics (`references/performance-diagnostics.md`)

**Load when:** Slow endpoints, regressions, resource exhaustion

### Reporting Standards (`references/reporting-standards.md`)

**Load when:** Writing the debug report — shape, evidence chain, unresolved questions

### Task-Managed Debugging (`references/task-management-debugging.md`)

**Load when:** Investigation spans 3+ steps, parallel log collection, coordinating debugger subagents

### Frontend Verification (`references/frontend-verification.md`)

Eyeball frontend work through Chrome MCP (Claude Chrome Extension), falling back to the
`tkm:automate-browser` skill. Screenshot plus console-error sweep, then report.

**Load when:** Work touches frontend files (tsx/jsx/vue/svelte/html/css), UI defects, visual regressions

### Test pollution

`scripts/find-polluter.sh` bisects a test suite to find the test that poisons a later one.

**Load when:** A test passes alone and fails in the suite (or vice versa)

## Quick Reference

```
Any defect     → investigate to root cause, then verification.md before claiming done
  Test pollution → scripts/find-polluter.sh (bisect)
  CI/CD failure  → log-and-ci-analysis.md
  Slow system    → performance-diagnostics.md
  Need report    → reporting-standards.md

Frontend fix   → frontend-verification.md (Chrome/devtools)
```

## Tools Integration

- **Database:** `psql` for PostgreSQL queries and diagnostics
- **CI/CD:** `gh` CLI for GitHub Actions logs and pipeline debugging
- **Codebase:** `tkm:search-docs` skill for package/plugin docs; `tkm:pack-codebase` skill for a codebase summary
- **Survey:** `/tkm:scan-codebase` or `/tkm:scan-codebase ext` to locate the files that matter
- **Frontend:** Chrome browser or the `tkm:automate-browser` skill for visual checks (screenshots, console, network)
- **Skills:** Reach for the `tkm:solve-problem` skill when a hard problem has you stuck

## Warning Signs

Catch any of these thoughts and walk back to the structured process:
- "Quick patch now, I'll dig in later"
- "Let me just tweak X and watch what happens"
- "Probably X — I'll change that"
- "Should be working now" / "Looks fixed"
- "Tests are green, call it done"

**Every one is the same signal:** return to systematic investigation. The shortcut that skips the process is exactly what plants the next defect.
