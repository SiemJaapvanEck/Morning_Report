---
name: setup-idle-work
description: Set up an unattended idle CODING run for Morning Report — Claude writes code in sprints while Siem is away. Use when Siem wants autonomous multi-phase implementation (e.g. overnight/cloud). Grills Siem into a phase plan detailed enough to run without him, opens the idle-work branch, then schedules one coding session per phase with THAT PHASE'S FULL SPEC INJECTED INTO ITS PROMPT, for Siem to approve.
---

# /setup-idle-work — plan, branch, and schedule an idle coding run

Run this before an unattended stretch. It turns a task into **per-phase coding
sprints**, isolates them on an idle branch, and schedules one session per phase —
**each session's prompt carries that phase's full build spec inline** so the
cloud session can start writing code immediately. Pairs with `/start-idle` (each
sprint's open) and `/push-idle-branche` (each sprint's close).

The bar: **when you finish this skill, nothing about the run should still need
Siem's input, and each scheduled prompt should contain everything that sprint
needs to write its code.** Every mid-flight fork must already be decided.

## 1. Grill Siem until the plan is unattended-ready (multiple rounds)
Interview Siem in **several rounds** — keep going until no open question could
stall an autonomous coding session. Use `AskUserQuestion` for decisions; prose
otherwise. Cover at least:

- **Subject & goal** — what to build, and what "done" looks like end-to-end.
- **Phases as sprints** — break the work so *one phase = one session = one
  buildable sprint*. For each phase pin down what a session needs to write code
  with no further input: its **goal**, concrete **acceptance criteria**, the
  **files/areas** it touches, and its **dependencies** on earlier phases.
- **Pre-decide the mid-flight forks.** Any design choice, naming call, trade-off,
  or budget ceiling a session might pause on — decide it **now** and record it.
- **Verification reality.** Idle sessions run the gate only (no paid pipeline, no
  live DB, no localhost). So a sprint's "done" = *code written, tests passing,
  gate green, migration file authored* — not live-verified. Say so, so acceptance
  criteria are gate-checkable, not "looks right in the reader".
- **Safety rails** (defaults, confirm/adjust): idle branch only; **never push
  main**; **write migration files, never apply them live** (Siem applies in the
  morning); budget under the edition ceiling; bug-backup rule; if blocked,
  checkpoint + honest HANDOFF, never fake green.
- **Scope of the run** — how many phases to attempt and the acceptable stop point.

Do not shortcut this. A thin spec is the main way an unattended coding run goes wrong.

## 2. Write the plan doc
Capture the result in `docs/<subject>-plan.md`, house plan format (see
`docs/threads-plan.md` / `docs/entity-typing-plan.md`): a **sprint board of
checkboxes** (one per phase) plus, **per phase, a self-contained spec block**
(goal · acceptance criteria · files · locked decisions). That per-phase block is
what gets injected into the phase's scheduled prompt in step 5 — write each one so
it stands alone.

## 3. Open the idle branch
From `main`, a **valid git name** — `idle-work/YYYY-MM-DD` (git rejects spaces and
bare `dd/mm/yyyy` slashes):

```bash
git checkout main && git pull --ff-only
git checkout -b idle-work/$(date +%Y-%m-%d)
```

## 4. Seed the branch: current state + plan + idle HANDOFF + idle skills
- Rewrite `HANDOFF.md` on this branch as the **idle-run start state** (the plan,
  which phase is first, the standing rules).
- **Commit the idle skills onto the branch** — cloud sessions start from a bare
  clone, so `.claude/skills/{setup-idle-work,start-idle,push-idle-branche}` must
  be present or the sessions can't run their rituals. Stage **selectively** (not
  `git add -A`, which drags in hooks, local settings, `.DS_Store`, throwaway
  scripts):

```bash
git add .claude/skills/setup-idle-work .claude/skills/start-idle \
        .claude/skills/push-idle-branche docs/<subject>-plan.md HANDOFF.md
git commit -m "Idle run <subject>: plan + idle skills + branch seed

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push -u origin HEAD
```

## Cloud execution — the facts that make this work (verified 2 Jul 2026)
- Idle sessions run **only the quality gate** (`lint / tsc / test / build`), never
  the paid pipeline — so they need **no secrets**: data pages are `force-dynamic`
  (no build-time DB calls), tests are pure vitest. A bare cloud clone passes.
- No AI keys, no Supabase connector at night — migrations are **files only**.
- Cloud/remote execution is **gated** per account; if unavailable at schedule
  time, fall back to local (Mac must stay awake).

## 5. Schedule one coding session per phase — INJECT EACH PHASE'S SPEC
Schedule **N sessions** (N = number of phases), staggered with enough spacing for
a sprint to finish and push before the next fires. **Each session's prompt embeds
that phase's own spec block** (copied from the plan doc in step 2) so the cloud
session opens with everything it needs to write code — it never has to infer its
task. Build each prompt from this template, substituting the real phase content:

> Idle coding sprint on branch `idle-work/YYYY-MM-DD`. Run `/start-idle`, then
> **implement Phase <N> — <name>** and write the code.
> **Goal:** <phase goal>.
> **Acceptance criteria:** <gate-checkable criteria>.
> **Files:** <files/areas>.
> **Locked decisions:** <the pre-decided forks for this phase>.
> Follow the standing autonomy rules (idle branch only, never push main, migration
> files only, bug-backup before risky fixes, gate green before close). If the
> phase is already done on the board, implement the next unchecked one instead.
> Close with `/push-idle-branche`.

Use the scheduling tooling (the `schedule` skill / scheduled cloud agents) so each
phase is **its own session**. Present the schedule to Siem for approval — the run
isn't live until he approves.

## 6. Confirm
Tell Siem: the branch name, the plan doc path, the number of phases/sessions and
their times, and the rails in force. Remind him the morning review is where he
applies the migration files, live-verifies, and decides on merging the idle branch
back to `main`.
