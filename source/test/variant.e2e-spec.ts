/**
 * ANL-01 (insert) and ANL-02 (query) against a real ClickHouse: the acceptance criteria
 * that only a real store can prove — append-only writes, out-of-order version
 * resolution, current-only reads, and paging.
 */

import request from 'supertest';
import type { Server } from 'node:http';
import { aVariantBody, bootstrapVariantStore, type VariantStore } from './variant-store';

describe('Variants (e2e)', () => {
  let store: VariantStore;
  let server: Server;

  beforeAll(async () => {
    store = await bootstrapVariantStore();
    server = store.app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await store.close();
  });

  beforeEach(async () => {
    await store.clear();
  });

  const insert = (body: Record<string, unknown>) =>
    request(server).post('/variants').send(body);

  const query = (body: Record<string, unknown> = {}) =>
    request(server).post('/variants/query').send(body);

  describe('insert', () => {
    it('stores a valid record and confirms it with the stored id', async () => {
      const response = await insert(aVariantBody());

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ id: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    });

    it('makes the stored record retrievable as the current version', async () => {
      const created = await insert(aVariantBody({ score: 0.75 }));

      const page = await query({ where: { field: 'uri', op: 'eq', value: 'chr1:12345:A:T' } });

      expect(page.body.items).toHaveLength(1);
      expect(page.body.items[0]).toMatchObject({
        id: created.body.id,
        project_id: 42,
        collection: 'study-1',
        uri: 'chr1:12345:A:T',
        origin: 'GERMLINE',
        type: 'SNV/INDEL',
        version_date: '2026-07-01T00:00:00.000Z',
        score: 0.75,
      });
    });

    it('accepts a record carrying only the required fields, leaving the rest empty', async () => {
      await insert(aVariantBody());

      const page = await query();

      expect(page.body.items[0]).toMatchObject({ score: null, gene_symbol: null, hpo: [] });
    });

    it('sets the ingest timestamp itself', async () => {
      const before = Date.now();

      await insert(aVariantBody());

      const page = await query();
      const createdAt = new Date(page.body.items[0].created_at as string).getTime();
      expect(createdAt).toBeGreaterThanOrEqual(before - 1_000);
      expect(createdAt).toBeLessThanOrEqual(Date.now() + 1_000);
    });

    it('ignores an ingest timestamp a client tries to set', async () => {
      const response = await insert(aVariantBody({ created_at: '2000-01-01T00:00:00.000Z' }));

      // `created_at` is not part of the accepted body at all, so the request is refused
      // rather than silently corrected.
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('created_at');
    });

    it('rejects a record missing a required field, naming the field', async () => {
      const body = aVariantBody();
      delete body.collection;

      const response = await insert(body);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        code: 'missing_required_field',
        message: 'A required field is missing: collection.',
      });
    });

    it('rejects an enumerated field outside its allowed set, naming the allowed values', async () => {
      const response = await insert(aVariantBody({ origin: 'MOSAIC' }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        code: 'invalid_enum_value',
        message: 'Field origin must be one of: GERMLINE, SOMATIC, TRIO, PGx.',
      });
    });

    it('appends rather than replaces: both versions stay in the store', async () => {
      await insert(aVariantBody({ version_date: '2026-07-01T00:00:00.000Z' }));
      await insert(aVariantBody({ version_date: '2026-07-02T00:00:00.000Z' }));

      expect(await store.countRows()).toBe(2);
    });

    it('returns only the current version of a variant with several versions', async () => {
      await insert(aVariantBody({ version_date: '2026-07-01T00:00:00.000Z', score: 0.1 }));
      await insert(aVariantBody({ version_date: '2026-07-02T00:00:00.000Z', score: 0.2 }));

      const page = await query();

      expect(page.body.items).toHaveLength(1);
      expect(page.body.items[0]).toMatchObject({
        version_date: '2026-07-02T00:00:00.000Z',
        score: 0.2,
      });
    });

    it('resolves the current version by version_date, not by arrival order', async () => {
      await insert(aVariantBody({ version_date: '2026-07-02T00:00:00.000Z', score: 0.2 }));
      await insert(aVariantBody({ version_date: '2026-07-01T00:00:00.000Z', score: 0.1 }));

      const page = await query();

      expect(page.body.items).toHaveLength(1);
      expect(page.body.items[0]).toMatchObject({
        version_date: '2026-07-02T00:00:00.000Z',
        score: 0.2,
      });
    });
  });

  describe('query', () => {
    const insertMany = async (count: number, project = 42): Promise<void> => {
      for (let index = 0; index < count; index += 1) {
        await insert(aVariantBody({ project_id: project, uri: `chr1:${index}:A:T` }));
      }
    };

    it('returns the current variants matching the filters', async () => {
      await insert(aVariantBody({ project_id: 1, uri: 'chr1:1:A:T' }));
      await insert(aVariantBody({ project_id: 2, uri: 'chr2:2:A:T' }));

      const page = await query({ where: { field: 'project_id', op: 'eq', value: 2 } });

      expect(page.body.items).toHaveLength(1);
      expect(page.body.items[0]).toMatchObject({ project_id: 2, uri: 'chr2:2:A:T' });
    });

    it('returns every current variant when no filters are supplied', async () => {
      await insertMany(3);

      const page = await query();

      expect(page.body.items).toHaveLength(3);
      expect(page.body.next_cursor).toBeNull();
    });

    it('returns an empty page rather than an error when nothing matches', async () => {
      await insertMany(1);

      const response = await query({ where: { field: 'project_id', op: 'eq', value: 9_999 } });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ items: [], next_cursor: null });
    });

    it('pages with a cursor when more results exist', async () => {
      await insertMany(3);

      const first = await query({ limit: 2 });

      expect(first.body.items).toHaveLength(2);
      expect(first.body.next_cursor).not.toBeNull();
    });

    it('continues from the cursor without repeating or skipping a record', async () => {
      await insertMany(5);

      const first = await query({ limit: 2 });
      const second = await query({ limit: 2, cursor: first.body.next_cursor });
      const third = await query({ limit: 2, cursor: second.body.next_cursor });

      const uris = [...first.body.items, ...second.body.items, ...third.body.items].map(
        (item: { uri: string }) => item.uri,
      );
      expect(uris).toEqual(['chr1:0:A:T', 'chr1:1:A:T', 'chr1:2:A:T', 'chr1:3:A:T', 'chr1:4:A:T']);
      expect(third.body.next_cursor).toBeNull();
    });

    // The literals are deliberate: ANL-02 states "defaults to 50 and is capped at 200",
    // so 50 and 200 are the contract. Importing DEFAULT_PAGE_SIZE / MAX_PAGE_SIZE here
    // would assert the code against itself — changing the constant would change the
    // expectation with it, and the test would pass through the regression.
    it('defaults the page to 50 and caps it at 200, clamping rather than rejecting', async () => {
      await insertMany(201);
      // Default ordering is project_id, collection, uri ASC — uri compares as a STRING,
      // so the page boundary falls on lexicographic order (chr1:0, chr1:1, chr1:10, …),
      // not numeric. Asserting the exact slice pins that; a length check hides it.
      const inStoredOrder = Array.from({ length: 201 }, (_, i) => `chr1:${i}:A:T`).sort();

      const defaulted = await query();
      const overMax = await query({ limit: 500 });

      expect(Object.keys(defaulted.body).sort()).toEqual(['items', 'next_cursor']);
      expect(defaulted.body.items.map((item: { uri: string }) => item.uri)).toEqual(
        inStoredOrder.slice(0, 50),
      );
      expect(defaulted.body.next_cursor).toEqual(expect.any(String));

      expect(overMax.status).toBe(200);
      expect(Object.keys(overMax.body).sort()).toEqual(['items', 'next_cursor']);
      expect(overMax.body.items.map((item: { uri: string }) => item.uri)).toEqual(
        inStoredOrder.slice(0, 200),
      );
      expect(overMax.body.next_cursor).toEqual(expect.any(String));
    });

    it('orders by the field the client asked for', async () => {
      await insert(aVariantBody({ uri: 'chr1:1:A:T', score: 0.1 }));
      await insert(aVariantBody({ uri: 'chr1:2:A:T', score: 0.9 }));

      const page = await query({ order_by: [{ field: 'score', dir: 'desc' }] });

      expect(page.body.items.map((item: { score: number }) => item.score)).toEqual([0.9, 0.1]);
    });

    it('rejects a filter on a field that does not exist, naming the field', async () => {
      const response = await query({ where: { field: 'not_a_column', op: 'eq', value: 1 } });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        code: 'unknown_query_field',
        message: 'Unknown query field: not_a_column.',
      });
    });

    it('rejects an operator outside the fixed set', async () => {
      const response = await query({ where: { field: 'uri', op: 'regex', value: '.*' } });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('unknown_query_operator');
    });

    it('rejects an over-nested query without reading any data', async () => {
      const overDeep = Array.from({ length: 11 }).reduce<Record<string, unknown>>(
        (inner) => ({ not: inner }),
        { field: 'project_id', op: 'eq', value: 1 },
      );

      const response = await query({ where: overDeep });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('query_too_complex');
    });

    it('modifies nothing', async () => {
      await insertMany(2);
      const before = await store.countRows();

      await query({ where: { field: 'project_id', op: 'eq', value: 42 } });

      expect(await store.countRows()).toBe(before);
    });

    it('translates a nested condition tree', async () => {
      await insert(aVariantBody({ uri: 'chr1:1:A:T', score: 0.95, gene_symbol: 'BRCA1' }));
      await insert(aVariantBody({ uri: 'chr1:2:A:T', score: 0.10, gene_symbol: 'BRCA2' }));
      await insert(aVariantBody({ uri: 'chr1:3:A:T', score: 0.99, gene_symbol: 'TP53' }));

      const page = await query({
        where: {
          and: [
            { field: 'project_id', op: 'eq', value: 42 },
            {
              or: [
                { field: 'score', op: 'gte', value: 0.9 },
                { field: 'gene_symbol', op: 'eq', value: 'BRCA2' },
              ],
            },
            { not: { field: 'gene_symbol', op: 'eq', value: 'TP53' } },
          ],
        },
        order_by: [{ field: 'uri', dir: 'asc' }],
      });

      expect(page.body.items.map((item: { uri: string }) => item.uri)).toEqual([
        'chr1:1:A:T',
        'chr1:2:A:T',
      ]);
    });

    it('matches a code inside a list field', async () => {
      await insert(aVariantBody({ uri: 'chr1:1:A:T', hpo: ['HP:0001250', 'HP:0002020'] }));
      await insert(aVariantBody({ uri: 'chr1:2:A:T', hpo: ['HP:0009999'] }));

      const page = await query({ where: { field: 'hpo', op: 'eq', value: 'HP:0001250' } });

      expect(page.body.items.map((item: { uri: string }) => item.uri)).toEqual(['chr1:1:A:T']);
    });

    it('never returns a value a caller could have injected', async () => {
      await insertMany(1);

      const response = await query({
        where: { field: 'uri', op: 'eq', value: "x' OR 1=1 --" },
      });

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual([]);
    });
  });
});
