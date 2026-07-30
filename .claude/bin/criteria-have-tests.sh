#!/usr/bin/env bash
# .claude/bin/criteria-have-tests.sh
#
# Rule: every acceptance criterion of a feature is traceable to a test.
#
# This is the larger half of "nothing untested". `declared-errors-tested.sh` covers the
# error set; this covers the behavior. Until now a criterion with no test was invisible:
# `inspire-feature`'s gate is judgment, and judgment does not run on every commit.
#
# It requires a criterion to carry a **stable id** — `- [ ] (ANL-02-3) …` — claimed by a
# test through an annotation:
#
#   /** @covers ANL-02-3 */
#   it('returns an empty page rather than an error when nothing matches', …)
#
# The id lives in the annotation and **not in the test name**, deliberately: test names
# are read on every CI failure, and an opaque token there is noise for whoever arrives
# next. `@covers` is self-describing, greppable, and invisible in test output. Requiring
# the annotation rather than a bare id also makes the claim intentional — an id loose in
# a comment, or copied into a fixture, must not satisfy a coverage gate.
#
# Two findings, not one:
#
#   criterion-untraceable  the criterion has no id, so no gate can ever check it.
#                          Reported even when tests exist, because the alternative is a
#                          rule that silently passes on every legacy feature — the worst
#                          possible outcome for a gate.
#   criterion-untested     the id exists and appears in no test file.
#
# Ids are assigned once and never renumbered: a deleted criterion retires its id rather
# than freeing it. Positional numbering was rejected deliberately — inserting a criterion
# would silently re-point every test after it, which is the exact class of drift this
# gate exists to remove.
#
# Severity by the feature's declared `**State:**`:
#   🟡 Planned      → warning  (authoring a feature must not require its tests to exist
#                               yet; blocking here would make `/inspire_feature create`
#                               impossible, which is not what "tests first" means)
#   🔵 In progress  → error    (work has started, and the first act of TDD is the test)
#   🟢 Implemented  → error
#
# Reads both the KB and `source/`, so — like the other source-touching rules — it is
# deliberately absent from `review.sh`'s default list. Wired into `pre-pr.sh`.
#
# Config (env, all optional): SDD_FEATURES_ROOT · SDD_TEST_SCOPE · SDD_TEST_GLOBS.
#
# Usage:
#   .claude/bin/criteria-have-tests.sh                       # every feature
#   .claude/bin/criteria-have-tests.sh .inspire_kb/03_features/analytics

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_lib.sh"

sdd_require_tools || exit 127
sdd_init_counters

SCOPE="${1:-$SDD_FEATURES_ROOT}"

if [ ! -d "$SCOPE" ]; then
  sdd_finding "warning" "criteria-have-tests" "$SCOPE" \
    "features root does not exist — no criterion can be traced"
  sdd_count_warning
  sdd_exit_with_counters
  exit $?
fi

TEST_FILES="$(mktemp -t criteria-tests.XXXXXX)"
trap 'rm -f "$TEST_FILES"' EXIT
sdd_find_test_files > "$TEST_FILES"

if [ ! -s "$TEST_FILES" ]; then
  sdd_finding "warning" "criteria-have-tests" "$SDD_TEST_SCOPE" \
    "no test files found — every criterion below is untraceable by construction, so the per-criterion findings are suppressed to keep the real signal readable"
  sdd_count_warning
  sdd_exit_with_counters
  exit $?
fi

# Map the feature's state marker to a severity tier.
feature_severity() {
  case "$1" in
    *"In progress"*|*"Implemented"*) printf 'error\n' ;;
    *) printf 'warning\n' ;;
  esac
}

check_feature() {
  local file="$1"
  local state severity
  state="$(grep -m1 '^\*\*State:\*\*' "$file" 2>/dev/null || true)"
  severity="$(feature_severity "$state")"

  # Criterion lines: `- [ ] text` / `- [x] text` inside `## Acceptance criteria`.
  # Continuation lines are indented and belong to the criterion above them.
  local criteria
  criteria="$(sdd_body_section "$file" "Acceptance criteria" \
    | grep -E '^-[[:space:]]+\[[ xX]\]' || true)"

  [ -z "$criteria" ] && return 0

  local n=0 id
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    n=$((n + 1))

    # The id is a parenthesised token right after the checkbox: `- [ ] (ANL-02-3) …`
    id="$(printf '%s' "$line" \
      | sed -nE 's/^-[[:space:]]+\[[ xX]\][[:space:]]*\(([A-Za-z0-9._-]+)\).*/\1/p')"

    if [ -z "$id" ]; then
      sdd_finding "$severity" "criteria-have-tests" "$file" \
        "criterion #$n carries no id, so no gate can trace it to a test — prefix it with a stable id, e.g. \`- [ ] (${file##*/}-$n) …\` minus the .md (assign once, never renumber)"
      sdd_count_by_severity "$severity"
      continue
    fi

    if ! sdd_covers_in_tests "$id" "$TEST_FILES"; then
      sdd_finding "$severity" "criteria-have-tests" "$file" \
        "criterion \`$id\` is claimed by no test under $SDD_TEST_SCOPE — add \`/** @covers $id */\` above the test that covers it, so the criterion stops being a promise nobody checks"
      sdd_count_by_severity "$severity"
    fi
  done <<< "$criteria"
}

while IFS= read -r feature; do
  [ -z "$feature" ] && continue
  case "$(basename "$feature")" in README.md|_*) continue ;; esac
  check_feature "$feature"
done < <(find "$SCOPE" -type f -name '*.md' 2>/dev/null | sort)

sdd_exit_with_counters
