import { assertConditionWithinLimits } from './variant-query.limits';
import { VariantErrorCode, VariantValidationError } from './variant-errors';
import type { VariantCondition } from './variant-query';

const leaf = (): VariantCondition => ({ field: 'project_id', op: 'eq', value: 1 });

/** A chain of `not` nodes `depth` levels deep, with a leaf at the bottom. */
const nested = (depth: number): VariantCondition =>
  depth <= 1 ? leaf() : { not: nested(depth - 1) };

/** A single combinator over `leaves` leaves — so `leaves + 1` nodes in total. */
const wide = (leaves: number): VariantCondition => ({ and: Array.from({ length: leaves }, leaf) });

// The limits are written as literals here, never imported from the module under test.
// Importing them makes a test move with the code: `nested(MAX_CONDITION_DEPTH + 1)` follows
// the constant to its new value, the interpolated message follows too, and the suite stays
// green while the limit a caller can observe has changed. Measured with the mutation drill
// (tdd.md step 6): with the constants imported, 10 -> 11 and 100 -> 101 survived every test
// in this file.
describe('assertConditionWithinLimits', () => {
  describe('depth', () => {
    it('accepts a condition ten levels deep', () => {
      const act = (): void => assertConditionWithinLimits(nested(10));

      expect(act).not.toThrow();
    });

    it('rejects a condition eleven levels deep', () => {
      const act = (): void => assertConditionWithinLimits(nested(11));

      expect(act).toThrow(VariantValidationError);
      expect(act).toThrow('Query condition nests deeper than the permitted 10 levels.');
    });

    it('reports an over-deep condition as query_too_complex', () => {
      let thrown: unknown;
      try {
        assertConditionWithinLimits(nested(11));
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(VariantValidationError);
      expect((thrown as VariantValidationError).code).toBe(VariantErrorCode.QUERY_TOO_COMPLEX);
    });
  });

  describe('node count', () => {
    it('accepts a condition of a hundred nodes', () => {
      const act = (): void => assertConditionWithinLimits(wide(99));

      expect(act).not.toThrow();
    });

    it('rejects a condition of a hundred and one nodes', () => {
      const act = (): void => assertConditionWithinLimits(wide(100));

      expect(act).toThrow('Query condition carries more than the permitted 100 nodes.');
    });

    it('counts nodes across sibling branches, not only along the deepest path', () => {
      const branch = (): VariantCondition => ({ or: Array.from({ length: 40 }, leaf) });
      const condition: VariantCondition = { and: [branch(), branch(), branch()] };

      const act = (): void => assertConditionWithinLimits(condition);

      expect(act).toThrow('Query condition carries more than the permitted 100 nodes.');
    });
  });

  it('accepts an absent condition', () => {
    const act = (): void => assertConditionWithinLimits(undefined);

    expect(act).not.toThrow();
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
