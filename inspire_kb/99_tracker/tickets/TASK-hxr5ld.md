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
