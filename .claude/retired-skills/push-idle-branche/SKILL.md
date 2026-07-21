---
name: push-idle-branche
description: End-of-session handoff + push to the idle-work branch for Morning Report. The idle twin of /push-main. Use to close every scheduled idle session. Rewrites HANDOFF on the idle branch, appends a TIJDLIJN line, ticks the finished phase on the sprint board, runs the quality gate, commits and pushes to the IDLE BRANCH ONLY — never main.
---

# /push-idle-branche — idle coding-sprint close + push (Morning Report)

The idle twin of `/push-main`. Closes a coding sprint by **committing the code
that sprint wrote** and turning the session into a handoff the **next** idle
sprint (`/start-idle`) builds on. Everything targets the `idle-work/...` branch.
**This skill never touches `main`.**

## 0. Preconditions
- Confirm you are on an `idle-work/*` branch
  (`git rev-parse --abbrev-ref HEAD`). If you are on `main`, **abort** — this
  skill must never push main. (The `guard-push-main` hook only guards main, so it
  won't stop you here; the discipline is on you.)
- Skim `git status` and `git diff --stat` so the handoff reflects reality.

## 1. Rewrite HANDOFF.md (idle-run current state, English)
Rewrite, don't append. Write for the next idle session which knows nothing:
- `> Last updated:` → today's date + "idle run".
- **Where we stand** on the idle branch — which phases are done, which is next.
- What this session did, **why**, decisions made, and any assumptions taken to
  stay unattended.
- **What's open** — the next unchecked phase and anything it needs.
- **Known issues** — including anything left broken (be explicit).

## 2. Append a TIJDLIJN.md line (English)
A dated block: today's date + short summary, marked as idle work
(e.g. "Idle-run: Phase F1 …"). One block per session.

## 3. Tick the sprint board
In the run's plan doc (`docs/<subject>-plan.md`), check the box of the phase you
just finished so the next `/start-idle` picks up the correct next phase. If the
phase is **not** actually done (gate red / blocked), leave the box unchecked and
say so in HANDOFF.

## 4. Quality gate
```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

- **Green** → continue to commit as a finished phase.
- **Red / blocked** → do NOT discard work and do NOT fake success. Commit the WIP
  as a clearly-marked checkpoint (`checkpoint(gate-red): <phase> — <where it broke>`),
  make sure HANDOFF §Known-issues explains the failure and what was tried, leave
  the sprint-board box unchecked, and still push (so the next session resumes it).

## 5. Commit
Stage the session's work + HANDOFF.md + TIJDLIJN.md + the plan doc. English
commit message, present tense, phase-labelled (e.g.
`Phase F1: entity registry table + pure module + tests`). End with:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

## 6. Push to the idle branch (never main)
```bash
git push -u origin HEAD
```
Pushes the current `idle-work/*` branch. This does **not** trigger a Vercel
deploy (only `main` does) and does **not** trip the push-main guard.

## 7. Report
State the commit hash, the branch, the gate result (green, or exactly what was
red), and which phase is now done vs. next — so the morning review and the next
scheduled session both have the truth.
