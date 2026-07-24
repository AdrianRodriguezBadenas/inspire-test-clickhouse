---
kind: module-hub
prefix: ANL              # the module's feature / use-case ID prefix
---

# Analytics

> The module **hub** — overview, relationships, and links to everything this module
> owns across the layers. Kept in sync with the per-layer subfolders.

## Overview

Stores annotated genomic variants in ClickHouse and exposes an API to insert and
query them — inserting variant records, listing them filtered and paginated, and
retrieving a single record by identifier.

## Relationships

Reads from the ClickHouse primary database (see
[[../01_adr/adr-clickhouse-primary-database]]). No sibling modules yet; this is the
first module of the product.

## Use cases

_Index of the features in [`../03_features/analytics/`](../03_features/analytics):_

- [[../03_features/analytics/ANL-01|ANL-01]] — Insert a variant record into the store.
- [[../03_features/analytics/ANL-02|ANL-02]] — Query variants (filtered paginated
  list + retrieve one by identifier).

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
