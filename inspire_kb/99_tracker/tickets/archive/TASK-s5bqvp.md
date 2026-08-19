---
id: TASK-s5bqvp
title: Realign source code to the single-table version_date variant design
created: 2026-07-24
updated: 2026-07-24
reporter: "@adrian.rodriguez"
closed_by: "@adrian.rodriguez"
closed_at: 2026-07-24
epic: analytics
size: L
importance: High
skills: [code]
status: Done
blocked_by: []
related_to: [TASK-f40fw3]
---

## Description

The specs changed (single append-only table, caller-supplied `version_date`, current
= greatest `version_date`, `get` by natural key) but `source/` still implements the
old design. Regenerate the code to realize the current contract — this is tracked
drift, not new work.

## Scope

- **DDL** (`source/db/schema.sql`): `variant` as `MergeTree` ordered by
  `(project_id, collection, uri, version_date)`; drop `ReplacingMergeTree`; add
  `version_date`. Partitioning/ORDER BY finalized once TASK-f40fw3 is answered.
- **Domain/DTO**: add `version_date` (required on create).
- **`get`**: retrieve current by natural key `(project_id, collection, uri)` via
  `LIMIT 1 BY … ORDER BY version_date DESC` (no `FINAL`); controller route changes
  from `GET /variants/:id` to natural-key params.
- **`list`**: current via the same technique.
- **Tests**: e2e for `version_date`, out-of-order (greatest version wins), get by
  natural key; keep unit coverage green.

## Notes

Contract lives in `04_domain/analytics/variant/` (entity + create/get/list, now
`lifecycle: draft`) and [[adr-variant-history-current-projection]]. Final ORDER BY /
partitioning depends on TASK-f40fw3, but the version_date + get-by-natural-key
realignment can proceed independently.

## Acceptance criteria

- [ ] Code matches the descriptors; SDD review + build + unit + e2e all green.
- [ ] Out-of-order insert test: a lower `version_date` does not become current.
