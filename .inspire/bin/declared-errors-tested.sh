#!/usr/bin/env bash
# .claude/bin/declared-errors-tested.sh
#
# Rule: every error an action descriptor declares in `## Errors` is exercised by a
# test. A declared error with no test is a contract nobody checks — the spec promises
# a behavior and nothing anywhere would notice if it disappeared.
#
# How it checks: the error code must appear as a **literal** in a test file. That is
# not a proxy for "a test exists" — it is the surface conventions' own requirement
# (`_references/conventions/`) that a test assert the exact error code rather than a
# loose matcher. Satisfying this rule and satisfying that one are the same act.
#
# Severity is lifecycle-progressive, because TDD writes the spec before the test:
#   draft            → warning (the test is legitimately not written yet)
#   accepted, stable → error   (the contract is closed; an untested clause is a lie)
#   superseded       → skipped (no longer authoritative)
#
# Like `escape-hatch-ratchet.sh`, this rule reads `source/` as well as the KB, and is
# deliberately NOT in `review.sh`'s default list: `/inspire_domain review` is a
# knowledge-base review. Invoked by `pre-pr.sh` and by `/inspire_code review`.
#
# Config (env, all optional):
#   DECLARED_ERRORS_TEST_SCOPE  directory holding the tests   (default: source)
#   DECLARED_ERRORS_TEST_GLOBS  space-separated filename globs
#                               (default: *.spec.* *-spec.* *.test.* *-test.* *_test.*
#                                         test_*.*)
#                               The hyphen forms are not redundant: `*.spec.*` does not
#                               match `create.e2e-spec.ts`, which is the NestJS e2e
#                               convention — omitting them silently skips every e2e file
#                               and reports the errors as untested.
#
# Usage:
#   .claude/bin/declared-errors-tested.sh                    # whole tree
#   .claude/bin/declared-errors-tested.sh .inspire_kb/04_domain/analytics

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_lib.sh"

sdd_require_tools || exit 127
sdd_init_counters

SCOPE="${1:-$SDD_SPEC_ROOT}"
TEST_SCOPE="${DECLARED_ERRORS_TEST_SCOPE:-source}"
read -r -a TEST_GLOBS <<< "${DECLARED_ERRORS_TEST_GLOBS:-*.spec.* *-spec.* *.test.* *-test.* *_test.* test_*.*}"

if [ ! -d "$TEST_SCOPE" ]; then
  sdd_finding "warning" "declared-errors-tested" "$TEST_SCOPE" \
    "test scope does not exist — no declared error can be verified as tested (set DECLARED_ERRORS_TEST_SCOPE, or ignore while the project has no code yet)"
  sdd_count_warning
  sdd_exit_with_counters
  exit $?
fi

# ─────────────────────────────────────────────────────────────────────────────
# Collect the test files once. Rebuilding this per error code would re-walk the
# tree for every bullet in the tree.
# ─────────────────────────────────────────────────────────────────────────────

TEST_FILES="$(mktemp -t declared-errors-tests.XXXXXX)"
trap 'rm -f "$TEST_FILES"' EXIT

glob_args=()
for g in "${TEST_GLOBS[@]}"; do
  [ -z "$g" ] && continue
  [ ${#glob_args[@]} -gt 0 ] && glob_args+=(-o)
  glob_args+=(-name "$g")
done

if [ ${#glob_args[@]} -gt 0 ]; then
  find "$TEST_SCOPE" -type f \( "${glob_args[@]}" \) 2>/dev/null \
    | grep -v '/node_modules/' | grep -v '/dist/' > "$TEST_FILES"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Per action: read `## Errors`, extract the leading backticked code from each
# bullet, and look for it in the tests.
# ─────────────────────────────────────────────────────────────────────────────

check_action() {
  local file="$1"

  local lifecycle
  lifecycle="$(sdd_fm_value "$file" '.lifecycle')"
  [ "$lifecycle" = "superseded" ] && return 0

  local severity
  severity="$(sdd_progressive_severity "$lifecycle")"

  local codes
  codes="$(sdd_body_section "$file" "Errors" \
    | awk 'match($0, /^-[[:space:]]+`[A-Za-z0-9_.:-]+`/) {
             s = substr($0, RSTART, RLENGTH)
             gsub(/^-[[:space:]]+`|`$/, "", s)
             print s
           }')"

  [ -z "$codes" ] && return 0

  while IFS= read -r code; do
    [ -z "$code" ] && continue
    if [ -s "$TEST_FILES" ] && \
       tr '\n' '\0' < "$TEST_FILES" | xargs -0 grep -qlF -- "$code" 2>/dev/null; then
      continue
    fi
    sdd_finding "$severity" "declared-errors-tested" "$file" \
      "declared error \`$code\` appears in no test under $TEST_SCOPE — the descriptor promises it and nothing would notice if it vanished (assert the exact code, per the project's surface convention)"
    sdd_count_by_severity "$severity"
  done <<< "$codes"
}

while IFS= read -r action; do
  [ -z "$action" ] && continue
  check_action "$action"
done < <(sdd_find_actions "$SCOPE")

sdd_exit_with_counters
