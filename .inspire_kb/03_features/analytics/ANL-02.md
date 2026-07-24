# ANL-02: Query Variants

> Source: [[../../02_modules/analytics]]

**Priority:** Core
**State:** 🟡 Planned
**Dependencies:** [[ANL-01]]
**ADRs referenced:** [[../../01_adr/adr-clickhouse-primary-database]]

## Actor

API client — a service or analyst retrieving stored genomic variants.

## Preconditions

- Variant records have been stored via [[ANL-01]].

## Main flow — list

1. The client requests variants, optionally supplying filter criteria and a page
   size / cursor.
2. The system validates the filters.
3. The system returns the matching records as a paginated page, with a cursor to
   fetch the next page when more results exist.

## Alternative flows

### AF-1: Retrieve one by identifier

The client requests a single variant by its identifier. The system returns that
record.

### AF-2: No filters supplied

The client supplies no filters. The system returns all records, paginated.

### AF-3: No matches

The filters match no records. The system returns an empty page (a successful
response, not an error).

## Error flows

### EF-1: Unknown filter field

A filter references a field that does not exist. The system rejects the request
with a validation error that names the unknown field.

### EF-2: Identifier not found

A retrieve-by-identifier request names an identifier with no matching record. The
system returns a not-found response.

## Postconditions

- No stored data is modified (the operation is read-only).

## Acceptance criteria

- [ ] Given filter criteria, the system returns the matching variant records as a
      paginated page.
- [ ] Given no filters, the system returns all records, paginated.
- [ ] The page size defaults to 50 and is capped at 200; the response includes a
      cursor to fetch the next page when more results exist.
- [ ] Given a filter on a field that does not exist, the system rejects the request
      with a validation error that names the field.
- [ ] Given an identifier, the system returns the single matching variant record.
- [ ] Given an identifier with no matching record, the system returns a not-found
      response.
- [ ] Given filters that match no records, the system returns an empty page rather
      than an error.
- [ ] The request does not modify any stored data.
