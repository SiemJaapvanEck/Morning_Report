---
name: close
description: The closing ritual for every work session — gate, handoff, Linear update, push, PR. Use when wrapping up, "do the handoff", "push it", or at the end of any dispatched session. Works on task branches; for landing on main use /merge.
---

# /close — session close ritual

Turns the session into (a) pushed work and (b) a handoff the next session
builds on. **Run the steps in order.**

## 0. Preconditions
- On an issue branch (`<ISSUE-ID>-<slug>-<date>`; check with
  `git rev-parse --abbrev-ref HEAD`). On main → STOP: main only changes via
  /merge.
- Skim `git status` + `git diff --stat` so the handoff reflects reality.

## 1. Quality gate
```bash
.claude/hooks/gate.sh
```
- **Green** → continue as a finished phase.
- **Red** → do NOT discard work, do NOT fake success. Commit WIP as
  `checkpoint(gate-red): <issue-id> — <where it broke>`, and make the
  handoff + issue comment explain the failure and what was tried. Continue
  the ritual — an honest red handoff still gets pushed.

## 2. Rewrite HANDOFF.md (current-state, English)
Rewrite, don't append — for a reader who knows nothing: last-updated line
(date + branch + session type), where we stand, what this session did and
why, what's open, known issues (explicit about anything left broken).

## 3. Append a TIMELINE.md line
One dated line, newest at top: session type + summary
(e.g. `**21 Jul 2026 — dispatched:** MR-42 archive chart, gate green`).

## 4. Commit & push
Stage the session's work + HANDOFF.md + TIMELINE.md. English, present-tense,
issue-labelled message (`MR-42: archive multi-line chart + tests`), ending:
```
Co-Authored-By: Claude <noreply@anthropic.com>
```
```bash
git push -u origin HEAD
```

## 5. Update Linear
Comment on the issue: commit hash(es), gate result (green, or exactly what
was red), deviations from spec, open ends. Status: gate green + criteria met
→ the in-review status from `project.json` (no such status on the team →
apply the `in-review` fallback label instead); blocked/red → stays
`In Progress`.

## 6. PR
Open or update the PR: title `<ISSUE-ID>: <summary>`, body links the issue
and lists acceptance criteria met. CI reruns the same gate; the reviewer
agent takes it from here.

## 7. Report
Commit hash, branch, gate result, issue status, what's next — the truth,
compact.
