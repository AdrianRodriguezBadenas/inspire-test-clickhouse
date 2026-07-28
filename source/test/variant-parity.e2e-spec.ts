/**
 * The ANL-02 parity criteria: "the same logical query returns the same records, in the
 * same order, with equivalent paging, regardless of which access route the client uses",
 * and a rejected query is rejected on every route.
 *
 * Also the mandatory limits of adr-graphql-query-transport: no write surface, and no
 * introspection outside development.
 */

import request from 'supertest';
import type { Server } from 'node:http';
import { aVariantBody, bootstrapVariantStore, type VariantStore } from './variant-store';

const VARIANTS_QUERY = `
  query Variants($where: VariantConditionInput, $orderBy: [VariantOrderInput!], $limit: Int, $cursor: String) {
    variants(where: $where, orderBy: $orderBy, limit: $limit, cursor: $cursor) {
      items {
        id
        project_id
        collection
        uri
        origin
        type
        version_date
        created_at
        score
      }
      next_cursor
    }
  }
`;

/** The fields the GraphQL document above selects. */
const SELECTED = [
  'id',
  'project_id',
  'collection',
  'uri',
  'origin',
  'type',
  'version_date',
  'created_at',
  'score',
] as const;

/**
 * A REST item reduced to the fields the GraphQL query asked for.
 *
 * REST returns whole records and GraphQL returns the selection — comparing them whole
 * would only prove that GraphQL honours selection sets, not that the two routes agree.
 */
const asSelected = (item: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(SELECTED.map((field) => [field, item[field]]));

describe('Variant query parity across access routes (e2e)', () => {
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

  const insert = (body: Record<string, unknown>) => request(server).post('/variants').send(body);

  const viaRest = async (body: Record<string, unknown>) => {
    const response = await request(server).post('/variants/query').send(body);
    return response.body;
  };

  const viaGraphql = async (variables: Record<string, unknown>) => {
    const response = await request(server)
      .post('/graphql')
      .send({ query: VARIANTS_QUERY, variables });
    return response.body;
  };

  const seed = async (count: number): Promise<void> => {
    for (let index = 0; index < count; index += 1) {
      await insert(
        aVariantBody({ uri: `chr1:${index}:A:T`, score: index / 10, project_id: 42 }),
      );
    }
  };

  describe('the same query', () => {
    it('returns the same records through both routes', async () => {
      await seed(3);

      const rest = await viaRest({ where: { field: 'project_id', op: 'eq', value: 42 } });
      const graphql = await viaGraphql({ where: { field: 'project_id', op: 'EQ', value: 42 } });

      expect(graphql.data.variants.items).toEqual(rest.items.map(asSelected));
    });

    it('returns them in the same order', async () => {
      await seed(4);

      const rest = await viaRest({ order_by: [{ field: 'score', dir: 'desc' }] });
      const graphql = await viaGraphql({ orderBy: [{ field: 'score', dir: 'DESC' }] });

      expect(graphql.data.variants.items.map((item: { uri: string }) => item.uri)).toEqual(
        rest.items.map((item: { uri: string }) => item.uri),
      );
    });

    it('pages equivalently, cursor for cursor', async () => {
      await seed(5);

      const restFirst = await viaRest({ limit: 2 });
      const graphqlFirst = await viaGraphql({ limit: 2 });

      expect(graphqlFirst.data.variants.next_cursor).toBe(restFirst.next_cursor);

      const restSecond = await viaRest({ limit: 2, cursor: restFirst.next_cursor });
      const graphqlSecond = await viaGraphql({
        limit: 2,
        cursor: graphqlFirst.data.variants.next_cursor,
      });

      expect(graphqlSecond.data.variants.items).toEqual(restSecond.items.map(asSelected));
    });

    it('applies the same default page size', async () => {
      await seed(3);

      const rest = await viaRest({});
      const graphql = await viaGraphql({});

      expect(graphql.data.variants.items).toHaveLength(rest.items.length);
    });

    it('resolves a nested condition tree the same way', async () => {
      await insert(aVariantBody({ uri: 'chr1:1:A:T', score: 0.95 }));
      await insert(aVariantBody({ uri: 'chr1:2:A:T', score: 0.05 }));

      const condition = {
        and: [
          { field: 'project_id', op: 'eq', value: 42 },
          { not: { field: 'score', op: 'lt', value: 0.5 } },
        ],
      };
      const graphqlCondition = {
        and: [
          { field: 'project_id', op: 'EQ', value: 42 },
          { not: { field: 'score', op: 'LT', value: 0.5 } },
        ],
      };

      const rest = await viaRest({ where: condition });
      const graphql = await viaGraphql({ where: graphqlCondition });

      expect(graphql.data.variants.items).toEqual(rest.items.map(asSelected));
      expect(rest.items.map((item: { uri: string }) => item.uri)).toEqual(['chr1:1:A:T']);
    });

    it('returns the timestamps in the same rendering', async () => {
      await seed(1);

      const rest = await viaRest({});
      const graphql = await viaGraphql({});

      expect(graphql.data.variants.items[0].version_date).toBe(rest.items[0].version_date);
      expect(graphql.data.variants.items[0].created_at).toBe(rest.items[0].created_at);
    });
  });

  describe('a rejected query', () => {
    it('is rejected on both routes when an operator misuses its value', async () => {
      const condition = { field: 'score', op: 'is_null', value: 3 };
      const graphqlCondition = { field: 'score', op: 'IS_NULL', value: 3 };

      const rest = await request(server).post('/variants/query').send({ where: condition });
      const graphql = await viaGraphql({ where: graphqlCondition });

      expect(rest.body.code).toBe('invalid_query_condition');
      expect(rest.body.message).toBe('Operator is_null takes no value.');

      expect(graphql.errors[0].extensions.code).toBe('invalid_query_condition');
      expect(graphql.errors[0].message).toBe('Operator is_null takes no value.');
    });

    it('is rejected on both routes when nested beyond the permitted depth', async () => {
      const overDeep = Array.from({ length: 11 }).reduce<Record<string, unknown>>(
        (inner) => ({ not: inner }),
        { field: 'project_id', op: 'eq', value: 1 },
      );
      const graphqlOverDeep = Array.from({ length: 11 }).reduce<Record<string, unknown>>(
        (inner) => ({ not: inner }),
        { field: 'project_id', op: 'EQ', value: 1 },
      );

      const rest = await request(server).post('/variants/query').send({ where: overDeep });
      const graphql = await viaGraphql({ where: graphqlOverDeep });

      expect(rest.body.code).toBe('query_too_complex');
      expect(graphql.errors[0].extensions.code).toBe('query_too_complex');
      expect(graphql.errors[0].message).toBe(rest.body.message);
    });

    it('names the same unknown field on both routes', async () => {
      const rest = await request(server)
        .post('/variants/query')
        .send({ where: { field: 'not_a_column', op: 'eq', value: 1 } });
      const graphql = await viaGraphql({ where: { field: 'not_a_column', op: 'EQ', value: 1 } });

      expect(rest.body.message).toContain('not_a_column');

      // The routes disagree on *how* they say it, by design: the GraphQL surface
      // promotes the field allow-list to a schema enum (a requirement of
      // adr-graphql-query-transport), so an unknown field never reaches the domain
      // validator — the schema refuses it first. Both refuse the query and both name
      // the field; only the wording differs. ANL-02's "rejected identically" criterion
      // needs qualifying on this point — raised with /inspire_feature.
      expect(graphql.errors[0].message).toContain('not_a_column');
      expect(graphql.data ?? null).toBeNull();
    });

    it('names the same unsupported operator on both routes', async () => {
      const rest = await request(server)
        .post('/variants/query')
        .send({ where: { field: 'uri', op: 'regex', value: '.*' } });
      const graphql = await viaGraphql({ where: { field: 'uri', op: 'REGEX', value: '.*' } });

      expect(rest.body.message).toContain('regex');
      expect(graphql.errors[0].message).toContain('REGEX');
    });
  });

  describe('the GraphQL surface itself', () => {
    it('exposes no write', async () => {
      const response = await request(server)
        .post('/graphql')
        .send({ query: 'mutation { createVariant(project_id: 1) { id } }' });

      expect(response.body.errors).toBeDefined();
      expect(response.body.data ?? null).toBeNull();
    });

    it('does not answer introspection outside development', async () => {
      const response = await request(server)
        .post('/graphql')
        .send({ query: '{ __schema { types { name } } }' });

      expect(response.body.errors).toBeDefined();
      expect(response.body.data ?? null).toBeNull();
    });
  });
});
