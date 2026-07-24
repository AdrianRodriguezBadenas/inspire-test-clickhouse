---
id: analytics::variant::get
module: analytics
entity: variant
action: get
lifecycle: draft
requires: []
superseded_by: null
---

## Purpose
Retrieve a single stored variant by its generated id. This is the analytics
module's item-read entry point, grounded in
[[../../../03_features/analytics/ANL-02|ANL-02]]; the data is read from ClickHouse
per [[../../../01_adr/adr-clickhouse-primary-database|adr-clickhouse-primary-database]].

## Inputs

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | uuid | yes | The variant's generated id. |

## Outputs

A single [[analytics.variant|analytics::variant]] entity.

## Entities

### [[analytics.variant|analytics::variant]]
**As input:** id · **Effect:** read-whole

Returns the whole record; the table below enumerates only the lookup key.

| Field | Touch | Type | Mapping | Notes |
|-------|-------|------|---------|-------|
| `id` | read | UUID | `input.id` | Lookup key. |

## Behavior
1. Look up the record by `id`.
2. Return it, or raise a not-found error when no record matches, per the acceptance
   criteria of [[../../../03_features/analytics/ANL-02|ANL-02]].

## Errors
- `variant_not_found` — operator-facing message: "No variant found with the given id."
