---
name: merge-idle-to-main
description: Safely merge the current idle-work branch into main. Two gate checks (source + destination), conflict detection, automatic rollback on failure. Use after an idle run is reviewed and ready to ship — never merge before you've read the idle HANDOFF.md and are satisfied the work is correct.
---

# /merge-idle-to-main — idle-work → main (Morning Report)

Merges the current `idle-work/*` branch into `main` with belt-and-suspenders
safety: gate on source, gate on destination, conflict check, automatic rollback.
**Nothing is pushed until both gates are green.** If anything goes wrong, the
branch is left exactly as it was and you stay on the idle branch.

## 0. Preconditions — confirm the setup is sane

```bash
git rev-parse --abbrev-ref HEAD
```

- **Must be on an `idle-work/*` branch.** If you're already on `main` or a
  feature branch, STOP and tell Siem — do not continue.
- Record the branch name as `IDLE_BRANCH` (you'll need it later).
- Show what's ahead of origin/main so Siem knows what will land:
  ```bash
  git log origin/main..HEAD --oneline
  ```
- Confirm HANDOFF.md and TIJDLIJN.md are in those commits (the guard hook
  requires them; `push-idle-branche` puts them there):
  ```bash
  git diff --name-only origin/main..HEAD | grep -E "HANDOFF|TIJDLIJN"
  ```
  If neither file appears: STOP — the idle session did not run its close ritual.
  Tell Siem to run `/push-idle-branche` on the idle branch first.

## 1. Gate on idle branch — source must be green

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

**Green → continue. Red → STOP.** Fix the failing phase on the idle branch and
re-run `/push-idle-branche` before attempting this merge. Never merge a red branch
into main — the second gate would catch it, but why land on main at all.

## 2. Fetch main and check for conflicts — dry run

```bash
git fetch origin main
git checkout main
git pull --ff-only origin main
```

Now attempt the merge **without committing** to detect conflicts cleanly:

```bash
git merge --no-commit --no-ff IDLE_BRANCH
```

Check the exit code and `git status`:
- **Exit 0, no conflict markers** → clean merge, stay in this state (do NOT
  commit yet — we update HANDOFF.md first, then commit once).
- **Conflicts in `git status`** → abort by resetting main to HEAD (more reliable
  than `git merge --abort` when the working tree has untracked files):
  ```bash
  git reset --hard HEAD
  git checkout IDLE_BRANCH
  ```
  STOP and report exactly which files conflicted. Do not force through.

## 3. Update HANDOFF.md for main context

The merge is staged but not yet committed. Now update HANDOFF.md:

- Change the `> Last updated:` line to today's date + "merged to main
  from `IDLE_BRANCH`".
- Remove or update the "Standing rules for every idle session" section (it only
  applies on idle branches, not on main).
- Keep all the "What's next" and "Known gotchas" content — it remains valid for
  the next session.
- Keep the morning-review checklist if it's still relevant (e.g. "apply migration
  0017" if Siem hasn't done it yet).

## 4. Append a TIJDLIJN.md line

Add a dated block at the top of the entries (after the header):

```
- **<date> — Merged `IDLE_BRANCH` → main.** <one-line summary of what landed:
  e.g. "Phase F1 entity registry + Phase F2 scan typing + registry write-back.">
  Gate green on both source and destination.
```

## 5. Stage the handoff files and complete the merge commit

```bash
git add HANDOFF.md TIJDLIJN.md
git commit -m "$(cat <<'CMSG'
Merge IDLE_BRANCH → main: <brief description of what landed>

<bullet list of phases / key changes merged, e.g.:>
- Phase F1: entities registry table + seed + pure helpers
- Phase F2: scan entity typing + registry write-back

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
CMSG
)"
```

This creates one merge commit that includes both the idle-work code changes and
the updated handoff files. The guard-push-main hook sees HANDOFF.md and TIJDLIJN.md
in the diff and passes silently.

## 6. Gate on merged main — destination must be green

This is the critical check. Run the full gate on the merged result:

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

**Green → continue to push.**

**Red → ROLLBACK immediately:**

```bash
git reset --hard ORIG_HEAD
git checkout IDLE_BRANCH
```

`ORIG_HEAD` is set by `git merge` and points to exactly where main was before
the merge. Verify with `git log --oneline -3` that main is back to the pre-merge
commit before reporting. Return to the idle branch and report **exactly** which
gate step failed and what the error was so Siem can fix it on the idle branch
before trying again. Main must never stay in a red-gate state.

## 7. Push to main

```bash
git push origin main
```

The guard-push-main PreToolUse hook inspects the commits being pushed. Since
step 5 included HANDOFF.md and TIJDLIJN.md in the merge commit, the hook passes.
If it blocks anyway (edge case), do not skip or force — investigate why the
ritual files aren't in the diff and fix the root cause.

## 8. Report

State clearly:
- The merge commit hash
- The idle branch that was merged
- Gate result on idle branch: **green**
- Gate result on merged main: **green**  
- Whether the push succeeded
- What's next (the first open phase on the sprint board, or "ready for manual
  work on main")

If anything failed at any step, report the exact failure before handing back
to Siem — no glossing over.
