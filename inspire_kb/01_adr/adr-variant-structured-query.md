# Structured query contract for variant reads

**Status:** design
**Modules affected:** [[../02_modules/analytics|analytics]]
<!-- Status maturity ladder: design | prototyped | implemented | superseded by [[x]] | rejected. -->

## Context

Reads must be **as expressive as a query builder** over the current variants — a
client should be able to compose arbitrary boolean/comparison conditions across any
field, plus ordering and pagination. Accepting raw SQL would be a direct injection /
arbitrary-execution hole, so the query must be expressed in a **structured**,
validatable form and translated to safe, parameterized ClickHouse. The transport is
`POST /variants/query` now; a migration to **GraphQL** is planned (same logical
contract), so the query shape must not leak transport or engine specifics.

## Decision

Accept a **structured query AST** (JSON) on `POST /variants/query`:

- **Condition tree** — nodes are `{ and: [...] }`, `{ or: [...] }`, `{ not: {...} }`,
  or a leaf `{ field, op, value }`.
- **Operators** (fixed set): `eq, ne, lt, lte, gt, gte, in, nin, like, ilike,
  between, is_null, is_not_null`.
- **Fields** validated against the known `variant` columns; an unknown field is a
  `400`, never passed through.
- **Values** are always bound as ClickHouse query parameters (`{name:Type}`) using
  each field's declared type; never string-concatenated.
- Optional `order_by: [{ field, dir }]`, `limit` (default 50, cap 200), and opaque
  `cursor`.

The server **always wraps** the client's conditions: it dedups to the current
version per natural key (`LIMIT 1 BY (project_id, collection, uri)` on the greatest
`version_date`, per [[adr-variant-history-current-projection]]) and returns only
current records — never audit history — plus (future) tenant scoping
([[TASK-hwhrvk]]).

**No raw SQL, ever.** "Everything ClickHouse can accept" means the full
boolean/comparison expressiveness via the AST, not arbitrary SQL text.

## Consequences

- Clients (incl. a query-builder UI) compose rich queries safely; the server owns
  translation and can enforce current-only + tenant scoping invariants centrally.
- The AST maps cleanly onto a future GraphQL surface (same logical arguments), so
  the GraphQL migration is a transport change, not a contract redesign.
- A field allow-list and operator whitelist are the security boundary; both are
  validated before any query is built.
- The domain descriptor stays storage-agnostic; the AST→ClickHouse translation is an
  implementation detail owned by the infrastructure layer.

### Breaking changes

- The read moves from `GET /variants` with fixed query-string filters to
  `POST /variants/query` with a structured body. The domain action is renamed
  `analytics::variant::list` → `analytics::variant::query`.

## Alternatives considered

1. **Raw SQL / ClickHouse expression passthrough.** Rejected — injection and
   arbitrary-execution risk; couples the public contract to the engine.
2. **Fixed query-string filters (the prior `list`).** Rejected as the target — not
   expressive enough for a query builder; kept only as the initial subset now
   superseded.
3. **MongoDB-style operators (`$gte`, `$in`).** Rejected — the explicit
   `{field, op, value}` AST is less ambiguous to validate and nest, and maps more
   directly to GraphQL.
4. **HTTP `QUERY` / `SEARCH` method.** Deferred — `QUERY` is an IETF draft not
   first-class in NestJS 11 (only `SEARCH` exists) and has thin ecosystem support;
   `POST` now, revisit with the GraphQL migration.

## Related ADRs

- [[adr-clickhouse-primary-database]] · [[adr-variant-history-current-projection]]
