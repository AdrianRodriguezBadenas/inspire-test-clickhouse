# ANL-02: Query Variants

> Source: [[../../02_modules/analytics]]

**Priority:** Core
**State:** 🔵 In progress
**Dependencies:** [[ANL-01]]
**ADRs referenced:** [[../../01_adr/adr-clickhouse-primary-database]], [[../../01_adr/adr-variant-history-current-projection]], [[../../01_adr/adr-variant-structured-query]], [[../../01_adr/adr-graphql-query-transport]]

## Actor

API client — a service or analyst querying stored genomic variants.

## Preconditions

- Variant records have been stored via [[ANL-01]].

## Main flow

1. The client queries variants through any of the available access routes,
   optionally supplying filter criteria and a page size / cursor.
2. The system validates the filters.
3. The system returns the matching **current** variants (one per natural key — the
   greatest `version_date`) as a paginated page, with a cursor to fetch the next
   page when more results exist.

Retrieving a single variant is just a query whose filters pin its natural key
`(project_id, collection, uri)`: because the current set is unique per natural key,
such a query returns at most one record. There is no separate get-by-id action, and
the audit history is never returned — only current versions.

## Alternative flows

### AF-1: No filters supplied

The client supplies no filters. The system returns all current variants, paginated.

### AF-2: No matches

The filters match no current records. The system returns an empty page (a successful
response, not an error).

## Error flows

### EF-1: Unknown filter field

A filter references a field that does not exist. The system rejects the request with
a validation error that names the unknown field.

## Postconditions

- No stored data is modified (the operation is read-only).

## Acceptance criteria

- [ ] Given filter criteria, the system returns the matching **current** variants
      (one per natural key) as a paginated page.
- [ ] Given no filters, the system returns all current variants, paginated.
- [ ] The page size defaults to 50 and is capped at 200; the response includes a
      cursor to fetch the next page when more results exist.
- [ ] A query never returns more than one version of the same
      `(project_id, collection, uri)`; only the current version is returned.
- [ ] Given a filter on a field that does not exist, the system rejects the request
      with a validation error that names the field.
- [ ] Given filters that match no records, the system returns an empty page rather
      than an error.
- [ ] The request does not modify any stored data.
- [ ] The same logical query returns the same records, in the same order, with
      equivalent paging, regardless of which access route the client uses.
- [ ] A rejected query is rejected identically on every access route: the same
      condition produces the same validation error naming the same field or operator.
- [ ] A query nested beyond the permitted depth or complexity is rejected before any
      data is read.

## Notes

The query is a **structured condition tree** (`and`/`or`/`not` + `{field, op, value}`
leaves), translated to parameterized ClickHouse — see
[[../../01_adr/adr-variant-structured-query]].

Two access routes serve this one contract, permanently and by choice: the REST
`POST /variants/query` (kept for its Swagger surface, used for manual testing) and a
**read-only GraphQL** surface exposing the same tree as typed input types — see
[[../../01_adr/adr-graphql-query-transport]]. Both are thin adapters over a single
service, which is what makes the parity criteria above meaningful rather than
aspirational. The GraphQL route is the remaining work on this feature (tracked in
[[../../99_tracker/tickets/TASK-j01pke|TASK-j01pke]]); the REST route is done.
