---
name: work
description: Session kickoff on one Linear issue — the opening bookend to /close. Use at the start of every implementation session, interactive ("let's pick up MR-42", "waar waren we") or unattended (dispatched sessions open with it). Orients on issue + branch + handoff, then builds.
---

# /work — session kickoff (one issue)

## 1. Resolve the issue
- Issue ID from the prompt, or: the `In Progress` issue assigned to this
  branch, or ask Siem which `Ready` issue to take (interactive only).
- Fetch the issue from Linear. **Check the spec is self-contained** (goal,
  acceptance criteria, files, locked decisions). If not: interactive → fix it
  with Siem now; unattended → comment what's missing on the issue and stop.
  Never guess a spec.

## 2. Get onto the branch
```bash
git fetch origin
git checkout <ISSUE-ID>-<slug>-<date>   # or -b --track origin/<branch>; create from origin/main if new
git pull --ff-only
```
Unattended sessions that cannot resolve their branch: **stop and report —
never fall back to main.**

## 3. Read continuity state
- `HANDOFF.md` (the SessionStart hook may have injected it — build on it).
- `git log -8 --oneline` + `git status --short` on the branch.
- The issue's comments — prior sessions and reviewer fix lists live there.
  **A reviewer fix list is the work order** — do it before anything else.
- If the issue is already `Done`/`In Review` unexpectedly: interactive → tell
  Siem; unattended → pick the next unblocked `Ready` + `auto-ok` issue instead.

## 4. Build
- **Interactive:** synthesize state in 2–3 sentences, propose the session
  plan, confirm with Siem before coding (workflow.md: show the work first).
- **Unattended:** proceed straight to implementation under the implementer
  rails (own branch, gate, migration files only, checkpoint before risk,
  never fake green).

Follow `.claude/agents/implementer.md` for the build loop and rails.

## 5. Close
Always end with **/close** — even when blocked (it handles red-gate
checkpointing honestly).
