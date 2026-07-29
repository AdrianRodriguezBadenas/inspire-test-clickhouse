#!/usr/bin/env bash
# .claude/hooks/pre-pr.sh
#
# Claude PreToolUse Bash hook. Matches `gh pr create` invocations and runs
# the full SDD review. Defense-in-depth alongside pre-commit: catches the
# case where a branch carries broken spec even though no edit passed
# through this session's commit hook (amended commits, history rewrites,
# branch checkouts from elsewhere).
#
# Worktree self-scoping: the harness caches PreToolUse hooks per project,
# so a registration installed by one worktree's settings.json can be
# replayed for a session whose $CLAUDE_PROJECT_DIR points elsewhere. The
# guard below compares the hook's home worktree (derived from $0) against
# the firing session's project dir and silently no-ops on mismatch — each
# worktree's copy of this script only acts for its own session.
#
# Exit codes follow Claude Code's hook contract:
#   0 — allow the tool call
#   2 — block the tool call; stderr is fed back to the agent

set -uo pipefail

HOOK_DIR="$(cd -P "$(dirname "$0")" && pwd -P)"
HOME_ROOT="$(cd -P "$HOOK_DIR/../.." && pwd -P)"

SESSION_ROOT_RAW="${CLAUDE_PROJECT_DIR:-$PWD}"
SESSION_ROOT="$(cd -P "$SESSION_ROOT_RAW" 2>/dev/null && pwd -P)" || SESSION_ROOT=""

[ -n "$SESSION_ROOT" ] && [ "$SESSION_ROOT" = "$HOME_ROOT" ] || exit 0

PROJECT_ROOT="$HOME_ROOT"

HOOK_INPUT=$(cat)
cmd=$(echo "$HOOK_INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null)

case "$cmd" in
  *"gh pr create"*) ;;
  *) exit 0 ;;
esac

cd "$PROJECT_ROOT"

STATUS=0

"$PROJECT_ROOT/.claude/bin/review.sh" .inspire_kb/04_domain || STATUS=2

# The escape-hatch ratchet, unscoped. `pre-commit` deliberately skips commits that
# touch no configured scope so a preexisting breach cannot block unrelated work; at
# PR time there is no unrelated work — this is the last gate before a merge, and a
# `git commit` from a plain terminal never fired the commit-time hook at all.
hatch_config="${ESCAPE_HATCH_CONFIG:-.escape-hatches.json}"
if [ -f "$hatch_config" ]; then
  hatch_script="$PROJECT_ROOT/.claude/bin/escape-hatch-ratchet.sh"
  if [ ! -x "$hatch_script" ]; then
    echo "pre-pr: $hatch_config declares a ratchet but $hatch_script is not installed —" >&2
    echo "        run bash .inspire/install.sh, or remove the config. A declared gate that" >&2
    echo "        silently does not run is worse than no gate." >&2
    STATUS=2
  else
    "$hatch_script" >/dev/null || STATUS=2
  fi
fi

exit $STATUS
