---
name: merge
description: Double-gated landing of a reviewed task branch onto main — gate on source, gate on merged result, automatic rollback on red, Linear issue to Done. Use only after the reviewer approved the PR. Never merge unreviewed work.
---

# /merge — land a task branch on main

Belt-and-suspenders: gate on source, conflict dry-run, gate on destination,
rollback on failure. **Nothing lands until both gates are green.**

## 0. Preconditions
- The branch's PR is **reviewer-approved** and CI is green. Not approved →
  STOP; dispatch the reviewer first.
- **Autonomy:** `auto-ok` issues may be merged by the orchestrator without
  asking Siem (the double gate below is the protection). `needs-siem` issues
  → wait for Siem's explicit go.
- **Sequencing parallel branches:** land one at a time. After each landing,
  rebase (or re-merge) the next branch on the new main and re-run its gate
  before merging it.
- On the task branch. Record it as `TASK_BRANCH`. Show what will land:
  `git log origin/main..HEAD --oneline`.
- The /close ritual ran (HANDOFF/TIMELINE in the commits):
  `git diff --name-only origin/main..HEAD | grep -E "HANDOFF|TIMELINE"` —
  missing → STOP, run /close on the branch first.

## 1. Gate on the task branch
`.claude/hooks/gate.sh` — red → STOP, fix on the branch, re-run /close.

## 2. Merge dry-run on main
```bash
git fetch origin main
git checkout main && git pull --ff-only origin main
git merge --no-commit --no-ff TASK_BRANCH
```
Conflicts → abort cleanly and report exactly which files:
```bash
git reset --hard HEAD && git checkout TASK_BRANCH
```
Never force through a conflict.

## 3. Update the ritual files for main context
While the merge is staged: HANDOFF.md last-updated line → today + "merged
`TASK_BRANCH` → main"; drop branch-only notes; keep open work + gotchas.
TIMELINE.md: dated line "Merged `TASK_BRANCH` → main — <summary>. Double
gate green."

## 4. Complete the merge commit
```bash
git add HANDOFF.md TIMELINE.md
git commit -m "Merge TASK_BRANCH → main: <ISSUE-ID> <summary>

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## 5. Gate on merged main — the critical check
`.claude/hooks/gate.sh`
- **Green** → push.
- **Red → ROLLBACK immediately:**
  ```bash
  git reset --hard ORIG_HEAD && git checkout TASK_BRANCH
  ```
  Verify main is back (`git log --oneline -3`), report exactly which step
  failed. Main never stays red.

## 6. Push & finish
```bash
git push origin main
```
(The guard hook passes — step 3 put the ritual files in the merge commit.)
Then: Linear issue → `Done` with a closing comment (merge commit hash,
double-gate green); remove the worktree
(`git worktree remove <worktreeDir>/<ISSUE-ID>`); delete the remote branch.

## 7. Report
Merge hash, branch, both gate results, issue closed, next `Ready` work.
