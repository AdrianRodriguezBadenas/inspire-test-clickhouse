---
id: analytics::variant::list
module: analytics
entity: variant
action: list
lifecycle: draft
requires: []
superseded_by: null
---

## Purpose
Return stored variants matching optional filters, as a paginated page. This is the
analytics module's collection-read entry point, grounded in
[[../../../03_features/analytics/ANL-02|ANL-02]]; the data is read from ClickHouse
per [[../../../01_adr/adr-clickhouse-primary-database|adr-clickhouse-primary-database]].

## Inputs

All parameters are optional; with none supplied the action returns all records,
paginated.

| Parameter | Type | Description |
|-----------|------|-------------|
| `project_id` | number | Restrict to a project. |
| `collection` | string | Restrict to a collection. |
| `uri` | string | Restrict to a variant URI. |
| `created_from` | timestamp | Lower bound on `created_at` (inclusive). |
| `created_to` | timestamp | Upper bound on `created_at` (inclusive). |
| `limit` | number | Page size; default 50, capped at 200. |
| `cursor` | string | Opaque cursor for the next page. |

## Outputs

A page of [[analytics.variant|analytics::variant]] entities plus a `next_cursor`
(null when no further pages exist).

## Entities

### [[analytics.variant|analytics::variant]]
**As input:** filters · **Effect:** read-whole

Returns whole records; the table below enumerates only the fields used as filters.

| Field | Touch | Type | Mapping | Notes |
|-------|-------|------|---------|-------|
| `project_id` | read | UInt64 | `input.project_id` | Equality filter. |
| `collection` | read | String | `input.collection` | Equality filter. |
| `uri` | read | String | `input.uri` | Equality filter. |
| `created_at` | read | DateTime64(3) | `input.created_from` / `input.created_to` | Range filter. |

## Behavior
1. Validate that any supplied filter names an existing field, per the acceptance
   criteria of [[../../../03_features/analytics/ANL-02|ANL-02]].
2. Read the records matching the filters, ordered for stable pagination.
3. Return at most `limit` records (default 50, cap 200) plus a `next_cursor` when
   more results exist.

## Errors
- `unknown_filter_field` — operator-facing message: "Unknown filter field: {field}."
