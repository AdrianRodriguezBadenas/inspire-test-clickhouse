# ClickHouse as the primary database

**Status:** design
**Modules affected:** cross-cutting — every module that persists or queries data
<!-- Status maturity ladder: design | prototyped | implemented | superseded by [[x]] | rejected.
     design = the design workspace (features + screen spec + horizontal prototype + specs).
     prototyped = validated in an EXTERNAL functional prototype (a vertical spike repo,
       NOT the horizontal prototype) — add: **Prototype:** `repo-or-env` — what it validated. -->

## Context

The INSPIRE template seeds PostgreSQL as the default primary database. This
product is a backend-only service whose workload is analytical / columnar rather
than transactional OLTP, so the seeded default does not fit. The database choice
is load-bearing: it constrains the data-access layer, the persistence patterns
every module follows, and the local-dev and deployment topology — so it is
recorded here rather than as a silent edit to `stack.md`.

## Decision

Use **ClickHouse** as the product's primary database, replacing the seeded
PostgreSQL default.

- **Access:** from NestJS via the official `@clickhouse/client`.
- **Provisioning:** ClickHouse is **deployed** as part of the platform (not an
  external managed instance).
- **Local development:** run ClickHouse **locally via Docker**, like any other
  service in the dev stack.

Recorded in [`00_bootstrap/stack.md`](../00_bootstrap/stack.md) (*Data* layer).

## Consequences

- Modules model data around ClickHouse's columnar, append-oriented strengths
  (analytical queries, large scans, aggregations) rather than normalized OLTP
  schemas.
- Persistence patterns follow ClickHouse semantics: no enforced foreign keys, no
  traditional transactions, eventual `MergeTree`-family table engines, and
  batch-oriented inserts.
- The dev stack requires Docker to run a local ClickHouse instance.

### Breaking changes

- PostgreSQL is no longer the primary database. Any assumption of relational OLTP
  behavior (ACID transactions, foreign-key constraints, row-level updates/deletes
  as a common path) does not hold and must be designed around.

## Alternatives considered

1. **PostgreSQL (the seeded default).** Rejected — a row-oriented OLTP engine is a
   poor fit for the product's analytical / columnar workload.
2. **PostgreSQL for metadata + ClickHouse for analytics.** Rejected for now — adds
   a second database and its operational overhead before there is a proven need to
   separate transactional metadata from analytical data. Revisit if a strongly
   transactional metadata need emerges.

## Related ADRs

- _None yet._
