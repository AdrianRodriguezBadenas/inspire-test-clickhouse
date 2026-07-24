---
id: TASK-j01pke
title: Decouple the variant query interface from ClickHouse (GraphQL or a query DSL)
created: 2026-07-24
updated: 2026-07-24
reporter: "@adrian.rodriguez"
closed_by: null
closed_at: null
epic: analytics
size: XL
importance: High
skills: [feature, domain, adr, code]
status: Open
blocked_by: []
related_to: [TASK-f40fw3]
---

## Description

The read side (ANL-02) currently exposes a fixed filter set over the current
variants. The intended direction is a **richer query capability that a client can
express freely** (as one would query the database), but **decoupled from ClickHouse**
so the query interface survives a future change of database engine.

## Context

- Reads always return only **current** variants (unique per
  `(project_id, collection, uri)`); the audit history is never exposed. Retrieving
  "one" variant is just a query pinning its natural key.
- Today: `GET /variants` with a small fixed filter set (`project_id`, `collection`,
  `uri`, `created_at` range) + cursor pagination.
- Goal: an engine-agnostic query surface. Candidate: **GraphQL** (well-known, good
  fit, portable) or a custom query DSL. The point is that the public query contract
  must not leak ClickHouse specifics.

## Suggested follow-up

- Decide GraphQL vs custom DSL (record as an ADR — it is a cross-cutting,
  load-bearing architectural decision).
- Define the query contract at the domain layer (still storage-agnostic), with a
  translation layer mapping it to ClickHouse (and swappable later).
- Preserve the current-only + tenant-scoping semantics (see [[TASK-hwhrvk]]).

## Acceptance criteria

- [ ] Query approach chosen and recorded in an ADR.
- [ ] Public query contract defined independently of the database engine.
- [ ] ClickHouse reachable only behind a translation layer that the contract does
      not depend on.
