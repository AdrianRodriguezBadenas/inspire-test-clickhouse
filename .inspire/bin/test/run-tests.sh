#!/usr/bin/env bash
# .inspire/bin/test/run-tests.sh — run quality_lib rules against fixtures
#
# Usage:
#   .inspire/bin/test/run-tests.sh                # run all tests
#   .inspire/bin/test/run-tests.sh <rule-name>    # run tests for one rule
#
# Each fixture lives at .inspire/bin/test/fixtures/{rule}/{scenario}/
# and contains:
#   - spec/sdd/...  the test SDD tree to scan
#   - expect.json   { "exit": N, "findings": [{rule, target_glob, message_substring}, ...] }
#
# Exit 0 if all tests pass, 1 otherwise.

set -uo pipefail
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
FIXTURES_DIR="$SCRIPT_DIR/fixtures"
BIN_DIR="$SCRIPT_DIR/.."

filter="${1:-}"
total=0
failed=0

for fixture in "$FIXTURES_DIR"/*/*/; do
  rule="$(basename "$(dirname "$fixture")")"
  scenario="$(basename "$fixture")"

  if [ -n "$filter" ] && [ "$filter" != "$rule" ]; then
    continue
  fi

  total=$((total + 1))
  expect_file="$fixture/expect.json"
  if [ ! -f "$expect_file" ]; then
    echo "SKIP $rule/$scenario (no expect.json)" >&2
    continue
  fi

  expected_exit="$(jq -r '.exit' "$expect_file")"
  script="$BIN_DIR/${rule}.sh"
  if [ ! -x "$script" ]; then
    echo "FAIL $rule/$scenario (rule script not executable: $script)" >&2
    failed=$((failed + 1))
    continue
  fi

  pushd "$fixture" >/dev/null
  # Run per-fixture setup (e.g., mtime-controlled touch commands).
  # Uses a sub-shell so the cd inside setup.sh cannot pollute the parent state.
  if [ -f "setup.sh" ]; then
    ( cd "$fixture" && bash setup.sh ) 2>/dev/null
  fi
  actual_stderr="$(mktemp)"
  SDD_SPEC_ROOT="spec/sdd" "$script" 2>"$actual_stderr"
  actual_exit=$?
  popd >/dev/null

  pass=true
  if [ "$actual_exit" != "$expected_exit" ]; then
    pass=false
    echo "FAIL $rule/$scenario (exit: expected $expected_exit, got $actual_exit)" >&2
  fi

  while IFS= read -r exp_finding; do
    rule_match="$(echo "$exp_finding" | jq -r '.rule')"
    msg_substr="$(echo "$exp_finding" | jq -r '.message_substring')"
    if ! grep -q "\"rule\":\"$rule_match\".*$msg_substr" "$actual_stderr"; then
      pass=false
      echo "FAIL $rule/$scenario (missing finding: rule=$rule_match, msg~='$msg_substr')" >&2
    fi
  done < <(jq -c '.findings[]?' "$expect_file")

  # Optional `finding_count`: assert HOW MANY findings the rule emitted, not just that
  # the expected ones are among them.
  #
  # Added because a substring assertion cannot catch a rule that reports the same defect
  # twice — found by a mutation drill, where breaking a de-duplication survived every
  # fixture. Deduplication, "report once per file", and "suppress the per-item findings"
  # are all behaviours whose only observable difference is a count, so a suite that cannot
  # express one cannot defend them. Absent from expect.json = not checked, so every
  # existing fixture is unaffected.
  expected_count="$(jq -r '.finding_count // empty' "$expect_file")"
  if [ -n "$expected_count" ]; then
    actual_count="$(grep -c '"rule":' "$actual_stderr" 2>/dev/null || echo 0)"
    if [ "$actual_count" != "$expected_count" ]; then
      pass=false
      echo "FAIL $rule/$scenario (finding count: expected $expected_count, got $actual_count)" >&2
    fi
  fi

  if $pass; then
    echo "PASS $rule/$scenario"
  else
    failed=$((failed + 1))
    cat "$actual_stderr" >&2
  fi
  rm -f "$actual_stderr"
done

echo ""
echo "Total: $total · Failed: $failed"
[ $failed -eq 0 ]
