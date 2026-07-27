---
id: TASK-2mf2yu
title: Specify file-based bulk ingest as the production write path for variants
created: 2026-07-27
updated: 2026-07-27
reporter: "@adrian.rodriguez"
closed_by: null
closed_at: null
epic: analytics
size: XL
importance: Very High
skills: [feature, domain, adr, code]
status: Open
blocked_by: []
related_to: [TASK-f40fw3, TASK-hwhrvk]
---

## Description

Production variant writes will be **file-based bulk ingest**, not per-record API
calls. This path does not exist anywhere in the vault today — no feature, no action
descriptor, no ADR — while the KB currently presents `POST /variants`
([[ANL-01]]) as if it were the insertion path. Surfaced on 2026-07-27 while
specifying the GraphQL read transport.

## Context

- ClickHouse penalizes row-at-a-time inserts: every insert produces a part the merge
  tree must later consolidate. The efficient pattern is large batches — which is why
  ingest moves to files.
- [[ANL-01]] (`POST /variants`) is a **test-only** convenience and has now been
  marked as such in its feature file. It is not to be grown into the real path.
- The read side is settled and deliberately write-free:
  [[adr-variant-structured-query]] (AST) and [[adr-graphql-query-transport]]
  (GraphQL + REST, read-only) both assume writes arrive out of band.
- Sample scale from [[TASK-f40fw3]]: ~374M history rows, ~1.16 versions per natural
  key — so ingest is a bulk problem from day one, not eventually.

## Open questions to resolve when specifying

- **Format** — CSV / TSV / Parquet / JSONEachRow? Parquet and the native format are
  the cheapest for ClickHouse; the answer depends on what produces the files.
- **Delivery** — object storage (S3 and friends, letting ClickHouse read directly),
  a mounted path, or an upload endpoint? Direct engine reads avoid moving bytes
  through the API entirely.
- **Trigger** — scheduled, event-driven on file arrival, or operator-invoked?
- **Validation** — the per-record validation in [[ANL-01]] (required fields,
  enumerated values) has to happen somewhere. Per row at ingest, or as a rejected-rows
  quarantine after load?
- **Partial failure** — is a file all-or-nothing, or are bad rows quarantined and the
  rest loaded? This determines whether ingest needs a staging table.
- **Idempotency / replay** — what happens when the same file is ingested twice? The
  append-only model ([[adr-variant-history-current-projection]]) means duplicates
  become extra versions rather than errors, which may or may not be acceptable.
- **Observability** — how does an operator learn a load succeeded, and how many rows
  landed or were rejected?
- **Tenancy** — how `project_id` is established for an ingested file, given that
  [[TASK-hwhrvk]] says it must not be trusted from client input.

## Suggested follow-up

1. `/inspire_adr` — record the ingest architecture (format + delivery + failure
   model); it is cross-cutting and load-bearing.
2. `/inspire_feature create analytics/ANL-03` — the ingest use case.
3. `/inspire_domain` — the action descriptor(s) realizing it.
4. Only then `/inspire_code`.

## Acceptance criteria

- [ ] File format, delivery mechanism and trigger decided and recorded in an ADR.
- [ ] Partial-failure behavior defined: whether a file is atomic, and where rejected
      rows go.
- [ ] Replay/idempotency behavior defined for re-ingesting the same file.
- [ ] Per-record validation rules from [[ANL-01]] carried over to the ingest path,
      explicitly (same rules, or a stated deviation).
- [ ] A feature file exists for ingest, with the production write path clearly
      distinguished from the test-only [[ANL-01]].
- [ ] Operator-visible outcome per load: rows accepted, rows rejected, and why.
