---
id: TASK-hxr5ld
title: The e2e suite is intermittently flaky — root cause not captured
created: 2026-08-19
updated: 2026-08-19
reporter: "@adrian.rodriguez"
closed_by: null
closed_at: null
epic: tooling
size: S
importance: High
skills: [code]
status: Open
blocked_by: []
related_to: []
---

## Description

The e2e suite fails intermittently, roughly **one run in four**, and passes on a re-run. No
failing assertion has been captured yet, so the root cause is unknown and this ticket exists
instead of a guess.

Importance is High out of proportion to its size, because of what a flaky suite does to
everything else built here: it teaches people to re-run a red result instead of reading it.
Every gate in this project depends on a red run meaning something.

## Observations (2026-08-19)

Three failures seen across a day's work, none reproducible on demand:

- 1 of 36, on the first run after the ClickHouse container had been up ~36 seconds.
- 3 of 37, and separately 8 of 37 — the 8 were a **real regression** (a GraphQL 500 from a
  removed null guard), fixed in `c0ef071`. The 3 were not explained.
- 1 of 37, after that fix.

Then 4 consecutive green runs, and later 3 green followed by 1 red. Attempts to capture the
failing test's output landed on green runs each time.

## Hypotheses, none confirmed

1. **Repeated DDL.** `ensureTable()` now runs from `onModuleInit` (`a8bcb47`) as well as from
   the harness, and there are three e2e files each bootstrapping an app — so a run issues
   several `CREATE TABLE IF NOT EXISTS` against the same table. ClickHouse can race on
   concurrent DDL for the same name in some versions. **This is the leading candidate**: both
   the boot hook and the third e2e file (`health.e2e-spec.ts`) were added today, and the
   flakiness was first seen the same day.
2. **Insert visibility.** A read immediately following an insert. Considered less likely —
   MergeTree inserts are atomic and immediately visible, and `async_insert` is not enabled.
3. **Parallel suites — RULED OUT.** `test/jest-e2e.json` sets `maxWorkers: 1`, so files run
   serially. Checked rather than assumed.

## What to do

Capture the failure before changing anything — `inspire-code`'s rule 4 is root cause before
fix, and every hypothesis above is cheap to "fix" and expensive to be wrong about. A loop that
retains the log of a red run, or `--verbose` with the ClickHouse server log alongside it, is
the next step. Only then decide whether the fix is a per-file table, an explicit DDL
serialization, or something else entirely.

## Update — 2026-08-19, after the operator made this a core rule

The operator's ruling: a flaky test is fixed, never re-run, because a red result that might
mean nothing teaches everyone to stop reading red results. Recorded as
`20260819_fix-a-flaky-test-never-rerun-it` and materialized into `tdd.md` and `CLAUDE.md`.

**The specific failing assertion was never captured.** 28 consecutive green runs across two
hunts, including a 12-run loop that retained every run's output. So what follows removes
*categories* of cause — each a defect on its own terms — rather than claiming the cure:

- **Per-file tables.** Three e2e files shared one `variant_e2e` and each DROPped it on exit.
  Shared mutable state between test files is the classic source of pass-on-re-run, whether or
  not it fired here. The name is now derived from the test path, so a new file cannot forget.
- **`DROP TABLE ... SYNC`.** Verified on this server that
  `database_atomic_wait_for_drop_and_detach_synchronously = 0`, so a plain drop returns while
  the table is still detaching and a following `CREATE TABLE IF NOT EXISTS` can see it and skip
  creation. A direct 25-iteration probe did not reproduce it in one session, so this closes a
  possible race rather than a proven one.
- **A real leak, fixed.** `health.e2e-spec.ts` called `store.app.close()` instead of
  `store.close()`, so it never dropped its table — visible as a stray `variant_e2e_health` in
  `SHOW TABLES`. My own bug, introduced with that file the same day the flakiness appeared.

**Ruled out with evidence, and worth keeping ruled out:** parallelism is not merely unused, it
is *incompatible*. Raising `maxWorkers` to 3 produced 1 failure on one run and 9 on the next,
against 28 consecutive serial passes. `maxWorkers: 1` was previously indistinguishable from a
performance choice; it is now documented as a correctness requirement in the nestjs profile and
in `stack.md`, so it cannot be optimized away by someone who does not know.

**Why this stays open.** None of the above is proven to be the cause, and a fix for an
intermittent failure is not verified by green runs — that is the state the bug already
produced. Close it after a stretch of real use with no unexplained red, not before.
