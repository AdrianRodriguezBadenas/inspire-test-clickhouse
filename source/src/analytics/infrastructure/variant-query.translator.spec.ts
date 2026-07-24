import { QueryValidationError } from '../domain/variant-query';
import { translateOrderBy, translateWhere } from './variant-query.translator';

describe('translateWhere', () => {
  it('returns an empty fragment for no condition', () => {
    // WHEN
    const result = translateWhere(undefined);

    // THEN
    expect(result).toEqual({ sql: '', params: {} });
  });

  it('translates a scalar equality to a parameterized predicate', () => {
    // WHEN
    const result = translateWhere({ field: 'gene_symbol', op: 'eq', value: 'BRCA1' });

    // THEN
    expect(result.sql).toBe('`gene_symbol` = {p0:String}');
    expect(result.params).toEqual({ p0: 'BRCA1' });
  });

  it('binds numeric comparisons with the field type', () => {
    // WHEN
    const result = translateWhere({ field: 'score', op: 'gte', value: 0.9 });

    // THEN
    expect(result.sql).toBe('`score` >= {p0:Float64}');
    expect(result.params).toEqual({ p0: 0.9 });
  });

  it('translates IN to an array parameter', () => {
    // WHEN
    const result = translateWhere({
      field: 'clin_acmg',
      op: 'in',
      value: ['Pathogenic', 'Likely pathogenic'],
    });

    // THEN
    expect(result.sql).toBe('`clin_acmg` IN {p0:Array(String)}');
    expect(result.params).toEqual({ p0: ['Pathogenic', 'Likely pathogenic'] });
  });

  it('nests and/or with incrementing parameter names', () => {
    // WHEN
    const result = translateWhere({
      and: [
        { field: 'project_id', op: 'eq', value: 42 },
        {
          or: [
            { field: 'score', op: 'gte', value: 0.9 },
            { field: 'gene_symbol', op: 'eq', value: 'TP53' },
          ],
        },
      ],
    });

    // THEN
    expect(result.sql).toBe(
      '(`project_id` = {p0:UInt64} AND (`score` >= {p1:Float64} OR `gene_symbol` = {p2:String}))',
    );
    expect(result.params).toEqual({ p0: 42, p1: 0.9, p2: 'TP53' });
  });

  it('uses has() for equality on an array field', () => {
    // WHEN
    const result = translateWhere({ field: 'hpo', op: 'eq', value: 'HP:0001' });

    // THEN
    expect(result.sql).toBe('has(`hpo`, {p0:String})');
    expect(result.params).toEqual({ p0: 'HP:0001' });
  });

  it('rejects an unknown field', () => {
    // WHEN / THEN
    expect(() => translateWhere({ field: 'evil; DROP TABLE', op: 'eq', value: 1 })).toThrow(
      QueryValidationError,
    );
    try {
      translateWhere({ field: 'nope', op: 'eq', value: 1 });
    } catch (error) {
      expect((error as QueryValidationError).code).toBe('unknown_query_field');
    }
  });

  it('rejects an unknown operator', () => {
    // WHEN / THEN
    try {
      translateWhere({ field: 'score', op: 'regex' as never, value: 1 });
      fail('expected a QueryValidationError');
    } catch (error) {
      expect((error as QueryValidationError).code).toBe('unknown_query_operator');
    }
  });

  it('rejects a comparison operator on an array field', () => {
    // WHEN / THEN
    try {
      translateWhere({ field: 'hpo', op: 'gt', value: 'x' });
      fail('expected a QueryValidationError');
    } catch (error) {
      expect((error as QueryValidationError).code).toBe('invalid_query');
    }
  });

  it('rejects like on a non-string field', () => {
    // WHEN / THEN
    try {
      translateWhere({ field: 'score', op: 'like', value: '%x%' });
      fail('expected a QueryValidationError');
    } catch (error) {
      expect((error as QueryValidationError).code).toBe('invalid_query');
    }
  });
});

describe('translateOrderBy', () => {
  it('translates validated fields to a safe ORDER BY', () => {
    // WHEN
    const sql = translateOrderBy([
      { field: 'pos_position', dir: 'asc' },
      { field: 'score', dir: 'desc' },
    ]);

    // THEN
    expect(sql).toBe('`pos_position` ASC, `score` DESC');
  });

  it('rejects an unknown sort field', () => {
    // WHEN / THEN
    expect(() => translateOrderBy([{ field: 'bogus', dir: 'asc' }])).toThrow(
      QueryValidationError,
    );
  });
});
