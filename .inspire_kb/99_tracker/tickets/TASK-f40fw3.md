---
id: TASK-f40fw3
title: Define within-project query patterns to finalize the variant table physical design
created: 2026-07-24
updated: 2026-07-24
reporter: "@adrian.rodriguez"
closed_by: null
closed_at: null
epic: analytics
size: M
importance: High
skills: [adr, code]
status: Open
blocked_by: []
related_to: [TASK-s5bqvp]
---

## Description

Open design input needed before the `variant` table physical layout (and the DDL)
can be finalized. The logical contract is settled (entity + actions, storage-agnostic;
see [[adr-variant-history-current-projection]]), but the ORDER BY / data-skipping
indexes / projections depend on the real analytical query patterns.

## Context

- Sample data: ~374M history rows, ~323M current → ~1.16 versions per natural key
  `(project_id, collection, uri)`. Decision so far: **single append-only table**,
  current via `LIMIT 1 BY … ORDER BY version_date DESC`; materialized `current`
  deferred until versions/key climbs to ~3–5× or a broad list-current crosses SLO.
- ~85% of rows belong to a **single project**. Therefore `PARTITION BY project_id`
  does NOT help the dominant project (one giant partition). Project-level pruning
  should come from `project_id` being the **leading ORDER BY column** (sparse
  primary index), not from partitioning.
- The real lever for fast queries **within** the big project is the ORDER BY key +
  data-skipping indexes + (optionally) projections, matched to the actual filters.

## Answer (2026-07-24) — primary decision resolved

Only `project_id` is guaranteed on every query; beyond that queries are **open /
ad-hoc**, and `collection` (the study) is common but not guaranteed. The dominant
project is ~318M rows across ~4000 studies. Decisions recorded in
[[adr-variant-history-current-projection]] → *Physical layout*:

- `ORDER BY (project_id, collection, uri, version_date)` — `project_id` is the one
  guaranteed prune; `collection`/`uri` help when present and serve dedup / `get`.
- `PARTITION BY toYYYYMM(version_date)` for management/TTL only (not project_id, not
  collection).
- Open filters over ~318M rows are served by ClickHouse's columnar scan (reads only
  the filtered columns). Materializing `current` does NOT help open filters.

## Residual — reactive tuning (measure, don't guess)

Because filters are open, do not index speculatively. Instrument real query usage;
add **data-skipping indexes** (minmax / set / bloom_filter) on the columns that turn
out hot, and **projections** for the 2–3 hottest access patterns. All non-breaking.

## Acceptance criteria

- [x] Guaranteed query prefix identified (`project_id`; `collection` common, open
      beyond that).
- [x] ORDER BY + partitioning decided and recorded in the ADR.
- [ ] (Residual) Query usage instrumented; skip-indexes/projections added reactively
      to the hot columns.
