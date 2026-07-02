#!/usr/bin/env bash
# Guard hook for Morning Report.
#
# Blocks `git push` of the main branch unless the session-handoff ritual files
# (HANDOFF.md + TIJDLIJN.md) are part of the commits being pushed. Pairs with
# the /push-main skill, which performs the ritual and then pushes — at which
# point this hook passes silently.
#
# Registered as a PreToolUse(Bash) hook in .claude/settings.json. The tool call
# is delivered as JSON on stdin; CLAUDE_PROJECT_DIR points at the repo root.
#
#   exit 0  -> allow  (not a push / not on main / ritual present / can't reason)
#   exit 2  -> block  (ritual files missing); stderr is shown to Claude
#
# Fail-open by design: if the hook itself can't reason (no jq, no upstream),
# it allows the push rather than wedging the user out of git.

set -uo pipefail

# --- read the tool call payload from stdin --------------------------------
payload="$(cat)"
cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)"

# Not a git push? Not our business.
if ! printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push'; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

# --- only guard pushes of the main branch ---------------------------------
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
if [ "$branch" != "main" ]; then
  exit 0
fi

# --- which files do the to-be-pushed commits touch? -----------------------
# Prefer the configured upstream; fall back to origin/main. If neither
# resolves we cannot reason about the push -> allow it.
if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  range="@{u}..HEAD"
elif git rev-parse --verify origin/main >/dev/null 2>&1; then
  range="origin/main..HEAD"
else
  exit 0
fi

changed="$(git diff --name-only "$range" 2>/dev/null)"

# Nothing ahead of the remote? Let git report "everything up-to-date".
if [ -z "$changed" ]; then
  exit 0
fi

missing=""
printf '%s\n' "$changed" | grep -qx 'HANDOFF.md'  || missing="${missing} HANDOFF.md"
printf '%s\n' "$changed" | grep -qx 'TIJDLIJN.md' || missing="${missing} TIJDLIJN.md"

if [ -n "$missing" ]; then
  cat >&2 <<EOF
⛔ Push to main blocked — the session-handoff ritual is incomplete.

The commits about to be pushed do not update:${missing}

Per CLAUDE.md, every push to main must rewrite HANDOFF.md (current state) and
add a dated line to TIJDLIJN.md. Run the /push-main skill — it writes both,
runs the quality gate (lint/tsc/test/build), commits and pushes in one step.
EOF
  exit 2
fi

exit 0
