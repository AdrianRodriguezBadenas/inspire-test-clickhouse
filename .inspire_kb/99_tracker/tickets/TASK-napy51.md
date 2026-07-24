---
id: TASK-napy51
title: Harden variant create/list/get from code review (robustness + tests)
created: 2026-07-24
updated: 2026-07-24
reporter: "@adrian.rodriguez"
closed_by: null
closed_at: null
epic: analytics
size: L
importance: Mid
skills: [code, domain]
status: Open
blocked_by: []
related_to: [TASK-s5bqvp]
---

## Description

Consolidated findings from `/inspire-code review` (chaos + security + tests) that are
not the storage-model realignment (TASK-s5bqvp) nor auth (TASK-hwhrvk). Some are
pure code fixes; a few need a small spec decision first.

## Code-level (pure fixes)

- `project_id` needs `@Min(0)` — negative currently passes validation then fails as
  an opaque `500` instead of `400`.
- ClickHouse client has no request timeout → hangs on a slow/half-open server. Set
  `request_timeout`.
- `UInt64` ↔ JS `number`: `project_id`/counts lose precision and come back as
  strings; the `Variant` type is inaccurate at runtime. Decide bigint/string typing.
- Error-code precedence: a payload both missing a field and with a bad enum reports
  only `missing_required_field` (app.setup.ts). Decide combined reporting.
- Validate `created_from <= created_to` (inverted range currently returns an empty
  page silently).
- Empty-string filter (`?collection=`) becomes an active `= ''` filter instead of
  "no filter".
- Missing unit tests: `variant.repository.spec.ts` (every filter branch; assert
  reads stay correct after the redesign), `list-variants.dto.spec.ts` (limit
  boundaries 200/201, date parsing), controller wiring. Concurrency e2e.

## Needs a spec decision first

- **Rate limiting / query cost caps** (DoS surface): throttler + ClickHouse
  `max_execution_time` / `max_rows_to_read`.
- **Response allow-list**: endpoints return the full row (289 cols) with no output
  DTO — any new column is auto-exposed.
- **Pagination**: offset cursor is unbounded, tamperable, and unstable under
  concurrent writes — consider keyset pagination.
- **Insert batching**: single-row inserts create too many parts at high ingest
  rate — consider batch/async insert.
- **Credential handling**: empty-password / plaintext-http fallbacks should fail
  closed in production (validated config).

## Acceptance criteria

- [ ] Code-level fixes applied with regression tests; build + tests green.
- [ ] Spec decisions recorded (ADR/feature) before their code lands.
