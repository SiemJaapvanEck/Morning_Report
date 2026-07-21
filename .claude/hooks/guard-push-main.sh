#!/usr/bin/env bash
# Guard hook — blocks `git push` of the main branch unless the session-handoff
# ritual files (from project.json "ritualFiles") are part of the pushed commits.
# Pairs with /close and /merge, which perform the ritual and then pass silently.
#
# Registered as a PreToolUse(Bash) hook. Tool call arrives as JSON on stdin.
#   exit 0 -> allow   exit 2 -> block (stderr shown to Claude)
# Fail-open: if the hook can't reason (no jq, no upstream), it allows.

set -uo pipefail

payload="$(cat)"
cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)"

printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push' || exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

main_branch="$(jq -r '.mainBranch // "main"' .claude/project.json 2>/dev/null)"
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
[ "$branch" = "$main_branch" ] || exit 0

if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  range="@{u}..HEAD"
elif git rev-parse --verify "origin/$main_branch" >/dev/null 2>&1; then
  range="origin/$main_branch..HEAD"
else
  exit 0
fi

changed="$(git diff --name-only "$range" 2>/dev/null)"
[ -n "$changed" ] || exit 0

missing=""
while IFS= read -r f; do
  [ -n "$f" ] || continue
  printf '%s\n' "$changed" | grep -qx "$f" || missing="${missing} $f"
done < <(jq -r '.ritualFiles[]? // empty' .claude/project.json 2>/dev/null)

if [ -n "$missing" ]; then
  cat >&2 <<EOF
⛔ Push to $main_branch blocked — the session-handoff ritual is incomplete.

The commits about to be pushed do not update:${missing}

Per the working agreements, every push to $main_branch must rewrite HANDOFF.md
and add a dated TIMELINE.md line. Run /close (or /merge) — it writes both,
runs the gate, commits and pushes in one step.
EOF
  exit 2
fi

exit 0
