#!/usr/bin/env bash
# SessionStart hook for Morning Report.
#
# Primes a new session with the project's current state so you never have to
# paste the role/context paragraph by hand again. This hook's stdout is injected
# into Claude's context at session start. It pairs with the /start skill, which
# does the richer, on-demand kickoff (summary + proposed plan).
#
# Registered in .claude/settings.json under SessionStart.
#
# Fail-open: if anything is missing (no git, no jq, no HANDOFF.md) it prints what
# it can and exits 0 — it never blocks a session from starting.

set -uo pipefail

# Read the hook payload. Skip priming after a compaction: the compacted summary
# already carries the context forward, so re-injecting HANDOFF.md is just noise.
payload="$(cat)"
source="$(printf '%s' "$payload" | jq -r '.source // empty' 2>/dev/null)"
if [ "$source" = "compact" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

echo "# Morning Report — session priming (auto-injected by the SessionStart hook)"
echo
echo "You are picking up the Morning Report project. Address the user as \"Siem\"."
echo "Working agreements: CLAUDE.md. Living design: docs/ontwerp.md."
echo "Kickoff: /work (one issue) · /status (orchestrator view)."
echo

echo "## Branch & uncommitted work"
echo '```'
git rev-parse --abbrev-ref HEAD 2>/dev/null
git status --short 2>/dev/null | head -30
echo '```'
echo

echo "## Last 5 commits"
echo '```'
git log -5 --oneline 2>/dev/null
echo '```'
echo

if [ -f HANDOFF.md ]; then
  echo "## HANDOFF.md — last session's handoff (read this first)"
  echo
  cat HANDOFF.md
fi
