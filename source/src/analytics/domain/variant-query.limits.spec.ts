import {
  MAX_CONDITION_DEPTH,
  MAX_CONDITION_NODES,
  assertConditionWithinLimits,
} from './variant-query.limits';
import { VariantErrorCode, VariantValidationError } from './variant-errors';
import type { VariantCondition } from './variant-query';

const leaf = (): VariantCondition => ({ field: 'project_id', op: 'eq', value: 1 });

/** A chain of `not` nodes `depth` levels deep, with a leaf at the bottom. */
const nested = (depth: number): VariantCondition =>
  depth <= 1 ? leaf() : { not: nested(depth - 1) };

describe('assertConditionWithinLimits', () => {
  it('accepts a condition at exactly the permitted depth', () => {
    const condition = nested(MAX_CONDITION_DEPTH);

    const act = (): void => assertConditionWithinLimits(condition);

    expect(act).not.toThrow();
  });

  it('rejects a condition nested one level beyond the permitted depth', () => {
    const condition = nested(MAX_CONDITION_DEPTH + 1);

    const act = (): void => assertConditionWithinLimits(condition);

    expect(act).toThrow(VariantValidationError);
    expect(act).toThrow(`Query condition nests deeper than the permitted ${MAX_CONDITION_DEPTH} levels.`);
  });

  it('reports an over-deep condition as query_too_complex', () => {
    const condition = nested(MAX_CONDITION_DEPTH + 1);

    let thrown: unknown;
    try {
      assertConditionWithinLimits(condition);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(VariantValidationError);
    expect((thrown as VariantValidationError).code).toBe(VariantErrorCode.QUERY_TOO_COMPLEX);
  });

  it('accepts a condition at exactly the permitted node count', () => {
    const condition: VariantCondition = {
      and: Array.from({ length: MAX_CONDITION_NODES - 1 }, leaf),
    };

    const act = (): void => assertConditionWithinLimits(condition);

    expect(act).not.toThrow();
  });

  it('rejects a condition carrying one node beyond the permitted count', () => {
    const condition: VariantCondition = {
      and: Array.from({ length: MAX_CONDITION_NODES }, leaf),
    };

    const act = (): void => assertConditionWithinLimits(condition);

    expect(act).toThrow(`Query condition carries more than the permitted ${MAX_CONDITION_NODES} nodes.`);
  });

  it('accepts an absent condition', () => {
    const act = (): void => assertConditionWithinLimits(undefined);

    expect(act).not.toThrow();
  });

  it('counts nodes across sibling branches, not only along the deepest path', () => {
    const branch = (): VariantCondition => ({ or: Array.from({ length: 40 }, leaf) });
    const condition: VariantCondition = { and: [branch(), branch(), branch()] };

    const act = (): void => assertConditionWithinLimits(condition);

    expect(act).toThrow(`Query condition carries more than the permitted ${MAX_CONDITION_NODES} nodes.`);
  });

  it('ignores null-valued combinator keys, which every GraphQL input node carries', () => {
    const condition: VariantCondition = {
      and: null,
      or: null,
      not: null,
      field: 'project_id',
      op: 'eq',
      value: 1,
    };

    const act = (): void => assertConditionWithinLimits(condition);

    expect(act).not.toThrow();
  });
});
