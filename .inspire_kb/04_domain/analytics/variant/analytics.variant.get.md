---
id: analytics::variant::get
module: analytics
entity: variant
action: get
lifecycle: accepted
requires: []
superseded_by: null
---

## Purpose
Retrieve the current version of a single variant, identified by its natural key
`(project_id, collection, uri)`. This is the analytics module's item-read entry
point, grounded in [[../../../03_features/analytics/ANL-02|ANL-02]]; the current
version is the record with the greatest `version_date`, resolved per
[[../../../01_adr/adr-variant-history-current-projection|adr-variant-history-current-projection]].

## Inputs

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | number | yes | Project scope. Part of the natural key. |
| `collection` | string | yes | Source collection. Part of the natural key. |
| `uri` | string | yes | Variant URI. Part of the natural key. |

## Outputs

A single [[analytics.variant|analytics::variant]] entity — the current version for
the natural key.

## Entities

### [[analytics.variant|analytics::variant]]
**As input:** natural key · **Effect:** read-whole

Returns the whole current record; the table below enumerates only the lookup key.

| Field | Touch | Type | Mapping | Notes |
|-------|-------|------|---------|-------|
| `project_id` | read | UInt64 | `input.project_id` | Natural-key lookup. |
| `collection` | read | String | `input.collection` | Natural-key lookup. |
| `uri` | read | String | `input.uri` | Natural-key lookup. |

## Behavior
1. Look up the current record (greatest `version_date`) for the natural key
   `(project_id, collection, uri)`.
2. Return it, or raise a not-found error when no record matches, per the acceptance
   criteria of [[../../../03_features/analytics/ANL-02|ANL-02]].

## Errors
- `variant_not_found` — operator-facing message: "No variant found for the given project, collection and uri."
