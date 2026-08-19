/**
 * One JSON object per line on stdout, at each end of a request.
 *
 * Per adr-request-observability-log. Three properties this module exists to guarantee, all of
 * which a consumer depends on:
 *
 * 1. **NDJSON** — exactly one line per event, so a shipper needs no parser and no multi-line
 *    reassembly. Written straight to stdout rather than through Nest's Logger, which formats
 *    for humans and would need un-formatting at the other end.
 * 2. **Named by the use case**, using the action descriptor id from the knowledge base rather
 *    than a route, so the same use case over REST and GraphQL aggregates as one thing and a
 *    log line is traceable to the artifact that specifies it.
 * 3. **No payload values, ever.** The emitter writes a CLOSED field set: anything not named
 *    in `RequestEvent` is dropped rather than spread through. That is deliberate belt and
 *    braces on top of the type — this product stores genetic variants, so a body value
 *    reaching the log stream is a data-protection problem, not an untidy line. Callers
 *    summarize into `shape` (counts, sizes) and never pass values.
 */

/** What a request looked like, in counts. Never values. */
export interface RequestShape {
  /** Fields present on an inbound record. */
  fields?: number;
  /** Leaf conditions in an inbound query. */
  filters?: number;
  /** Page size the caller asked for. */
  limit?: number;
  /** Rows handed back. */
  returned?: number;
}

export interface RequestEvent {
  phase: 'start' | 'finish';
  /** The action descriptor id, e.g. `analytics.variant.query`. */
  action: string;
  transport: 'rest' | 'graphql';
  /** Correlation id — inbound `x-request-id` when present, generated when not. */
  request_id: string;
  outcome?: 'ok' | 'error';
  duration_ms?: number;
  /** The stable code the descriptor declares, on a failure. */
  error_code?: string;
  shape?: RequestShape;
}

export function emitRequestEvent(event: RequestEvent): void {
  // Built key by key, never by spreading the argument: a spread would forward whatever a
  // caller happened to attach, which is exactly how a payload ends up in a log stream.
  const line: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level: event.outcome === 'error' ? 'error' : 'info',
    phase: event.phase,
    action: event.action,
    transport: event.transport,
    request_id: event.request_id,
  };

  // Absent stays absent rather than becoming null: a consumer's schema inference is cleaner,
  // and a null reads as "measured and empty" when it means "not applicable to this phase".
  if (event.outcome !== undefined) line.outcome = event.outcome;
  if (event.duration_ms !== undefined) line.duration_ms = event.duration_ms;
  if (event.error_code !== undefined) line.error_code = event.error_code;
  if (event.shape !== undefined) line.shape = pickShape(event.shape);

  process.stdout.write(`${JSON.stringify(line)}\n`);
}

/** The shape's own field set is closed too, for the same reason. */
function pickShape(shape: RequestShape): Record<string, number> {
  const out: Record<string, number> = {};
  if (shape.fields !== undefined) out.fields = shape.fields;
  if (shape.filters !== undefined) out.filters = shape.filters;
  if (shape.limit !== undefined) out.limit = shape.limit;
  if (shape.returned !== undefined) out.returned = shape.returned;
  return out;
}
