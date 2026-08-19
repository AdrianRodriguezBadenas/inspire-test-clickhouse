# ANL-02: Query Variants

> Source: [[../../02_modules/analytics]]

**Priority:** Core
**State:** 🟢 Implemented
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

- [ ] (ANL-02-1) Given filter criteria, the system returns the matching **current**
      variants (one per natural key) as a paginated page.
- [ ] (ANL-02-2) Given no filters, the system returns all current variants, paginated.
- [ ] (ANL-02-3) The page size defaults to 50 and is capped at 200 — a request for more
      is **clamped to 200, not rejected**; the response includes a cursor to fetch the
      next page when more results exist.
- [ ] (ANL-02-4) A query never returns more than one version of the same
      `(project_id, collection, uri)`; only the current version is returned.
- [ ] (ANL-02-5) Given a filter on a field that does not exist, the system rejects the
      request with a validation error that names the field.
- [ ] (ANL-02-6) Given filters that match no records, the system returns an empty page
      rather than an error.
- [ ] (ANL-02-7) The request does not modify any stored data.
- [ ] (ANL-02-8) The same logical query returns the same records, in the same order, with
      equivalent paging, regardless of which access route the client uses.
- [ ] (ANL-02-9) A rejected query is rejected identically on every access route: the same
      condition produces the same validation error naming the same field or operator.
- [ ] (ANL-02-10) A query nested beyond the permitted depth or complexity is rejected
      before any data is read.
- [ ] (ANL-02-11) Given an ordering the client asks for, the system returns the page
      ordered by that field in that direction.

## Notes

The query is a **structured condition tree** (`and`/`or`/`not` + `{field, op, value}`
leaves), translated to parameterized ClickHouse — see
[[../../01_adr/adr-variant-structured-query]].

Two access routes serve this one contract, permanently and by choice: the REST
`POST /variants/query` (kept for its Swagger surface, used for manual testing) and a
**read-only GraphQL** surface exposing the same tree as typed input types — see
[[../../01_adr/adr-graphql-query-transport]]. Both are thin adapters over a single
service, which is what makes the parity criteria above meaningful rather than
aspirational. **Both routes are implemented**, and the parity criteria (`ANL-02-8`,
`ANL-02-9`) are covered by an e2e suite that exercises each condition through both.

Two things this feature deliberately does **not** cover, so their absence is not a gap
here: the endpoints carry no authentication
([[../../99_tracker/tickets/TASK-hwhrvk|TASK-hwhrvk]] — cross-cutting, and it must close
before any non-test deployment), and the query interface is still coupled to ClickHouse
concepts ([[../../99_tracker/tickets/TASK-j01pke|TASK-j01pke]]).
