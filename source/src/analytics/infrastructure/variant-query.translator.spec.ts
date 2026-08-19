import { translateVariantQuery } from './variant-query.translator';
import { SortDirection, VariantOperator } from '../domain/variant-query';
import type { ValidatedCondition, ValidatedQuery } from '../domain/variant-query.validation';

const leaf = (
  field: string,
  op: VariantOperator,
  value: unknown = null,
): ValidatedCondition => ({ kind: 'leaf', field: field as never, op, value });

const aQuery = (overrides: Partial<ValidatedQuery> = {}): ValidatedQuery => ({
  where: null,
  order_by: [],
  limit: 50,
  offset: 0,
  ...overrides,
});

/** Collapse whitespace so assertions read as one line. */
const flat = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

describe('translateVariantQuery', () => {
  describe('current-version projection', () => {
    it('dedups to the current version per natural key before applying conditions', () => {
      const translated = translateVariantQuery(aQuery(), 'variant');

      expect(flat(translated.sql)).toContain(
        'FROM variant ORDER BY version_date DESC LIMIT 1 BY project_id, collection, uri',
      );
    });

    it('applies client conditions outside the dedup, so only current rows can match', () => {
      const translated = translateVariantQuery(
        aQuery({ where: leaf('score', VariantOperator.GT, 0.5) }),
        'variant',
      );

      const [inner, outer] = flat(translated.sql).split('LIMIT 1 BY project_id, collection, uri');

      expect(inner).not.toContain('score');
      expect(outer).toContain('score > {p0:Float64}');
    });

    it('pages with the requested size and offset', () => {
      const translated = translateVariantQuery(aQuery({ limit: 25, offset: 75 }), 'variant');

      expect(flat(translated.sql)).toContain('LIMIT 26 OFFSET 75');
    });

    it('orders by the natural key so paging is deterministic without client ordering', () => {
      const translated = translateVariantQuery(aQuery(), 'variant');

      expect(flat(translated.sql)).toContain('ORDER BY project_id ASC, collection ASC, uri ASC');
    });

    it('appends the natural key after the client ordering as a tie-break', () => {
      const translated = translateVariantQuery(
        aQuery({ order_by: [{ field: 'score', dir: SortDirection.DESC }] }),
        'variant',
      );

      expect(flat(translated.sql)).toContain(
        'ORDER BY score DESC, project_id ASC, collection ASC, uri ASC',
      );
    });
  });

  describe('natural-key push-down', () => {
    it('pushes a natural-key condition into the dedup so the scan prunes', () => {
      const translated = translateVariantQuery(
        aQuery({ where: leaf('project_id', VariantOperator.EQ, 7) }),
        'variant',
      );

      const [inner] = flat(translated.sql).split('LIMIT 1 BY');

      expect(inner).toContain('WHERE project_id = {p0:UInt64}');
    });

    it('re-applies the pushed condition outside as well, binding the parameter once', () => {
      const translated = translateVariantQuery(
        aQuery({ where: leaf('project_id', VariantOperator.EQ, 7) }),
        'variant',
      );

      const sql = flat(translated.sql);

      expect(sql.match(/project_id = \{p0:UInt64\}/g)).toHaveLength(2);
      expect(translated.params).toEqual({ p0: 7 });
    });

    it('pushes each natural-key branch of a top-level conjunction', () => {
      const translated = translateVariantQuery(
        aQuery({
          where: {
            kind: 'and',
            children: [
              leaf('project_id', VariantOperator.EQ, 7),
              leaf('collection', VariantOperator.EQ, 'study-1'),
              leaf('score', VariantOperator.GT, 0.5),
            ],
          },
        }),
        'variant',
      );

      const [inner] = flat(translated.sql).split('LIMIT 1 BY');

      expect(inner).toContain('WHERE (project_id = {p0:UInt64}) AND (collection = {p1:String})');
      expect(inner).not.toContain('score');
    });

    it('never pushes a condition from inside a disjunction', () => {
      const translated = translateVariantQuery(
        aQuery({
          where: {
            kind: 'or',
            children: [
              leaf('project_id', VariantOperator.EQ, 7),
              leaf('project_id', VariantOperator.EQ, 8),
            ],
          },
        }),
        'variant',
      );

      const [inner] = flat(translated.sql).split('LIMIT 1 BY');

      expect(inner).not.toContain('WHERE');
    });

    it('never pushes a condition from inside a negation', () => {
      const translated = translateVariantQuery(
        aQuery({ where: { kind: 'not', child: leaf('project_id', VariantOperator.EQ, 7) } }),
        'variant',
      );

      const [inner] = flat(translated.sql).split('LIMIT 1 BY');

      expect(inner).not.toContain('WHERE');
    });

    it('does not push a condition on a non-key field', () => {
      const translated = translateVariantQuery(
        aQuery({ where: leaf('gene_symbol', VariantOperator.EQ, 'BRCA1') }),
        'variant',
      );

      const [inner] = flat(translated.sql).split('LIMIT 1 BY');

      expect(inner).not.toContain('WHERE');
    });
  });

  describe('operators', () => {
    it.each([
      [VariantOperator.EQ, 'score = {p0:Float64}', 0.5],
      [VariantOperator.NE, 'score != {p0:Float64}', 0.5],
      [VariantOperator.LT, 'score < {p0:Float64}', 0.5],
      [VariantOperator.LTE, 'score <= {p0:Float64}', 0.5],
      [VariantOperator.GT, 'score > {p0:Float64}', 0.5],
      [VariantOperator.GTE, 'score >= {p0:Float64}', 0.5],
    ])('translates %s to a bound comparison', (op, expected, value) => {
      const translated = translateVariantQuery(aQuery({ where: leaf('score', op, value) }), 'variant');

      expect(flat(translated.sql)).toContain(expected);
      expect(translated.params).toEqual({ p0: value });
    });

    it('translates in to a bound array membership test', () => {
      const translated = translateVariantQuery(
        aQuery({ where: leaf('project_id', VariantOperator.IN, [1, 2]) }),
        'variant',
      );

      expect(flat(translated.sql)).toContain('project_id IN {p0:Array(UInt64)}');
      expect(translated.params).toEqual({ p0: [1, 2] });
    });

    it('translates nin to a negated array membership test', () => {
      const translated = translateVariantQuery(
        aQuery({ where: leaf('uri', VariantOperator.NIN, ['a', 'b']) }),
        'variant',
      );

      expect(flat(translated.sql)).toContain('uri NOT IN {p0:Array(String)}');
    });

    it('translates like to a bound pattern match', () => {
      const translated = translateVariantQuery(
        aQuery({ where: leaf('uri', VariantOperator.LIKE, 'chr1:%') }),
        'variant',
      );

      expect(flat(translated.sql)).toContain('uri LIKE {p0:String}');
      expect(translated.params).toEqual({ p0: 'chr1:%' });
    });

    it('translates ilike to a case-insensitive bound pattern match', () => {
      const translated = translateVariantQuery(
        aQuery({ where: leaf('collection', VariantOperator.ILIKE, 'Study%') }),
        'variant',
      );

      expect(flat(translated.sql)).toContain('collection ILIKE {p0:String}');
    });

    it('translates between to two bound parameters', () => {
      const translated = translateVariantQuery(
        aQuery({ where: leaf('score', VariantOperator.BETWEEN, [0.1, 0.9]) }),
        'variant',
      );

      expect(flat(translated.sql)).toContain('score BETWEEN {p0:Float64} AND {p1:Float64}');
      expect(translated.params).toEqual({ p0: 0.1, p1: 0.9 });
    });

    it('translates is_null without binding a parameter', () => {
      const translated = translateVariantQuery(
        aQuery({ where: leaf('score', VariantOperator.IS_NULL) }),
        'variant',
      );

      expect(flat(translated.sql)).toContain('score IS NULL');
      expect(translated.params).toEqual({});
    });

    it('translates is_not_null without binding a parameter', () => {
      const translated = translateVariantQuery(
        aQuery({ where: leaf('score', VariantOperator.IS_NOT_NULL) }),
        'variant',
      );

      expect(flat(translated.sql)).toContain('score IS NOT NULL');
      expect(translated.params).toEqual({});
    });

    it('binds an array-column condition against the element type', () => {
      const translated = translateVariantQuery(
        aQuery({ where: leaf('hpo', VariantOperator.EQ, 'HP:0001250') }),
        'variant',
      );

      expect(flat(translated.sql)).toContain('has(hpo, {p0:String})');
    });

    it('binds a timestamp value as a UTC ClickHouse literal', () => {
      const translated = translateVariantQuery(
        aQuery({
          where: leaf('version_date', VariantOperator.GTE, new Date('2026-07-28T09:15:42.123Z')),
        }),
        'variant',
      );

      expect(flat(translated.sql)).toContain('version_date >= {p0:DateTime64(3)}');
      expect(translated.params).toEqual({ p0: '2026-07-28 09:15:42.123' });
    });
  });

  describe('combinators', () => {
    it('translates a conjunction', () => {
      const translated = translateVariantQuery(
        aQuery({
          where: {
            kind: 'and',
            children: [leaf('score', VariantOperator.GT, 1), leaf('uri', VariantOperator.EQ, 'x')],
          },
        }),
        'variant',
      );

      expect(flat(translated.sql)).toContain('(score > {p0:Float64}) AND (uri = {p1:String})');
    });

    it('translates a disjunction', () => {
      const translated = translateVariantQuery(
        aQuery({
          where: {
            kind: 'or',
            children: [leaf('score', VariantOperator.GT, 1), leaf('uri', VariantOperator.EQ, 'x')],
          },
        }),
        'variant',
      );

      expect(flat(translated.sql)).toContain('(score > {p0:Float64}) OR (uri = {p1:String})');
    });

    it('translates a negation', () => {
      const translated = translateVariantQuery(
        aQuery({ where: { kind: 'not', child: leaf('score', VariantOperator.GT, 1) } }),
        'variant',
      );

      expect(flat(translated.sql)).toContain('NOT (score > {p0:Float64})');
    });

    it('numbers parameters across a nested tree without collision', () => {
      const translated = translateVariantQuery(
        aQuery({
          where: {
            kind: 'and',
            children: [
              leaf('score', VariantOperator.GT, 1),
              {
                kind: 'or',
                children: [
                  leaf('uri', VariantOperator.EQ, 'x'),
                  leaf('collection', VariantOperator.EQ, 'y'),
                ],
              },
            ],
          },
        }),
        'variant',
      );

      expect(translated.params).toEqual({ p0: 1, p1: 'x', p2: 'y' });
    });
  });

  describe('injection safety', () => {
    it('never inlines a value into the statement', () => {
      const translated = translateVariantQuery(
        aQuery({ where: leaf('uri', VariantOperator.EQ, "x'; DROP TABLE variant; --") }),
        'variant',
      );

      expect(translated.sql).not.toContain('DROP TABLE');
      expect(translated.params).toEqual({ p0: "x'; DROP TABLE variant; --" });
    });

    it('never inlines a pattern into the statement', () => {
      const translated = translateVariantQuery(
        aQuery({ where: leaf('collection', VariantOperator.ILIKE, "%' OR 1=1 --") }),
        'variant',
      );

      expect(translated.sql).not.toContain('OR 1=1');
    });
  });
});
