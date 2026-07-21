---
name: status
description: The orchestrator's cockpit view — morning review of overnight sessions, board deltas, PR/CI state, and what needs Siem. Use when Siem opens an orchestrator session, asks "what happened", "morning review", or "what should we do today".
---

# /status — the manager view

Orient fast, surface what needs Siem, propose the day. Synthesize — don't
recite.

## 1. Gather
- **Linear:** board state vs last TIMELINE entry — the current sprint
  (milestone) burn-down, what moved to review/`Done`, what's still
  `In Progress` (stalled?), new comments, blocked issues, `needs-siem`
  labels, whether the sprint is done and the next one should be promoted.
- **GitHub:** open PRs + CI results; reviewer verdicts (approved vs fix
  lists).
- **Repo:** `git fetch --all`, branches ahead/behind, `HANDOFF.md`, recent
  TIMELINE lines, stale worktrees.

## 2. Report to Siem (tight, manager-style)
- **Landed / progressed** since last review — 2–4 sentences.
- **Red flags** — red gates, checkpoint(gate-red) commits, stalled issues,
  CI failures, conflicts. Evidence, not gloss.
- **Needs you** — the explicit Siem-queue: migrations to apply, `needs-siem`
  verifications, blocked decisions, PRD questions raised by sessions.
- **Ready to ship** — reviewer-approved PRs awaiting /merge.

## 3. Propose the day
Ordered proposal: what to /merge, what to /dispatch (and whether any
overnight --schedule run makes sense), what to fix first, whether the board
needs a /prd or /plan refill. Recommend the top action; Siem confirms or
redirects before anything runs.
