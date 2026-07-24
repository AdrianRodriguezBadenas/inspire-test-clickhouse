---
id: TASK-z5vrnx
title: Isolate e2e tests from local/dev ClickHouse (destructive-op safety)
created: 2026-07-24
updated: 2026-07-24
reporter: "@adrian.rodriguez"
closed_by: null
closed_at: null
epic: analytics
size: M
importance: High
skills: [code]
status: Open
blocked_by: []
related_to: [TASK-napy51]
---

## Description

The e2e suite and local dev share the same connection configuration, and the tests
run destructive DDL — so running tests can wipe non-test data.

## Risk (concrete)

- `test/variant.e2e-spec.ts` runs `DROP TABLE IF EXISTS variants` and `TRUNCATE
  TABLE variants` against the connection built from the same env vars the app uses
  (`CLICKHOUSE_URL` / `USER` / `PASSWORD` / `DATABASE`, defaulting to
  `localhost:8123`, database `default`).
- No separate test database and no guard: `npm run test:e2e` destroys whatever those
  vars point at — local dev data today, or a shared/staging instance if the vars are
  ever set to one.

## Suggested follow-up

- Dedicated **test database/instance** (e.g. `CLICKHOUSE_DATABASE=variants_test`, or
  a separate compose service/port) with its own `.env.test`; never default
  destructive tests to a real endpoint.
- A **safety guard** in the e2e setup: refuse to run unless the target is clearly a
  test target (DB name matches `*_test`, or an explicit `ALLOW_DESTRUCTIVE_TESTS`
  flag), failing fast otherwise.
- Validated, fail-closed config (ties to the credential-handling item in
  [[TASK-napy51]]).

## Acceptance criteria

- [ ] e2e tests target an isolated test database, never the dev/shared one.
- [ ] The suite refuses to run destructive setup against a non-test target.
