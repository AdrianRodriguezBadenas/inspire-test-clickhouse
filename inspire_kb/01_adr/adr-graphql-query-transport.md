---
produced:
  skill: adr
  skill_sha: b78410f
  refs_sha: 263d8dc
  inspire: 0.6.0
  at: "2026-08-19"
---
# GraphQL as an additional read transport, alongside REST

**Status:** implemented
**Modules affected:** [[../02_modules/analytics|analytics]]
**Implemented in:** `source/src/analytics/controllers/variant.resolver.ts` (the `@Query`
resolver) and `controllers/graphql/variant-graphql.types.ts`, where `VariantField` and
`VariantOperator` are **derived from the same registry and operator set the domain uses**
rather than restated — so the schema enums cannot drift from the allow-lists they mirror.
Both transports are thin adapters over one application service, and 12 parity tests in
`source/test/variant-parity.e2e-spec.ts` hold that they return the same records in the same
order, page equivalently, and reject identically. Live at `/graphql`.
Ladder note: `design → implemented` skips `prototyped`, which means "validated in an
external vertical spike repo". This project has none, so the rung is optional evidence
nobody gathered rather than a step dodged — the same path
[[adr-clickhouse-primary-database]] and [[adr-railway-deployment-topology]] took.
<!-- Status maturity ladder: design | prototyped | implemented | superseded by [[x]] | rejected. -->

## Context

The read contract for [[../03_features/analytics/ANL-02|ANL-02]] is a structured
query AST — an `and`/`or`/`not` condition tree over `{field, op, value}` leaves —
deliberately defined free of engine and transport specifics
([[adr-variant-structured-query]]). It is served today over `POST /variants/query`.

[[TASK-j01pke]] recorded the intent to move that contract to **GraphQL**. On
specifying it, the intent narrowed in two ways:

- **GraphQL is added, not substituted.** REST stays, indefinitely and by choice: the
  team uses its Swagger surface to exercise the API by hand. There is no deprecation
  of `POST /variants/query` to plan.
- **The read side is the only side.** Production writes will not go through the API
  at all — variants will be ingested **from files**, because ClickHouse penalizes
  row-at-a-time inserts (each one produces a part the merge tree must later
  consolidate). The existing `POST /variants` insert
  ([[../03_features/analytics/ANL-01|ANL-01]]) is a **test-only** convenience, and
  the real ingest path is not yet specified ([[TASK-2mf2yu]]).

So the decision is not "which transport wins" but "how do two transports serve one
contract without drifting apart".

## Decision

Expose the existing query AST through a **GraphQL read surface**, in addition to the
REST one.

**Shape — recursive typed input types.** The AST maps to the schema directly, with
the field and operator allow-lists promoted to schema enums:

```graphql
input VariantCondition {
  and: [VariantCondition!]
  or:  [VariantCondition!]
  not: VariantCondition
  field: VariantField      # enum — the known variant columns
  op:    VariantOperator   # enum — eq, ne, lt, lte, gt, gte, in, nin,
                           #        like, ilike, between, is_null, is_not_null
  value: JSON              # heterogeneous: typed per the field's declared type
}

type Query {
  variants(
    where: VariantCondition
    orderBy: [VariantOrder!]
    limit: Int = 50
    cursor: String
  ): VariantPage!
}
```

**Query only.** No `Mutation`, no `Subscription`. GraphQL is a read-only surface here,
because there is no production write to expose.

**Both transports are thin adapters over one application service.** The resolver and
the controller each do nothing but shape input and output. Validation, AST
translation, current-version projection and pagination stay where they are — behind
the service, in the module's core. A transport that grows logic of its own is the
failure mode this decision exists to prevent.

**The enums are derived, not copied.** `VariantField` and `VariantOperator` are
generated from the same allow-list the existing validator already enforces. Two
hand-maintained copies of a security boundary would drift, and the drift would open
the boundary silently.

**Code-first** (`@nestjs/graphql` decorators), consistent with the TypeScript
end-to-end choice in [`00_bootstrap/stack.md`](../00_bootstrap/stack.md).

**Mandatory limits.** A recursive input type accepts arbitrarily deep nesting, so the
GraphQL surface must cap **query depth** and **query complexity**, and must not
expose **introspection** outside development. Without these, the condition tree is a
cheap denial-of-service vector — a risk the fixed REST body did not carry.

## Consequences

- The field and operator allow-lists become part of the published, introspectable
  contract: clients get validation and autocompletion before sending a request, and
  the security boundary is documented rather than implicit.
- Swagger remains the manual test surface, unchanged. Nothing the team does today
  breaks.
- **Two surfaces must stay in parity.** The single-service rule keeps the behavior
  shared, but the cost is real and permanent: every contract change lands twice, and
  a parity test is required to prove the same logical query returns the same result
  through both.
- GraphQL introduces attack surface REST did not have (depth, complexity,
  introspection). The limits above are part of the decision, not a follow-up.
- The read/write asymmetry — GraphQL + REST for reads, files for writes — is now
  deliberate and recorded. It should read as a design choice, not an oversight.

### Breaking changes

None. This is additive; every existing endpoint keeps its contract.

## Alternatives considered

1. **Replace REST with GraphQL.** Rejected — the operator wants the Swagger surface
   for manual testing. Removing it would trade a working tool for consistency nobody
   asked for.
2. **`where` as an opaque `JSON` scalar.** Rejected — reuses the current validator
   with zero schema work, but the schema then documents and validates nothing. That
   is the cost of GraphQL without its main benefit.
3. **Flat per-field filters (Hasura/Prisma style: `{ project_id: { eq: … } }`).**
   Rejected — more ergonomic for clients, but it is a *different* contract from the
   AST, so it would force a rewrite of the ClickHouse translator rather than a
   transport addition. Revisit only if client ergonomics become a real complaint.
4. **A `Mutation` for the insert.** Rejected — production writes are file-based
   ingest ([[TASK-2mf2yu]]); wrapping a test-only endpoint in GraphQL would advertise
   a write path the product does not intend to have.
5. **Relay Connections for pagination.** Deferred — the existing opaque
   `cursor` / `next_cursor` already expresses the same thing, and adopting the Relay
   shape would change the REST response too (or break parity). Revisit if a client
   needs Relay-conformant tooling.

## Related ADRs

- [[adr-variant-structured-query]] — the AST this transport exposes.
- [[adr-variant-history-current-projection]] — the current-only read semantics both
  transports enforce.
- [[adr-clickhouse-primary-database]] — the engine behind the translation layer.
