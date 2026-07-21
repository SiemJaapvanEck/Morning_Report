---
name: dispatch
description: Fan out ready Linear issues into parallel work sessions — one worktree + branch + implementer per issue, or scheduled cloud sessions for unattended runs. Use when Siem says "dispatch", "start the work", "run these issues", or for overnight runs ("dispatch --schedule").
---

# /dispatch — fan out the ready work

One command = the whole fan-out. Two modes: **now** (parallel local
worktrees) and **--schedule** (unattended cloud/scheduled sessions).

## 1. Select the work
- Default unit is the **current sprint** (the earliest project milestone with
  open issues): query its issues in the ready status with no open blockers
  (config in `.claude/project.json`). A sprint = one fan-out; when a sprint
  fully lands, promote the next sprint's unblocked issues to ready.
- **Unattended mode: only `auto-ok` issues.** `needs-siem` issues are never
  dispatched unattended — list them for Siem instead.
- Present the dispatch list (issue, label, branch name, mode) — **Siem
  approves before anything launches.** He may cap the count.

## 2. Prepare isolation — per issue
```bash
git fetch origin
BRANCH="<ISSUE-ID>-<slug>-$(date +%F)"    # Linear task name + dispatch date
git worktree add <worktreeDir>/<ISSUE-ID> -b "$BRANCH" origin/main
```
`worktreeDir` from project.json. If the branch already exists (re-dispatch
after a fix list), add the worktree on the existing branch instead.

## 3. Launch — per issue

**Now mode:** start an implementer session in each worktree. The kickoff
prompt is only: *"Run /work on Linear issue <ISSUE-ID>."* — the issue carries
the spec; nothing else needs injecting.

**--schedule mode:** create one scheduled session per issue, staggered so a
sprint can finish and push before the next fires. Same one-line prompt. Cloud
sessions start from a bare clone: they run the gate only — no secrets, no
live DB, migration files only (the implementer rails already say this).

## 4. Update the board
Dispatched issues → `In Progress`, with a comment: branch, worktree/session,
mode, timestamp.

## 5. Report
Tell Siem: what launched where, what was withheld (`needs-siem`, blocked,
capped) and why, and when to expect results (/status shows them).

## Cleanup rule
After an issue merges (/merge), remove its worktree:
`git worktree remove <worktreeDir>/<ISSUE-ID>` and delete the branch.
