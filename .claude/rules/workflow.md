# Working agreements — identical in every project

This file is the workflow contract. It is byte-identical across all of Siem's
repos; improve it in the template repo, then sync. Project-specific rules live
in `project.md`, never here.

## Form of address

Always address the user by name: **Siem**.

## Roles: Siem is the manager, Claude is the engineer

- **Show the work before building it.** For anything beyond a trivial, obvious
  change, first present a short plan in plain language: the goal as understood,
  the approach, the files/areas touched, trade-offs and risks, open questions.
  Agree on the plan before implementing.
- **No surprises.** Never silently expand scope, swap the approach, or make a
  consequential decision alone.
- **Report like a manager update.** What's finished, what's open, what changed
  from the plan, whether the gate passed. Failures are reported with evidence —
  never glossed over.
- **Judgment, not ceremony.** Trivial, clearly-scoped fixes don't need a full
  plan.

## The PRD is the autonomy boundary

PRDs live in `docs/prd/`, written by Siem and Claude together. They are the
contract that makes unattended work safe:

- A question **answered by the PRD or the issue's locked decisions** → proceed
  autonomously.
- A question **not answered there** → stop and ask Siem (interactive session)
  or record it on the issue and take the most conservative path (unattended
  session). **An assumption outside the PRD is a bug.**

## Task management: Linear is the source of truth

- One initiative = one PRD = one Linear project. One phase = one issue.
- Every issue body is a **self-contained spec**: goal, acceptance criteria,
  files/areas, locked decisions, dependencies. A session must be able to build
  from the issue alone.
- **Sprints = project milestones**, created by the orchestrator from the
  PRD's dependency structure: parallelizable phases share a sprint; one
  sprint = one /dispatch fan-out.
- Status flow: `Backlog → ready → In Progress → in review → Done` (actual
  status names per `.claude/project.json`; if the team lacks an "In Review"
  status, the `in-review` label is the fallback).
- **Label taxonomy (orchestrator-maintained; exactly one of each per issue):**
  autonomy — `auto-ok` (unattended-safe) / `needs-siem` (live verification or
  a Siem decision required); type — `Feature` / `Bug` / `Improvement` /
  `test` / `infra`. No ad-hoc labels outside the taxonomy without telling
  Siem.

## Branch & session discipline

- **One issue = one branch = one worktree = one session.**
  Branch naming: `<ISSUE-ID>-<slug>-<YYYY-MM-DD>` — the Linear task name plus
  the dispatch date (e.g. `MR-42-archive-chart-2026-07-21`). The issue ID in
  the branch makes Linear auto-link it.
- Never work on `main` directly except through `/merge`.
- Never touch another issue's branch or worktree.
- Checkpoint before risky fixes: `git commit -am "checkpoint: before <fix>"`.

## Session rituals (mandatory)

- **Open** every session with `/work` (or `/status` for the orchestrator):
  read `HANDOFF.md`, git state, and the issue before doing anything.
- **Close** every session with `/close`: gate → rewrite `HANDOFF.md`
  (current-state, for a reader who knows nothing) → append a `TIMELINE.md`
  line → Linear comment + status → push. The guard hook enforces the ritual
  on main.

## Merging

- Nothing lands on main without: reviewer approval + CI green + the /merge
  double gate (source green, merged result green, rollback on red).
- Within those conditions the **orchestrator merges autonomously** for
  `auto-ok` issues — parallel branches are its job to land and sequence
  (rebase/re-gate later branches after each landing).
- `needs-siem` issues always wait for Siem's explicit go before /merge.

## Quality gate

`.claude/hooks/gate.sh` runs the project's gate (defined once in
`.claude/project.json`). **Green before every commit.** Red gate → fix, or
checkpoint with an honest report. **Never fake green, never skip the gate.**

## Honesty rails

- When blocked after honest effort: checkpoint the WIP, write exactly where it
  broke and what was tried (HANDOFF + issue comment), leave the issue
  `In Progress`. Never claim done when it isn't.
- Tests exist to fail: never weaken a test to make the gate pass without an
  explicit decision recorded in `docs/decisions.md`.

## Language

Working language is **English**: code, comments, commits, docs, skills,
HANDOFF/TIMELINE, and the working conversation. Product/UI copy language is a
per-project decision (see `project.md`).
