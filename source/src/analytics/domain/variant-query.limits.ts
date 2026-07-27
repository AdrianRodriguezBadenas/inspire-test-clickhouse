// Size limits on the structured query AST (analytics::variant::query).
//
// The condition tree is recursive and client-supplied, so an arbitrarily nested
// tree is a denial-of-service vector: the translator walks it recursively and
// would exhaust the call stack before any query reaches ClickHouse.
//
// These limits live in the domain layer, and the application service enforces
// them — deliberately NOT in a transport adapter. ANL-02 requires a query to be
// rejected identically whichever access route it arrives through, so a
// GraphQL-only validation rule (or an HTTP-only pipe) would break that parity and
// leave the other route exposed.

import { Condition, QueryValidationError } from './variant-query';

/** Maximum nesting depth of the condition tree, counting leaves. */
export const MAX_CONDITION_DEPTH = 10;

/** Maximum total number of nodes (leaves plus and/or/not nodes) in the tree. */
export const MAX_CONDITION_NODES = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The child conditions of a node, or an empty list for a leaf. */
function childrenOf(node: Record<string, unknown>): unknown[] {
  if (Array.isArray(node.and)) return node.and;
  if (Array.isArray(node.or)) return node.or;
  if (node.not !== undefined) return [node.not];
  return [];
}

/**
 * Reject a condition tree that is too deep or too large, before it is translated
 * or any data is read.
 *
 * Walks the tree **iteratively** with an explicit stack. A recursive check would
 * overflow on exactly the input it exists to reject, which would turn the guard
 * into a second instance of the bug.
 *
 * Structural validation (unknown fields, bad operators, malformed nodes) is not
 * this function's job — that is the translator's, which owns the field allow-list.
 */
export function assertQueryWithinLimits(where: Condition | undefined): void {
  if (where === undefined) {
    return;
  }

  const stack: Array<{ node: unknown; depth: number }> = [
    { node: where, depth: 1 },
  ];
  let nodes = 0;

  while (stack.length > 0) {
    // Non-null: guarded by stack.length above.
    const { node, depth } = stack.pop() as { node: unknown; depth: number };

    nodes++;
    if (nodes > MAX_CONDITION_NODES) {
      throw new QueryValidationError(
        'query_too_complex',
        `Query condition tree has more than the permitted ${MAX_CONDITION_NODES} conditions.`,
      );
    }
    if (depth > MAX_CONDITION_DEPTH) {
      throw new QueryValidationError(
        'query_too_complex',
        `Query condition tree is nested deeper than the permitted ${MAX_CONDITION_DEPTH} levels.`,
      );
    }

    if (!isRecord(node)) {
      // Malformed — the translator reports it with the precise reason.
      continue;
    }
    for (const child of childrenOf(node)) {
      stack.push({ node: child, depth: depth + 1 });
    }
  }
}
