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

## Conventions

- Repository layout, build/run commands, naming and formatting conventions, and
  environment setup live here too (add them per project).
- Shared primitives and contracts the system composes on are declared here so
  agents don't reinvent them.
