---
kind: bootstrap-stack
status: configured          # configured via /inspire_bootstrap init
profiles: [nestjs]          # inspire-code stack profiles to load (see .inspire/skills/inspire-code/profiles)
surface_conventions: [graphql, rest]   # wire conventions to apply (see .claude/skills/_references/conventions)
---

# Tech stack

The application stack the product is built with. This is the single registry of
the official stack; adding a tool is an edit here, replacing a load-bearing choice
is an ADR ([`01_adr`](../01_adr)). Configure with `/inspire_bootstrap`.

## Shape

How the product is laid out. Established at `/inspire_bootstrap init`; it frames
which layers below apply. **Load-bearing** — changing it later (adding a frontend,
moving off a deployed database) is an ADR.

- **Platform:** backend-only — an API / service. No frontend in scope. (Alternatives:
  frontend-only · monorepo with frontend + backend · or *undecided*.)
- **Frontend targets:** none — this is a headless service. (The frontend layers
  do not apply.)
- **Backend:** yes — an API / service layer (see *Backend / runtime* below).
- **Database provisioning:** **deploy** ClickHouse (see *Data*) as part of the
  platform. (Alternative: connect to an **existing external** database — no
  provisioning here, just connection config.)
- **Local dev database:** yes — run ClickHouse **locally via Docker**, like any
  other service in the dev stack; fall back to deploying it directly on the host
  only if Docker isn't available. (Alternative: no local DB — develop against a
  shared/remote one.)

## Language

- **TypeScript**, end to end, with shared types across the API boundary.

## Backend / runtime

- **Node.js** — the backend runtime for platform services, shared `@scope/*` SDK
  packages, and the CLI.
- **NestJS** — the backend application framework (modules, DI, controllers/providers).

## Data

- **ClickHouse** — the product's primary database (columnar, analytics-oriented).
  Replaces the seeded PostgreSQL default; recorded as an ADR in
  [`01_adr`](../01_adr). Accessed from NestJS via the official
  `@clickhouse/client`.

## Tooling

- One package manager, one lint/format config; ESLint for linting.
  (`class-variance-authority` / `clsx` / `tailwind-merge` are frontend-only and
  not used here.)

## Test infrastructure

What the e2e suite needs running to be able to fail for the right reason. This is the
**declared inventory**; `source/docker-compose.yml` realizes it, and is never the source
of truth for it. `/inspire_code tdd` reads this list before writing a test and refuses to
start the cycle against infrastructure that is not up.

| Component | Service | Why the e2e suite needs it |
|---|---|---|
| ClickHouse | `clickhouse` | E2E runs against a **real** database — the query translation, the current-version projection and the pagination are the behavior under test, and a mocked store would assert the mock. |

Bring it up with the profile's command; the operator owns that, not the agent. The
service declares a healthcheck, so "up" means healthy, not merely started.

**Adding a component is a KB edit before it is a compose edit.** A cache, a broker or a
second database is a stack change: record it here (and as an ADR when it is load-bearing,
per the rule at the top of this file), then add the service, then ask the operator to
bring it up. Compose following the decision is the order; compose standing in for the
decision is the failure.

## Surface conventions

What a caller observes, so an acceptance criterion can become an executable test
without anyone inventing the missing half. A convention supplies the derived mapping
from logical error to observable response, and an action descriptor never restates it.
The decisions below are the ones no convention can make for us.

**This project has two surfaces, and they follow different conventions.**
`adr-graphql-query-transport` is explicit that both transports are thin adapters over
one application service:

| Surface | Convention | Carries |
|---|---|---|
| GraphQL — **query only**, no `Mutation`, no `Subscription` | `graphql` | the read path. No write is exposed here, so no conflict, no collision, no validation-on-write ever surfaces on this transport. |
| HTTP controller | `rest` | the single-record insert — and therefore every write-side error: validation, natural-key collision, conflict. |

Getting this wrong in the obvious direction (reaching for the GraphQL convention when
asking "what status does a conflict return?") produces an answer for a surface that
cannot produce the error. The write-side error contract is the `rest` convention's.

The production ingest path will be **file-based bulk**, not either of these
([`TASK-2mf2yu`](../99_tracker/tickets/TASK-2mf2yu.md)). It is a third surface with no
convention yet — a batch job reports per-record outcomes to a file or a log, not to a
caller holding a connection, so neither table above fits it. Author one when that path
is specified; until then it is an acknowledged gap, not a covered case.

Because the surfaces split read from write, so do the open decisions. Several rows in
the `graphql` convention's policy table **do not apply here at all** — expected-domain-
error shape (schema result unions vs `errors[]`) is a write-side question, and this
surface has no writes. Not answering an inapplicable question is correct; leaving it
looking unanswered is not.

**GraphQL surface (read):**

| Decision | This project | Why it is ours to make |
|---|---|---|
| Absent variant on a single-item query | **not decided yet** | `null` with no error, or a `NOT_FOUND` in `errors`. The most-exercised path in the product; it must not be settled by whoever writes the first resolver. |
| Nullability of list fields | **not decided yet** | `[T!]!` vs nullable — a nullable list makes every consumer branch on a case that never happens. |
| Partial success on a multi-field query | **not decided yet** | Allowed (the protocol's own semantics) vs all-or-nothing. |

**HTTP surface (write):**

| Decision | This project | Why it is ours to make |
|---|---|---|
| Validation failure status | **not decided yet** | `400` vs `422`. This is the live one: `analytics.variant.create` already declares `missing_required_field` and `invalid_enum_value`, and neither has an observable response yet. |
| Natural-key collision on insert | **not decided yet** | `409` vs `200` with the existing record. Note the ADR: an insert never updates, and out-of-order versions are legal — so "collision" may not be an error at all here, which is itself the decision. |
| Error body shape | **not decided yet** | `problem+json` vs a project schema. |

**Both surfaces:**

| Decision | This project | Why it is ours to make |
|---|---|---|
| Whether either surface is authenticated at all | **not decided yet** | Nothing in the KB says it is. If neither is, every auth row below is moot and should be recorded as N/A rather than left open. |
| Where the auth check runs | **not decided yet** | HTTP middleware (a real `401`/`403`, no GraphQL body) vs an in-execution guard (`200` + a code, optionally lifted via `extensions.http`). GraphQL settles nothing here, and the two produce completely different assertions. |
| Auth error code vocabulary | **not decided yet** | `UNAUTHENTICATED` / `FORBIDDEN` are **not** Apollo codes — they were classes in Apollo Server 2–3, removed in 4. Whatever we use, we own and must declare. |
| Expired credential | **not decided yet** | Same code as an absent credential, or a distinct one. |
| Domain error codes | **not decided yet** | The Apollo built-in enum has no not-found, conflict or collision code, so most domain errors need a project one. |

**Unanswered on purpose, not by omission** — these are operator decisions, tracked in
[`TASK-k4t9mz`](../99_tracker/tickets/TASK-k4t9mz.md) rather than defaulted in silence.
Until they are answered the convention's stated defaults apply, and a test pinning a
different choice is drift, not a contract.

One is settled already, because code was changed for it rather than argued: **no
`stacktrace` extension in any error response, in any environment** — asserted on the
whole `extensions` object, never on the presence of one key.

## Quality gates

The mechanical checks this project is trusted through — what a reviewer stops reading,
a machine has to start checking. **Which rules** is not decided here: the resolved
profile owns that list (`profiles: [nestjs]` → its `## Quality gates`), governed by the
shared rules in `.claude/skills/_references/quality-gates.md`. What is recorded here is
the project's own three answers.

- **In-repo gates.** ESLint (`source/eslint.config.mjs`) is where the absolute rules
  live, the jest `coverageThreshold` is the in-repo coverage floor, and the escape-hatch
  ceiling (suppressions + `as any` / `x!`) is a committed file — the one baseline that
  belongs inside the repository, because a suppression is source text and a raised
  ceiling shows up in the same diff.
- **Aggregate history: not declared yet.** No external metrics service holds this
  project's coverage history, so today there is no ratchet — only the in-repo floor,
  which the same change is allowed to lower. Choosing the service is the open decision;
  until then the gate is weaker than it reads.
- **Mutation score: deliberately absent.** Not measured as an aggregate; test strength
  is checked per-diff by the mutation drill (`/inspire_code tdd`, step 6). The trade,
  stated so nobody rediscovers it as a gap: no number for test strength, and no coverage
  of code the diff does not touch.

**Current state — the gates are below the profile.** `eslint.config.mjs` is on
`recommendedTypeChecked`, with no complexity, import-boundary, or jest rules, and there
is no `coverageThreshold`. That is a known gap, not an oversight: tracked in
[`TASK-w3n8qr`](../99_tracker/tickets/TASK-w3n8qr.md), which also carries the
server-side half no skill can install — branch protection, and the metrics service's
own pass condition.

## Conventions

- Repository layout, build/run commands, naming and formatting conventions, and
  environment setup live here too (add them per project).
- Shared primitives and contracts the system composes on are declared here so
  agents don't reinvent them.
