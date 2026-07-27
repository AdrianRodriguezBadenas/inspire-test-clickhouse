import { Condition, QueryValidationError } from './variant-query';
import {
  MAX_CONDITION_DEPTH,
  MAX_CONDITION_NODES,
  assertQueryWithinLimits,
} from './variant-query.limits';

const leaf = (): Condition => ({ field: 'project_id', op: 'eq', value: 42 });

/** A chain of nested `and` nodes `depth` levels deep, with a leaf at the bottom. */
const nestedAnd = (depth: number): Condition => {
  let node: Condition = leaf();
  for (let i = 1; i < depth; i++) {
    node = { and: [node] };
  }
  return node;
};

/** A chain of nested `not` nodes `depth` levels deep, with a leaf at the bottom. */
const nestedNot = (depth: number): Condition => {
  let node: Condition = leaf();
  for (let i = 1; i < depth; i++) {
    node = { not: node };
  }
  return node;
};

/** One `and` node holding `count` sibling leaves — wide rather than deep. */
const wideAnd = (count: number): Condition => ({
  and: Array.from({ length: count }, leaf),
});

describe('assertQueryWithinLimits', () => {
  it('accepts an absent condition tree', () => {
    // WHEN
    const act = () => assertQueryWithinLimits(undefined);

    // THEN
    expect(act).not.toThrow();
  });

  it('accepts a tree exactly at the depth limit', () => {
    // GIVEN
    const where = nestedAnd(MAX_CONDITION_DEPTH);

    // WHEN
    const act = () => assertQueryWithinLimits(where);

    // THEN
    expect(act).not.toThrow();
  });

  it('rejects a tree one level beyond the depth limit', () => {
    // GIVEN
    const where = nestedAnd(MAX_CONDITION_DEPTH + 1);

    // WHEN
    const act = () => assertQueryWithinLimits(where);

    // THEN
    expect(act).toThrow(QueryValidationError);
    expect(act).toThrow(
      `Query condition tree is nested deeper than the permitted ${MAX_CONDITION_DEPTH} levels.`,
    );
  });

  it('counts `not` nodes towards the depth limit', () => {
    // GIVEN
    const where = nestedNot(MAX_CONDITION_DEPTH + 1);

    // WHEN
    const act = () => assertQueryWithinLimits(where);

    // THEN
    expect(act).toThrow(QueryValidationError);
  });

  it('rejects a tree beyond the node-count limit', () => {
    // GIVEN
    const where = wideAnd(MAX_CONDITION_NODES + 1);

    // WHEN
    const act = () => assertQueryWithinLimits(where);

    // THEN
    expect(act).toThrow(QueryValidationError);
    expect(act).toThrow(
      `Query condition tree has more than the permitted ${MAX_CONDITION_NODES} conditions.`,
    );
  });

  it('accepts a wide tree exactly at the node-count limit', () => {
    // GIVEN — the `and` node itself counts, so it holds one fewer leaf
    const where = wideAnd(MAX_CONDITION_NODES - 1);

    // WHEN
    const act = () => assertQueryWithinLimits(where);

    // THEN
    expect(act).not.toThrow();
  });

  it('reports the failure with the query_too_complex code', () => {
    // GIVEN
    const where = nestedAnd(MAX_CONDITION_DEPTH + 1);

    // WHEN
    let caught: unknown;
    try {
      assertQueryWithinLimits(where);
    } catch (error) {
      caught = error;
    }

    // THEN
    expect(caught).toBeInstanceOf(QueryValidationError);
    expect((caught as QueryValidationError).code).toBe('query_too_complex');
  });

  it('rejects a deep tree without exhausting the call stack', () => {
    // GIVEN — far deeper than any legitimate query; the guard must not recurse into it
    const where = nestedAnd(200_000);

    // WHEN
    const act = () => assertQueryWithinLimits(where);

    // THEN
    expect(act).toThrow(QueryValidationError);
  });
});
