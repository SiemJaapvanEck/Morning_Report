#!/usr/bin/env bash
# THE quality gate — single source of truth.
#
# Reads the gate command from .claude/project.json and runs it. Every consumer
# (skills, agents, CI, humans) calls this script; nobody hardcodes the command.
#
#   exit 0 -> gate green
#   exit 1 -> gate red (output shows which phase failed)

set -uo pipefail

dir="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$dir" || exit 1

cfg=".claude/project.json"
if [ ! -f "$cfg" ]; then
  echo "gate.sh: $cfg not found — cannot determine the gate command." >&2
  exit 1
fi

gate_cmd="$(jq -r '.gate // empty' "$cfg" 2>/dev/null)"
if [ -z "$gate_cmd" ]; then
  echo "gate.sh: no \"gate\" key in $cfg." >&2
  exit 1
fi

echo "── gate: $gate_cmd"
if bash -c "$gate_cmd"; then
  echo "── gate: GREEN"
  exit 0
else
  echo "── gate: RED" >&2
  exit 1
fi
