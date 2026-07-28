/**
 * Bounds on the size of a client condition tree.
 *
 * ANL-02 requires that "a query nested beyond the permitted depth or complexity is
 * rejected before any data is read", and adr-graphql-query-transport makes depth and
 * complexity caps mandatory because a recursive input type otherwise accepts
 * arbitrarily deep nesting — a cheap denial-of-service vector.
 *
 * **Open spec gap.** Neither the feature nor the ADR states the numeric bounds. The
 * values below are this implementation's choice and need recording in the KB
 * (`/inspire_domain` on `analytics.variant.query`, or the ADR): a depth of 10 covers
 * any hand-written query builder nesting seen so far, and 100 nodes bounds the
 * translated SQL to a size ClickHouse plans without strain.
 */

import { queryTooComplex } from './variant-errors';
import type { VariantCondition } from './variant-query';

/** Maximum nesting levels of the condition tree; a bare leaf is depth 1. */
export const MAX_CONDITION_DEPTH = 10;

/** Maximum total nodes (combinators + leaves) in the condition tree. */
export const MAX_CONDITION_NODES = 100;

/**
 * Reject a condition tree that exceeds the depth or node bounds.
 *
 * Runs before any field/operator validation and before a query is built, so a hostile
 * payload is cheap to refuse. The walk is iterative on purpose: recursing over an
 * attacker-supplied tree would overflow the stack before the depth check could fire.
 */
export function assertConditionWithinLimits(condition: VariantCondition | null | undefined): void {
  if (condition === null || condition === undefined) return;

  const pending: { node: VariantCondition; depth: number }[] = [{ node: condition, depth: 1 }];
  let nodes = 0;

  while (pending.length > 0) {
    const { node, depth } = pending.pop() as { node: VariantCondition; depth: number };

    nodes += 1;
    if (nodes > MAX_CONDITION_NODES) {
      throw queryTooComplex(
        `Query condition carries more than the permitted ${MAX_CONDITION_NODES} nodes.`,
      );
    }
    if (depth > MAX_CONDITION_DEPTH) {
      throw queryTooComplex(
        `Query condition nests deeper than the permitted ${MAX_CONDITION_DEPTH} levels.`,
      );
    }

    for (const child of childrenOf(node)) {
      pending.push({ node: child, depth: depth + 1 });
    }
  }
}

/**
 * The child nodes of a condition, whichever combinator it uses.
 *
 * Deliberately blind to whether the node is well-formed — bounding the tree comes
 * first, and a node that mixes combinators must be *counted*, not trusted. Keys
 * carrying `null` are skipped: every GraphQL input node materializes all of them.
 */
function childrenOf(node: VariantCondition): VariantCondition[] {
  const children: VariantCondition[] = [];

  for (const branch of [node.and, node.or]) {
    if (Array.isArray(branch)) children.push(...branch.filter(isNode));
  }
  if (isNode(node.not)) children.push(node.not);

  return children;
}

function isNode(value: unknown): value is VariantCondition {
  return typeof value === 'object' && value !== null;
}
