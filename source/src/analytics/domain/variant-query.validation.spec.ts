import { validateVariantQuery } from './variant-query.validation';
import { VariantErrorCode, VariantValidationError } from './variant-errors';
import { SortDirection, VariantOperator } from './variant-query';
import type { VariantQuery } from './variant-query';

const codeOf = (act: () => unknown): VariantErrorCode => {
  try {
    act();
  } catch (error) {
    if (error instanceof VariantValidationError) return error.code;
    throw error;
  }
  throw new Error('expected a VariantValidationError, none was thrown');
};

describe('validateVariantQuery', () => {
  describe('page size', () => {
    it('defaults the page size to fifty when none is supplied', () => {
      const validated = validateVariantQuery({});

      expect(validated.limit).toBe(50);
    });

    it('honors a page size within the cap', () => {
      const validated = validateVariantQuery({ limit: 25 });

      expect(validated.limit).toBe(25);
    });

    it('caps a page size of two hundred and one at two hundred', () => {
      const validated = validateVariantQuery({ limit: 201 });

      expect(validated.limit).toBe(200);
    });

    it('rejects a page size below one', () => {
      const act = (): unknown => validateVariantQuery({ limit: 0 });

      expect(codeOf(act)).toBe(VariantErrorCode.INVALID_QUERY_CONDITION);
      expect(act).toThrow('Page size must be a positive integer.');
    });

    it('rejects a fractional page size', () => {
      const act = (): unknown => validateVariantQuery({ limit: 10.5 });

      expect(act).toThrow('Page size must be a positive integer.');
    });
  });

  describe('conditions', () => {
    it('accepts a leaf on a known field with a known operator', () => {
      const query: VariantQuery = { where: { field: 'project_id', op: 'eq', value: 7 } };

      const validated = validateVariantQuery(query);

      expect(validated.where).toEqual({
        kind: 'leaf',
        field: 'project_id',
        op: VariantOperator.EQ,
        value: 7,
      });
    });

    it('rejects a leaf whose field is not a known variant column', () => {
      const query: VariantQuery = { where: { field: 'not_a_column', op: 'eq', value: 1 } };

      const act = (): unknown => validateVariantQuery(query);

      expect(codeOf(act)).toBe(VariantErrorCode.UNKNOWN_QUERY_FIELD);
      expect(act).toThrow('Unknown query field: not_a_column.');
    });

    it('rejects a leaf whose operator is outside the fixed set', () => {
      const query: VariantQuery = { where: { field: 'project_id', op: 'regex', value: '.*' } };

      const act = (): unknown => validateVariantQuery(query);

      expect(codeOf(act)).toBe(VariantErrorCode.UNKNOWN_QUERY_OPERATOR);
      expect(act).toThrow('Unsupported operator: regex.');
    });

    it('validates every branch of a combinator, not just the first', () => {
      const query: VariantQuery = {
        where: {
          and: [
            { field: 'project_id', op: 'eq', value: 1 },
            { field: 'ghost_field', op: 'eq', value: 2 },
          ],
        },
      };

      const act = (): unknown => validateVariantQuery(query);

      expect(act).toThrow('Unknown query field: ghost_field.');
    });

    it('narrows a combinator into a typed tree', () => {
      const query: VariantQuery = {
        where: { not: { field: 'collection', op: 'ilike', value: 'study%' } },
      };

      const validated = validateVariantQuery(query);

      expect(validated.where).toEqual({
        kind: 'not',
        child: { kind: 'leaf', field: 'collection', op: VariantOperator.ILIKE, value: 'study%' },
      });
    });

    it('discriminates a node by its defined value, not by which keys are present', () => {
      const query: VariantQuery = {
        where: {
          and: null,
          or: null,
          not: null,
          field: 'uri',
          op: 'eq',
          value: 'chr1:1:A:T',
        },
      };

      const validated = validateVariantQuery(query);

      expect(validated.where).toEqual({
        kind: 'leaf',
        field: 'uri',
        op: VariantOperator.EQ,
        value: 'chr1:1:A:T',
      });
    });

    it('rejects a node that mixes a combinator with a leaf', () => {
      const query: VariantQuery = {
        where: { and: [{ field: 'project_id', op: 'eq', value: 1 }], field: 'uri', op: 'eq', value: 'x' },
      };

      const act = (): unknown => validateVariantQuery(query);

      expect(codeOf(act)).toBe(VariantErrorCode.INVALID_QUERY_CONDITION);
      expect(act).toThrow(
        'A query condition must be exactly one of and / or / not / a {field, op, value} leaf.',
      );
    });

    it('rejects an empty condition node', () => {
      const act = (): unknown => validateVariantQuery({ where: {} });

      expect(codeOf(act)).toBe(VariantErrorCode.INVALID_QUERY_CONDITION);
    });

    it('rejects a combinator with no branches', () => {
      const act = (): unknown => validateVariantQuery({ where: { and: [] } });

      expect(act).toThrow('A query condition combinator needs at least one branch.');
    });

    it('leaves an absent condition absent', () => {
      const validated = validateVariantQuery({});

      expect(validated.where).toBeNull();
    });

    it('enforces the depth bound before validating fields', () => {
      // Ten wrappers around the leaf is depth eleven — the first depth the bound rejects.
      const overDeep = Array.from({ length: 10 }).reduce<Record<string, unknown>>(
        (inner) => ({ not: inner }),
        { field: 'ghost_field', op: 'eq', value: 1 },
      );

      const act = (): unknown => validateVariantQuery({ where: overDeep });

      expect(codeOf(act)).toBe(VariantErrorCode.QUERY_TOO_COMPLEX);
    });
  });

  describe('operator value shapes', () => {
    it('accepts a list value for in', () => {
      const validated = validateVariantQuery({
        where: { field: 'project_id', op: 'in', value: [1, 2, 3] },
      });

      expect(validated.where).toEqual({
        kind: 'leaf',
        field: 'project_id',
        op: VariantOperator.IN,
        value: [1, 2, 3],
      });
    });

    it('rejects a scalar value for in', () => {
      const act = (): unknown => validateVariantQuery({
        where: { field: 'project_id', op: 'in', value: 1 },
      });

      expect(codeOf(act)).toBe(VariantErrorCode.INVALID_QUERY_CONDITION);
      expect(act).toThrow('Operator in expects a non-empty list value.');
    });

    it('rejects an empty list value for in', () => {
      const act = (): unknown => validateVariantQuery({
        where: { field: 'project_id', op: 'in', value: [] },
      });

      expect(act).toThrow('Operator in expects a non-empty list value.');
    });

    it('accepts a two-element bound for between', () => {
      const validated = validateVariantQuery({
        where: { field: 'score', op: 'between', value: [1, 9] },
      });

      expect(validated.where).toEqual({
        kind: 'leaf',
        field: 'score',
        op: VariantOperator.BETWEEN,
        value: [1, 9],
      });
    });

    it('rejects a three-element bound for between', () => {
      const act = (): unknown => validateVariantQuery({
        where: { field: 'score', op: 'between', value: [1, 5, 9] },
      });

      expect(act).toThrow('Operator between expects a list of exactly two values.');
    });

    it('accepts a null-check operator with no value', () => {
      const validated = validateVariantQuery({ where: { field: 'score', op: 'is_null' } });

      expect(validated.where).toEqual({
        kind: 'leaf',
        field: 'score',
        op: VariantOperator.IS_NULL,
        value: null,
      });
    });

    it('rejects a value on a null-check operator', () => {
      const act = (): unknown => validateVariantQuery({
        where: { field: 'score', op: 'is_null', value: 3 },
      });

      expect(act).toThrow('Operator is_null takes no value.');
    });

    it('rejects a non-string pattern for like', () => {
      const act = (): unknown => validateVariantQuery({
        where: { field: 'uri', op: 'like', value: 42 },
      });

      expect(act).toThrow('Operator like expects a string value.');
    });

    it('rejects a missing value on a comparison operator', () => {
      const act = (): unknown => validateVariantQuery({ where: { field: 'score', op: 'gt' } });

      expect(act).toThrow('Operator gt expects a value.');
    });
  });

  describe('list fields', () => {
    it('accepts a membership test on a list field', () => {
      const validated = validateVariantQuery({
        where: { field: 'hpo', op: 'eq', value: 'HP:0001250' },
      });

      expect(validated.where).toEqual({
        kind: 'leaf',
        field: 'hpo',
        op: VariantOperator.EQ,
        value: 'HP:0001250',
      });
    });

    it('rejects an ordering comparison on a list field', () => {
      const act = (): unknown => validateVariantQuery({
        where: { field: 'hpo', op: 'gt', value: 'HP:0001250' },
      });

      expect(codeOf(act)).toBe(VariantErrorCode.INVALID_QUERY_CONDITION);
      expect(act).toThrow('Operator gt cannot be applied to the list field hpo.');
    });

    it('rejects a null check on a list field', () => {
      const act = (): unknown => validateVariantQuery({ where: { field: 'hpo', op: 'is_null' } });

      expect(act).toThrow('Operator is_null cannot be applied to the list field hpo.');
    });
  });

  describe('ordering', () => {
    it('accepts ordering on a known field', () => {
      const validated = validateVariantQuery({
        order_by: [{ field: 'version_date', dir: 'desc' }],
      });

      expect(validated.order_by).toEqual([
        { field: 'version_date', dir: SortDirection.DESC },
      ]);
    });

    it('defaults the direction to ascending', () => {
      const validated = validateVariantQuery({ order_by: [{ field: 'uri' }] });

      expect(validated.order_by).toEqual([{ field: 'uri', dir: SortDirection.ASC }]);
    });

    it('rejects ordering on an unknown field', () => {
      const act = (): unknown => validateVariantQuery({ order_by: [{ field: 'nope' }] });

      expect(codeOf(act)).toBe(VariantErrorCode.UNKNOWN_QUERY_FIELD);
      expect(act).toThrow('Unknown query field: nope.');
    });

    it('rejects an unknown sort direction', () => {
      const act = (): unknown => validateVariantQuery({
        order_by: [{ field: 'uri', dir: 'sideways' }],
      });

      expect(codeOf(act)).toBe(VariantErrorCode.INVALID_QUERY_CONDITION);
      expect(act).toThrow('Sort direction must be asc or desc, got sideways.');
    });
  });

  describe('cursor', () => {
    it('reads an offset out of a cursor it issued', () => {
      const validated = validateVariantQuery({ cursor: encodeCursor(100) });

      expect(validated.offset).toBe(100);
    });

    it('starts at offset zero when no cursor is supplied', () => {
      const validated = validateVariantQuery({});

      expect(validated.offset).toBe(0);
    });

    it('rejects an unreadable cursor', () => {
      const act = (): unknown => validateVariantQuery({ cursor: 'not-a-cursor' });

      expect(codeOf(act)).toBe(VariantErrorCode.INVALID_QUERY_CONDITION);
      expect(act).toThrow('Invalid cursor.');
    });

    it('rejects a cursor carrying a negative offset', () => {
      const act = (): unknown => validateVariantQuery({ cursor: encodeCursor(-1) });

      expect(act).toThrow('Invalid cursor.');
    });
  });
});

/** Mirrors what the service hands back as `next_cursor`. */
const encodeCursor = (offset: number): string =>
  Buffer.from(JSON.stringify({ o: offset }), 'utf8').toString('base64url');
