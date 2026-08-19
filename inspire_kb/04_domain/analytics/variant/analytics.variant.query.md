---
id: analytics::variant::query
module: analytics
entity: variant
action: query
lifecycle: accepted
requires: []
superseded_by: null
---

## Purpose
Query the current variants with a client-supplied structured query — a condition
tree over the variant fields, plus ordering and pagination. This is the analytics
module's read entry point, grounded in
[[../../../03_features/analytics/ANL-02|ANL-02]]; it returns only current versions
(one per natural key, greatest `version_date`) per
[[../../../01_adr/adr-variant-history-current-projection|adr-variant-history-current-projection]],
and the structured-query contract is set by
[[../../../01_adr/adr-variant-structured-query|adr-variant-structured-query]].

## Inputs

A structured query. All parts are optional; an empty query returns all current
variants, paginated.

| Parameter | Type | Description |
|-----------|------|-------------|
| `where` | condition | A condition tree: `and` / `or` / `not` nodes, or a leaf `{ field, op, value }`. Operators: `eq, ne, lt, lte, gt, gte, in, nin, like, ilike, between, is_null, is_not_null`. Fields must be known `variant` columns. |
| `order_by` | list | Ordered list of `{ field, dir }` (`asc` / `desc`). |
| `limit` | number | Page size; default 50, capped at 200. |
| `cursor` | string | Opaque cursor for the next page. |

## Outputs

A page of current [[analytics.variant|analytics::variant]] entities plus a
`next_cursor` (null when no further pages exist).

## Entities

### [[analytics.variant|analytics::variant]]
**As input:** structured query · **Effect:** read-whole

Returns whole current records; the table enumerates only the fields used as the
lookup/dedup key. Client conditions may read any known field.

| Field | Touch | Type | Mapping | Notes |
|-------|-------|------|---------|-------|
| `project_id` | read | UInt64 | `query.where` | Dedup key; also filterable. |
| `collection` | read | String | `query.where` | Dedup key; also filterable. |
| `uri` | read | String | `query.where` | Dedup key; also filterable. |
| `version_date` | read | DateTime64(3) | derived | Selects the current version (greatest per key). |

## Behavior
1. Validate the query: every referenced field is a known `variant` column and every
   operator is in the allowed set, per
   [[../../../01_adr/adr-variant-structured-query|adr-variant-structured-query]];
   reject unknown fields/operators with a validation error.
2. Translate the condition tree to a parameterized ClickHouse predicate (values
   bound as parameters, never concatenated).
3. Resolve the current version per natural key (greatest `version_date`), apply the
   client conditions and ordering, and return at most `limit` records (default 50,
   cap 200) plus a `next_cursor` when more results exist. Audit history is never
   returned.

## Errors
- `unknown_query_field` — operator-facing message: "Unknown query field: {field}."
- `unknown_query_operator` — operator-facing message: "Unsupported operator: {op}."
