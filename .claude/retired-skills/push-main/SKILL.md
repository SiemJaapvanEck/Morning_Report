---
name: push-main
description: End-of-session handoff + push to main for Morning Report. Use when the user asks to push to main, wrap up / close the session, or "do the handoff and push". Rewrites HANDOFF.md, appends a TIJDLIJN.md line, runs the quality gate, commits and pushes — the whole closing ritual under one handle.
---

# /push-main — session handoff + push (Morning Report)

The single handle for closing a work session. You hold the session context;
this skill turns it into the committed handoff the next account reads. Run the
steps in order and STOP if a gate fails — never push on red.

## 0. Preconditions
- Confirm the branch is `main` (`git rev-parse --abbrev-ref HEAD`). This project
  works directly on main; if you are somewhere else, ask before continuing.
- Skim `git status` and `git diff --stat` so the handoff reflects reality, not
  just your memory of the session.

## 1. Rewrite HANDOFF.md (full snapshot, English)
HANDOFF.md is a *current-state* document — rewrite it, don't blindly append.
Keep the existing structure and tone. The file is now written in English (older
entries may still be Dutch — translate as you rewrite). Write for a reader who
knows nothing about this session:
- The `> Last updated:` line at the top → today's date + the account name.
- **Where we stand** — what is true now.
- What was done this session, **why**, and any decisions made.
- **What's open** — open work and next steps.
- **Known issues** — including ones deliberately left.

## 2. Append a TIJDLIJN.md line (English)
Add a new dated block at the end: **today's date** + a short summary of what
happened this session. One block per session — details belong in HANDOFF.md and
git history. Match the existing bullet style.

## 3. Quality gate (must be green before pushing)
Run, and fix failures before continuing:

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

If anything fails: stop, report, fix — do not push.

## 4. Commit
Stage the session's work plus the two ritual files, then commit. Commit message
in **English** (code and commits are English in this project): a present-tense
summary of the session's change. End the message with:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

## 5. Push to main

```bash
git push
```

The `guard-push-main` PreToolUse hook checks that HANDOFF.md + TIJDLIJN.md are in
the pushed commits. If you did steps 1–2 it passes silently; if it blocks, you
skipped the handoff — go back to step 1.

## 6. Report
Tell the user the commit hash, confirm the gate was green, and confirm the push
succeeded — or surface exactly what failed.
