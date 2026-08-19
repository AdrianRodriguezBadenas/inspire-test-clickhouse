---
produced:
  skill: adr
  skill_sha: b78410f
  refs_sha: 263d8dc
  inspire: 0.6.0
  at: "2026-08-19"
---
# Append-only variant history with current-version reads

**Status:** implemented
**Modules affected:** [[../02_modules/analytics|analytics]]
**Implemented in:**
`source/src/analytics/infrastructure/variant-table.ddl.ts` — a plain `ENGINE = MergeTree`
ordered by `(project_id, collection, uri, version_date)`, created idempotently by the
repository as the module comes up. "Current" is a query, not a second table:
`variant-query.translator.ts` resolves it with `ORDER BY version_date DESC` plus
`LIMIT 1 BY` the natural key. What the decision **forbids** is asserted, not assumed —
`variant-table.ddl.spec.ts:25` fails if the DDL ever contains `ReplacingMergeTree`, and
nothing in the codebase uses `FINAL`.
Ladder note: `design → implemented` skips `prototyped`, which means "validated in an
external vertical spike repo". This project has none, so the rung is optional evidence
nobody gathered rather than a step dodged — the same path
[[adr-clickhouse-primary-database]] and [[adr-railway-deployment-topology]] took.
<!-- Status maturity ladder: design | prototyped | implemented | superseded by [[x]] | rejected.
     design = the design workspace (features + screen spec + horizontal prototype + specs).
     prototyped = validated in an EXTERNAL functional prototype (a vertical spike repo,
       NOT the horizontal prototype) — add: **Prototype:** `repo-or-env` — what it validated. -->

## Context

Variants arrive from an asynchronous ingestion pipeline (queue-based), so records
for the same logical variant can arrive **out of order**. The system must always be
able to serve the *current* (latest) version of a variant quickly, and must keep the
full history for audit. ClickHouse is the primary database
([[adr-clickhouse-primary-database]]), and in ClickHouse in-place `UPDATE`s are
asynchronous mutations that are expensive and discouraged — so the classic
"upsert into a current table" pattern is not available directly.

Empirical starting point (sample migrated from the prior system): ~374M history
rows vs ~323M current rows → **~1.16 versions per natural key**. Today most variants
have a single version; re-annotation will add versions over time at a rate that is
not yet known. Scale target: billions of rows (genome analysis).

## Decision

Store variants in a **single append-only table**, versioned by a **caller-supplied
`version_date`** (the logical version of the record):

- **`variant`** — a plain `MergeTree`, append-only, ordered by
  `(project_id, collection, uri, version_date)`. Every insert appends a row and
  nothing is ever dropped, so **this table is the full history** (the audit trail;
  internal-only for now, not exposed via the API).
- **"Current" is a query, not a second table.** The current version of a variant is
  the row with the greatest `version_date` for its natural key, obtained with
  `LIMIT 1 BY (project_id, collection, uri) ORDER BY version_date DESC` (or `argMax`
  grouped by the natural key). No `FINAL`, no `ReplacingMergeTree`, no data
  duplication.

Because the table order begins with the natural key, a point lookup for one
variant's current version scans only that key's small contiguous range of versions —
fast. Out-of-order arrivals resolve correctly: the query always picks the greatest
`version_date`, so a late record with a lower `version_date` never becomes current,
regardless of insertion order.

**Optimization deferred (YAGNI), with a measurable trigger.** A materialized
`variant_current` projection (a `ReplacingMergeTree(version_date)` keyed by the
natural key, fed by a materialized view) can be added later as a pure performance
optimization. It is an **additive, non-breaking migration** — create the table +
view + backfill via `INSERT … SELECT`; the history table, the API, and the domain
contract are untouched. At the current ratio (~1.16 versions/key) it would nearly
double storage (~374M + ~323M rows) to save only ~16% of a `LIMIT 1 BY` scan — a bad
trade. Add it only when the monitored ratio

```sql
SELECT count() / uniqExact(project_id, collection, uri) FROM variant;
```

climbs to roughly **3–5×** (heavy re-annotation), or when the p95 latency of a
broad `list`-current query crosses the service's SLO — whichever comes first.

### Physical layout

The only filter guaranteed on every query is `project_id`; beyond that queries are
**open / ad-hoc** (arbitrary predicates), and `collection` is common but not
guaranteed. Primary key: `ORDER BY (project_id, collection, uri, version_date)` —
`project_id` gives the one guaranteed prune; `collection`/`uri` help the (frequent)
cases where they are present and complete the natural key for dedup / `get`;
`version_date` last makes latest-version selection cheap.

**No partitioning initially.** Queries never filter by date, so partitioning by
`version_date` would give no pruning while fragmenting each variant's versions across
time-partitions — which hurts exactly the natural-key access (`get`, dedup, and
comparing an old version against the current one). Unpartitioned, all versions of a
natural key stay contiguous in the ORDER BY, so cross-version comparison is a
contiguous scan. `PARTITION BY project_id` is also rejected (one giant partition for
the dominant project; potentially thousands of projects) and `collection` (~4000
studies → too many partitions). Partitioning in ClickHouse is for data
management/TTL, not query pruning — revisit only if a retention policy emerges (then
a coarse `toYear(version_date)` partition or row/column `TTL`, weighing the
version-fragmentation cost).

Worst case: the dominant project (~318M rows, ~4000 studies) queried with only
`project_id` and open filters prunes to ~318M rows. This is squarely ClickHouse's
design point: columnar storage means an open filter reads only the *filtered
columns* (not the 289-column rows), vectorized and parallel — hundreds of millions
of rows/second/core, typically sub-second to a few seconds. Materializing `current`
does **not** help here (it only resolves version dedup, already cheap at ~1.16
versions/key); the levers for open filters are the columnar scan itself, plus
**data-skipping indexes** (minmax / set / bloom_filter) on whichever columns prove
hot in practice, and **projections** for the 2–3 hottest access patterns. Because
the filters are open, add these **reactively** (measure real usage), not
speculatively — all non-breaking, contract-neutral changes (tracked in
[[TASK-f40fw3]] / [[TASK-napy51]]).

## Consequences

- No in-place updates: a change is a new append with a higher `version_date`.
  Append-only, ClickHouse-idiomatic.
- Out-of-order ingestion is handled at read time by picking the max `version_date`,
  not by application logic.
- `version_date` is required on insert and is the record's logical version.
- Full history is retained in the one table; current-state reads never need `FINAL`.
- No storage duplication — one physical copy of each version.
- The surrogate `id` is not the retrieval key for current state; retrieval is by
  natural key. `id` remains a per-record identifier for audit.

### Breaking changes

- Retrieving a variant is by natural key `(project_id, collection, uri)`, not by a
  generated `id`.
- `version_date` becomes a required input on insert.

## Alternatives considered

1. **Two tables (append-only history + `ReplacingMergeTree` current projection via a
   materialized view).** Rejected as the starting design — it stores essentially
   every version twice (history keeps all; current holds all un-merged rows until
   background merges collapse them), which at billions of rows is a large,
   unjustified storage cost. Kept as a *future optimization* (see above) if
   current-over-the-whole-dataset reads prove slow.
2. **Single `ReplacingMergeTree` table (dedup, no history).** Rejected — merges drop
   superseded versions, losing the audit history the domain needs.
3. **In-place `UPDATE` (ALTER … UPDATE).** Rejected — ClickHouse mutations are
   asynchronous and expensive; not suited to per-record upserts.
4. **Server-assigned version (ingest time) instead of caller `version_date`.**
   Rejected — with out-of-order queue delivery, ingest time does not reflect the
   logical version, so a late-arriving older record could wrongly win.

## Related ADRs

- [[adr-clickhouse-primary-database]] — establishes ClickHouse as the primary store.
