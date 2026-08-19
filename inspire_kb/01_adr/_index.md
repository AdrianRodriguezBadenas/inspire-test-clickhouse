# ADR index

Catalog of architecture decision records. One row per ADR; grouped by module, with
cross-cutting decisions under *Transversales*.

## Transversales

| ADR | Title | Status |
|-----|-------|--------|
| [[adr-clickhouse-primary-database]] | ClickHouse as the primary database | implemented |
| [[adr-variant-history-current-projection]] | Append-only variant history with current-version reads | implemented |
| [[adr-variant-structured-query]] | Structured query contract for variant reads | implemented |
| [[adr-graphql-query-transport]] | GraphQL as an additional read transport, alongside REST | implemented |
| [[adr-railway-deployment-topology]] | Railway as the deployment platform, with ClickHouse as a sibling service | implemented |
| [[adr-request-observability-log]] | One JSON line per request boundary, named by the use case it serves | design |

## Superseded

_None._
