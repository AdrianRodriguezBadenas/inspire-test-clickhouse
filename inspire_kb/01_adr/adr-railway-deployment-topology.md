---
produced:
  skill: adr
  skill_sha: b78410f
  refs_sha: 263d8dc
  inspire: 0.6.0
  at: "2026-08-19"
---
# Railway as the deployment platform, with ClickHouse as a sibling service

**Status:** implemented
**Modules affected:** cross-cutting — every module the service exposes or persists
**Implemented in:** Railway project *Test Inspire Adri* (`Genomcore` workspace), `production`
environment — two services: `api`, built from `AdrianRodriguezBadenas/inspire-test-clickhouse`
@ `main` with Root Directory `/source` and config `/source/railway.json`; and `clickhouse`,
from `clickhouse/clickhouse-server:24.8-alpine` with a 10GB volume at `/var/lib/clickhouse`,
private-network only. Public surface: `api-production-6d17.up.railway.app`. Deployments so far were triggered by
hand — see the git-linked consequence below for why.

Note on the ladder: this went `design → implemented` without passing through `prototyped`,
which is a skip. `prototyped` means "validated in an external vertical spike repo", and this
project has none — `06_spikes/` holds only its template. The rung is optional evidence
nobody gathered, not a step that was dodged, and the same path was taken by
[[adr-clickhouse-primary-database]].

## Context

Nothing was deployed anywhere. There is no Dockerfile, no pipeline, and no hosted
environment, so the only evidence the product works came from tests on a developer
machine against a local container. That leaves a question the knowledge base could not
answer: does this run anywhere other than the laptop that wrote it?

The gap is not academic. Preparing this deployment surfaced a defect that no test, no
validator and no review had caught: `VariantRepository.ensureTable()` existed and
**nothing in the application ever called it** — only the e2e harness did. Deployed as it
was, the service would have started cleanly, the platform would have reported success
because the process was alive, and every request would have answered `500` with
`Unknown table expression identifier 'variant'`. The absence of a deployment target was
hiding a real hole.

## Decision

**Railway hosts the product**, as one project with two services.

- **The application** is built and run by Railway from the repository. The app lives in a
  subdirectory (`/source`) of a repository whose root holds the knowledge base and the
  guardrail runtime, so the service's **Root Directory** is `/source` and its config file
  is `/source/railway.json`. Both are **service settings, not file contents** — Railway's
  config file does not follow the Root Directory, and neither setting can be expressed in
  it, so a fresh service must be told twice where the app is.
- **ClickHouse is a sibling Railway service** from the official image, with a persistent
  volume, reachable only over the project's private network
  (`clickhouse.railway.internal:8123`, plain `http` — the traffic never leaves the
  project). It is not published to the internet.
- **Deploys are git-linked** — pushing the repository is the intended trigger, with no CLI
  and no credentials in the loop, and nothing outside the repository deciding what ships.
  **This is the decision, and as of 2026-08-19 it is not yet in force**: auto-deploy requires
  Railway's **GitHub App to be installed on the repository**, and it is not. The platform is
  explicit about it — `enabled: false, canEnable: false, reason: NO_INSTALLATION` — so a push
  reaches GitHub and nothing reaches Railway. Until an operator installs the app (a browser
  consent flow that no API token can perform on their behalf), deployments are triggered by
  hand against a named commit. Watch patterns are already set to `source/**` and verified
  correct against the docs: patterns operate from the repository root even when a Root
  Directory is set, so knowledge-base commits will be filtered out once the webhook exists.
- **The application creates its own schema when it comes up**, and **fails to start** if
  it cannot. The DDL is `CREATE TABLE IF NOT EXISTS`, so repeating it on every boot is
  idempotent. Failing loudly is the point: an instance that cannot reach its store must
  not serve, because the alternative — the shape this project was actually in — is a
  green deploy answering every request with a 500.
- **The server binds `::`**, not the default. Railway resolves a service's internal DNS
  name to an IPv6 address, and to an IPv4 one only in environments created from October
  2025 onward, so a process listening on IPv4 alone is unreachable from a sibling.

## Consequences

- The product becomes observable in a shared place, and the ADRs that describe it become
  claims someone can check rather than assertions about a working copy.
- **Deploy order matters in principle, and did not bite in practice.** The application
  refuses to start without its store, and Railway deploys services in parallel rather than in
  order — so the first deploy of both at once was expected to leave the `api` crash-looping
  until `clickhouse` answered. It did not: both reported `SUCCESS`, and the healthcheck passed
  `[1/1]` on its first attempt, because the store came up inside the build time of the app.
  The restart policy (`ON_FAILURE`, 3 retries) is what covers the case where it does not, and
  that case is one slow image pull away.
- **Several application instances would race on the DDL.** `IF NOT EXISTS` makes the race
  harmless, but the moment this service scales past one instance the schema step belongs in
  a pre-deploy command instead of in every boot. That is the trigger to revisit.
- **Backups and upgrades of ClickHouse are the operator's**, as they are for any
  self-hosted single node. There is no replication and no point-in-time recovery.
- **ClickHouse over Railway's private network worked with the plain image**, and no
  `<listen_host>::</listen_host>` workaround was needed. This is recorded because the
  opposite was expected: the failure is documented publicly, and this project's own compose
  file carries a comment about the same IPv4-only binding. A start-command override to inject
  that config was staged and then removed deliberately, on the grounds that Railway resolves
  internal DNS to IPv4 as well in environments created from October 2025 on — so the
  workaround addressed a condition this environment does not have, while replacing the
  entrypoint the official image is tested with. Applying it would have risked a failure worse
  than the one it guarded against. **If a future environment is IPv6-only, the workaround is
  the answer; it is not needed here.**

### Breaking changes

- `npm start` is no longer the production entry point. It runs `nest start`, which needs
  `@nestjs/cli` — a dev dependency absent from a production install, so it works locally
  and fails on the platform. Production runs `npm run start:prod` (`node dist/main.js`).

## Readiness, and what the platform is allowed to conclude

`GET /health` is a **readiness** probe and `railway.json` declares it as
`healthcheckPath`, so the platform stops treating "the process started" as "the deploy
worked" — the failure this ADR's context describes.

It asks ClickHouse a real question (`SELECT 1`), because a probe that only proves the
process is alive is exactly what reported a healthy deploy on a service that could not
answer anything. `503` when the store does not answer, from the `rest` convention's
readiness row, and deliberately distinct from the `502`/`504` a failed *request* gets: a
`503` tells an orchestrator to withhold traffic or fail a deploy, a `502` does not. The
body names which dependency is not ready and nothing else — a probe is reachable by
anyone who can reach the service, so no host, no port and no driver message goes in it.

Two states, reached by two different mechanisms, and the split is worth knowing:

- **No store at boot** → the app does not start at all (the schema hook throws), so the
  probe is never reachable and the deploy fails on a healthcheck that never passed.
- **Store lost after boot** → the app stays up and the probe answers `503`, which is the
  state an orchestrator needs in order to route around it.

## Open gap

Readiness is not observability. There are still no logs worth querying, no metrics and no
tracing, so what is knowable about a running instance is "it answers, and its store
answers" — not whether it is slow, whether one request in a hundred fails, or whether the
store is filling up. Monitorability is unspecified in the knowledge base — no feature, no
criterion, no ADR — and is the next decision to take, not a task to schedule.

## Alternatives considered

1. **ClickHouse Cloud (managed).** Rejected for now: it adds an account to administer and
   sends database traffic over the internet, for benefits — backups, upgrades, scaling —
   this project does not yet need. Revisit when durability or scale stops being a
   single-node question.
2. **A pre-deploy migration command instead of a boot hook.** Operationally the better
   answer: the schema is touched once per deploy rather than once per instance. Rejected
   for now because it needs a script and another platform setting to reach the same place a
   two-line lifecycle hook reaches today. It becomes the right answer at the second
   instance.
3. **A Dockerfile instead of Railway's builder.** Unnecessary: the application is a plain
   Node build with no system dependencies, and a hand-written image would be one more thing
   to keep current for no gain.

## Related ADRs

- [[adr-clickhouse-primary-database]] — the database this decision places and hosts.
