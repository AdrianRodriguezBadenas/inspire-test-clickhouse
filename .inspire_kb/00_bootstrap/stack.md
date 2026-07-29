---
kind: bootstrap-stack
status: configured          # configured via /inspire_bootstrap init
profiles: [nestjs]          # inspire-code stack profiles to load (see .inspire/skills/inspire-code/profiles)
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
