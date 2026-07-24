---
kind: module-hub
prefix: ANL              # the module's feature / use-case ID prefix
---

# Analytics

> The module **hub** — overview, relationships, and links to everything this module
> owns across the layers. Kept in sync with the per-layer subfolders.

## Overview

Aggregated queries and reporting over the data stored in ClickHouse. Exposes the
API surface for running analytical queries — aggregations, large scans, and
reporting rollups — and returning their results.

## Relationships

Reads from the ClickHouse primary database (see
[[../01_adr/adr-clickhouse-primary-database]]). No sibling modules yet; this is the
first module of the product.

## Use cases

_Index of the features in [`../03_features/analytics/`](../03_features/analytics):_

- _None yet — add with `/inspire_feature create`._

## Screens

_Not applicable — the product is backend-only (see
[`../00_bootstrap/stack.md`](../00_bootstrap/stack.md) · Shape). This module has no
UI screens._

## Domain

_[`../04_domain/analytics/`](../04_domain/analytics) — action descriptors + entity
documents for this module._

## Module ADRs

_Decisions scoped to this module (`adr-ANL-*` in [`../01_adr/`](../01_adr)):_

- _None yet. Cross-cutting: [[../01_adr/adr-clickhouse-primary-database]] — the
  database this module queries._
