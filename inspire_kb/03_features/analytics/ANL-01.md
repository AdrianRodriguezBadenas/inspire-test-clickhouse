# ANL-01: Insert Variant Record

> Source: [[../../02_modules/analytics]]

**Priority:** Important
**State:** 🟢 Implemented
**Dependencies:** none
**ADRs referenced:** [[../../01_adr/adr-clickhouse-primary-database]]

> ⚠️ **Test-only path — not how variants are written in production.** Production
> ingest is **file-based bulk loading**: ClickHouse produces one part per insert, so
> writing variants one record at a time does not scale. This single-record insert
> exists to exercise and test the store, and is not to be grown into the real ingest
> path. That path is unspecified — see
> [[../../99_tracker/tickets/TASK-2mf2yu|TASK-2mf2yu]].

## Actor

API client — a service or job submitting annotated genomic variants for storage.

## Preconditions

- The client submits a variant record carrying at least the required fields.

## Main flow

1. The client submits a variant record.
2. The system validates the record (required fields present, enumerated fields
   within their allowed values).
3. The system stores the record.
4. The system returns a confirmation identifying the stored record.

## Alternative flows

### AF-1: Optional fields omitted

The record carries only the required fields. The system stores it, leaving the
optional fields empty, and confirms the insert.

## Error flows

### EF-1: Missing required field

A required field is absent. The system rejects the record with a validation error
that names the missing field.

### EF-2: Invalid enumerated value

An enumerated field (e.g. origin, type) carries a value outside its allowed set.
The system rejects the record with a validation error that names the field and its
allowed values.

## Postconditions

- The record is stored and its current version is retrievable via [[ANL-02]].
- The ingest timestamp is set by the system; the logical version (`version_date`)
  is supplied by the client.

## Acceptance criteria

- [ ] (ANL-01-1) Given a valid record with all required fields (including
      `version_date`), the system stores it and returns a confirmation identifying the
      stored record.
- [ ] (ANL-01-2) Given a record missing a required field, the system rejects it with a
      validation error that names the missing field.
- [ ] (ANL-01-3) Given an enumerated field with a value outside its allowed set, the
      system rejects it with a validation error that names the field.
- [ ] (ANL-01-4) Given a record with only the required fields, the system accepts it and
      leaves the optional fields empty.
- [ ] (ANL-01-5) The ingest timestamp is set by the system at insert time and is not
      taken from client input; the `version_date` is taken from client input.
- [ ] (ANL-01-6) The insert adds a new record; it never updates or replaces an existing
      one.
- [ ] (ANL-01-7) Given two records for the same `(project_id, collection, uri)`, the
      current version is the one with the greatest `version_date`, regardless of the
      order in which they were inserted (out-of-order safe).

## Notes

The validation rules above (required fields, enumerated values, system-set ingest
timestamp, client-supplied `version_date`) are the substantive part of this feature
and must carry over to the production file-based ingest path — explicitly, as the
same rules or as a stated deviation. Only the single-record transport is provisional;
the record contract is not. See
[[../../99_tracker/tickets/TASK-2mf2yu|TASK-2mf2yu]].

No GraphQL mutation is planned for this insert — the read surface is deliberately
read-only ([[../../01_adr/adr-graphql-query-transport]]), since exposing a write here
would advertise a path the product does not intend to have.
