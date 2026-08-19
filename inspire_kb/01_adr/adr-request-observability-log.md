---
produced:
  skill: adr
  skill_sha: b78410f
  refs_sha: 263d8dc
  inspire: 0.6.0
  at: "2026-08-19"
---
# One JSON line per request boundary, named by the use case it serves

**Status:** design
**Modules affected:** cross-cutting — every module that serves a request

## Context

The product is deployed and nothing is knowable about it beyond "it answers". There are no
logs worth querying, no metrics and no tracing, so a slow request, a one-in-a-hundred
failure or a store filling up are all invisible until someone notices from the outside.

That is not a hypothetical risk here. Preparing the deployment found a service that started
cleanly, was reported as a successful deploy, and answered every request with a `500` because
its schema did not exist. The readiness probe closed *that* hole, but a probe answers one
question — "can you serve right now?" — and says nothing about what happened to the requests
that were served.

The operator's framing is the right one: emit lines a log shipper can consume later, so
mounting Elastic is a deployment step rather than a code change.

## Decision

**One JSON object per line on stdout — NDJSON — at each end of a request.** Nothing in-process
ships, aggregates or buffers logs; the platform already collects stdout, and a collector is
somebody else's concern.

### The event names come from the knowledge base

An event carries the **action descriptor id** it serves — `analytics.variant.create`,
`analytics.variant.query` — not a route and not a controller method. Two reasons, and the
second is the one that matters:

- A route is an accident of transport. The same use case is reachable over REST and GraphQL
  here, and both should aggregate as one thing.
- It makes a log line traceable to the artifact that specifies it. "What was called" becomes
  answerable in the vault's own vocabulary, so a count of `analytics.variant.query` lines is a
  count of a use case, not of a URL.

### Entry and exit, paired by a correlation id

Both ends are emitted. The entry line alone cannot tell a slow request from a hung one; the
exit line alone cannot tell you a request was ever received. They are paired by a correlation
id, which is:

- **taken from the inbound `x-request-id` header when present**, so a trace survives a gateway
  or a call from another service, and
- **generated when absent**, because the value of the id is that one always exists.

It is echoed back in the `x-request-id` response header, so a caller reporting a problem can
quote the line that describes it. That is a new caller-observable output, and the `rest`
convention has no row for it — recorded here as the decision rather than left to whoever
writes the first handler.

### The exit line carries the outcome, not just the fact

Duration in milliseconds, the outcome (`ok` / `error`), and on failure the **error code** the
descriptor declares — the same stable token the API returns and the tests assert. A latency
question and a failure-rate question are then both answerable from one stream.

### Never the payload. Shape only.

**No request or response body values are logged, in any environment.** What is logged is the
shape: how many fields a record carried, how many filters a query had, the page size asked
for, the number of rows returned.

This is a privacy decision before it is a cost one. The product stores **genetic variants**,
and a request body here is patient-adjacent data; the create DTO alone declares 288 fields.
Logging bodies would copy that data into a log stream, and from there into whatever retains
it — turning an observability change into a data-protection one, silently and by default.
Shape answers the operational questions (is it slow, is it failing, how is it being used)
without keeping a single value.

### Both transports, one format

REST and GraphQL emit the same events, for the same reason the exception filter serves both:
the use case is the unit, not the protocol. `AppExceptionFilter` emits in this format too, so
an error is not the one line a consumer cannot parse.

## Consequences

- **Volume roughly doubles** against exit-only logging. That is the price of seeing a request
  that never finished, and it is the cheaper half of the trade.
- **A log line is joinable to the vault.** Because events are named by descriptor id, an
  operational question ("which use case is slow?") lands on the artifact that specifies it.
- **No genomic or patient data enters the log stream**, so retention policy on the collector
  side is a normal operational question rather than a compliance one. Retention itself is not
  this ADR's to decide, and it is not decided here.
- **Elastic needs no parser** — NDJSON on stdout is already structured. Mounting it is
  configuration, not a code change, which is what makes this the cheap first rung.
- **This is not tracing.** One service's boundaries are visible; a request crossing several
  services is not. The correlation id is what makes that a later upgrade rather than a
  rewrite.

## Alternatives considered

1. **A logging library (`pino`, `winston`).** Rejected for now. The whole requirement is
   `JSON.stringify` to stdout with a stable field set; a dependency buys transports, levels
   and redaction this decision does not use, and redaction is exactly the feature that would
   invite logging bodies "safely".
2. **OpenTelemetry tracing instead.** The right eventual answer for cross-service work, and
   deferred deliberately: it needs a collector to exist before it tells anyone anything, while
   this needs nothing. The correlation id is chosen so the two compose later.
3. **Logging request and response bodies.** Rejected on the privacy grounds above. Where a
   specific field is genuinely needed to diagnose, it is added to the shape summary by name in
   a follow-up decision, never by logging the body wholesale.
4. **Nest's default logger as-is.** Rejected: it prints human-oriented, coloured text. A
   consumer would need a parser for output that could have been structured at source.

## Related ADRs

- [[adr-railway-deployment-topology]] — names the absence of observability as its open gap;
  this decision closes the first part of it.
