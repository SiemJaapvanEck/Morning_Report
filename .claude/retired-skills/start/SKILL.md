---
name: start
description: Start-of-session kickoff for Morning Report. Use when Siem opens a session, says "let's start", "waar waren we", "pak het project op", or asks what to work on next. Reads HANDOFF.md + git state, summarizes where things stand, and proposes a focused plan for the session.
---

# /start — session kickoff (Morning Report)

The bookend to /push-main. Orient fast, then hand Siem a concrete starting
point — don't just recite the handoff back at him.

## 1. Gather state
- Read `HANDOFF.md`. The SessionStart hook may have already injected it into
  context — if so, build on it rather than re-printing it verbatim.
- Run `git rev-parse --abbrev-ref HEAD`, `git status --short`, and
  `git log -5 --oneline` for branch, uncommitted work, and recent direction.
- If the open work touches design, skim the relevant part of `docs/ontwerp.md`
  (§8 decision log) and `docs/design.md`.

## 2. Synthesize (don't recite)
Give Siem a tight read in English:
- **Where we stand** — 2–3 sentences on the current state.
- **What's open** — the concrete open items from HANDOFF.md's open-work section.
- **Watch out** — known problems worth keeping in mind.
- Flag anything inconsistent — e.g. uncommitted changes that contradict the
  handoff, or a dirty tree on `main`.

## 3. Propose a plan, then confirm
- Propose 1–3 candidate tasks for this session, ordered, each with a one-line why.
- Recommend the top one. Ask Siem to confirm or redirect **before** doing work.
- For anything non-trivial, use plan mode so he can review before you code —
  this matches how Siem works (review-the-plan, check-on-localhost, approve-push).

## 4. Honor the working agreements
- Address the user as **Siem**.
- Pure `modules/`; step-machine pipeline (idempotent, ~7s); every AI call via
  `askAI()`; schema changes via numbered migrations (see CLAUDE.md). Never start
  a rewrite — extend.

Keep it short. Siem drives — the goal is a running start, not a status essay.
