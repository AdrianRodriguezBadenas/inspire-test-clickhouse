/**
 * Classify a store failure by whether we ever reached the store.
 *
 * This lives in infrastructure because it is driver knowledge: which `errno` strings
 * `@clickhouse/client` surfaces, and the fact that its own timeout carries no code. The
 * transport mapping that consumes it (`502` / `504`) belongs to the exception filter, and
 * the reason for the split is the same one the layering rule states — the filter should not
 * need to know what a socket error looks like.
 *
 * The distinction it draws is the one the `rest` surface convention draws:
 *
 * - **We never reached it** → the fault is not ours to claim. `502` / `504`.
 * - **It answered, complaining** (a bad query, a missing table) → the fault IS ours, and
 *   the convention's `500` row is correct. This function returns `null` for that, and
 *   returning null rather than guessing is deliberate: "Unknown table expression
 *   identifier" means the connection worked perfectly.
 *
 * Shapes were captured by driving the client at a closed port, an unroutable address and a
 * bogus hostname — not assumed. See the spec.
 */

/** Connectivity codes: the store was not reachable at all. */
const UNREACHABLE_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ECONNRESET',
  'EPIPE',
]);

/** Codes that mean we reached it and it did not answer in time. */
const TIMEOUT_CODES = new Set(['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'UND_ERR_HEADERS_TIMEOUT']);

/**
 * The client's own timeout arrives as a plain `Error` with **no code** — this exact
 * message is the only signal it gives. A driver string is a fragile hinge, so it is
 * pinned by a test; if an upgrade changes the wording, that test fails rather than a
 * timeout silently becoming a `500`.
 */
const DRIVER_TIMEOUT_MESSAGE = 'Timeout error.';

export type StoreFailure = 'unreachable' | 'timeout';

export function classifyStoreFailure(error: unknown): StoreFailure | null {
  for (const candidate of unwrap(error)) {
    const code = (candidate as { code?: unknown }).code;

    if (typeof code === 'string') {
      if (TIMEOUT_CODES.has(code)) return 'timeout';
      if (UNREACHABLE_CODES.has(code)) return 'unreachable';
    }

    if (candidate.message === DRIVER_TIMEOUT_MESSAGE) return 'timeout';
  }

  return null;
}

/**
 * Every error worth inspecting: the error itself, whatever it wraps in `cause`, and the
 * members of an `AggregateError` — which is how a host resolving to several addresses
 * fails, and which was observed in this project's own logs.
 */
function* unwrap(error: unknown, depth = 0): Generator<Error> {
  if (!(error instanceof Error) || depth > 4) return;

  yield error;

  if (error instanceof AggregateError) {
    for (const member of error.errors) yield* unwrap(member, depth + 1);
  }

  yield* unwrap(error.cause, depth + 1);
}
