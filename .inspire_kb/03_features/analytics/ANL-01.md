# ANL-01: Insert Variant Record

> Source: [[../../02_modules/analytics]]

**Priority:** Core
**State:** 🔵 In progress
**Dependencies:** none
**ADRs referenced:** [[../../01_adr/adr-clickhouse-primary-database]]

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

- [ ] Given a valid record with all required fields (including `version_date`), the
      system stores it and returns a confirmation identifying the stored record.
- [ ] Given a record missing a required field, the system rejects it with a
      validation error that names the missing field.
- [ ] Given an enumerated field with a value outside its allowed set, the system
      rejects it with a validation error that names the field.
- [ ] Given a record with only the required fields, the system accepts it and
      leaves the optional fields empty.
- [ ] The ingest timestamp is set by the system at insert time and is not taken from
      client input; the `version_date` is taken from client input.
- [ ] The insert adds a new record; it never updates or replaces an existing one.
- [ ] Given two records for the same `(project_id, collection, uri)`, the current
      version is the one with the greatest `version_date`, regardless of the order in
      which they were inserted (out-of-order safe).
