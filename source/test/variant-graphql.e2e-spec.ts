// Parity between the two access routes onto the variant read contract
// (.inspire_kb/01_adr/adr-graphql-query-transport.md, ANL-02).
//
// The ADR's load-bearing claim is that REST and GraphQL are thin adapters over one
// service. These tests are what keeps that claim honest: the same logical query
// must return the same records and fail the same way through both.

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MAX_CONDITION_DEPTH } from '../src/analytics/domain/variant-query.limits';

const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL ?? 'http://localhost:8123';

const VARIANTS_QUERY = `
  query Variants($where: VariantCondition, $orderBy: [VariantOrder!], $limit: Int, $cursor: String) {
    variants(where: $where, orderBy: $orderBy, limit: $limit, cursor: $cursor) {
      items { id project_id uri collection score version_date }
      next_cursor
    }
  }
`;

const validPayload = (overrides: Record<string, unknown> = {}) => ({
  project_id: 42,
  uri: 'urn:variant:1',
  origin: 'GERMLINE',
  type: 'SNV/INDEL',
  collection: 'col-a',
  version_date: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

/** A condition tree nested one level beyond the shared limit. */
const overNested = (): Record<string, unknown> => {
  let node: Record<string, unknown> = {
    field: 'project_id',
    op: 'eq',
    value: 42,
  };
  for (let i = 0; i < MAX_CONDITION_DEPTH; i++) {
    node = { and: [node] };
  }
  return node;
};

describe('Variant read parity: REST vs GraphQL (e2e)', () => {
  let app: INestApplication;
  let ch: ClickHouseClient;

  beforeAll(async () => {
    ch = createClient({ url: CLICKHOUSE_URL });
    await ch.command({ query: 'DROP TABLE IF EXISTS variants' });
    const schema = readFileSync(join(__dirname, '../db/schema.sql'), 'utf8');
    await ch.command({ query: schema });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await ch.close();
    await app.close();
  });

  beforeEach(async () => {
    await ch.command({ query: 'TRUNCATE TABLE variants' });
  });

  const insert = async (overrides: Record<string, unknown> = {}): Promise<void> => {
    await request(app.getHttpServer())
      .post('/variants')
      .send(validPayload(overrides))
      .expect(201);
  };

  const viaRest = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/variants/query').send(body);

  const viaGraphql = (variables: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({ query: VARIANTS_QUERY, variables });

  /** The GraphQL page, failing loudly with the server's errors when absent. */
  const graphqlPage = (body: {
    data?: { variants?: { items: { uri: string }[]; next_cursor: string | null } };
    errors?: unknown;
  }) => {
    if (!body.data?.variants) {
      throw new Error(`GraphQL returned no data: ${JSON.stringify(body.errors)}`);
    }
    return body.data.variants;
  };

  // ---- result parity ----

  it('returns the same records through both routes for the same condition', async () => {
    // GIVEN
    await insert({ uri: 'urn:a', collection: 'col-a', score: 10 });
    await insert({ uri: 'urn:b', collection: 'col-b', score: 20 });
    const where = { field: 'collection', op: 'eq', value: 'col-a' };

    // WHEN
    const rest = await viaRest({ where, order_by: [{ field: 'uri', dir: 'asc' }] });
    const graphql = await viaGraphql({
      where,
      orderBy: [{ field: 'uri', dir: 'asc' }],
    });

    // THEN
    expect(rest.status).toBe(200);
    expect(graphql.status).toBe(200);

    const restUris = rest.body.items.map((item: { uri: string }) => item.uri);
    const graphqlUris = graphql.body.data.variants.items.map(
      (item: { uri: string }) => item.uri,
    );
    expect(graphqlUris).toEqual(restUris);
    expect(graphqlUris).toEqual(['urn:a']);
  });

  it('returns every current variant through both routes when no filter is given', async () => {
    // GIVEN
    await insert({ uri: 'urn:a' });
    await insert({ uri: 'urn:b' });

    // WHEN
    const rest = await viaRest({ order_by: [{ field: 'uri', dir: 'asc' }] });
    const graphql = await viaGraphql({ orderBy: [{ field: 'uri', dir: 'asc' }] });

    // THEN
    const restUris = rest.body.items.map((item: { uri: string }) => item.uri);
    const graphqlUris = graphqlPage(graphql.body).items.map((item) => item.uri);
    expect(graphqlUris).toEqual(restUris);
    expect(graphqlUris).toEqual(['urn:a', 'urn:b']);
  });

  it('paginates identically through both routes', async () => {
    // GIVEN
    await insert({ uri: 'urn:a' });
    await insert({ uri: 'urn:b' });
    await insert({ uri: 'urn:c' });
    const order = [{ field: 'uri', dir: 'asc' }];

    // WHEN
    const rest = await viaRest({ order_by: order, limit: 2 });
    const graphql = await viaGraphql({ orderBy: order, limit: 2 });

    // THEN
    expect(graphql.body.data.variants.next_cursor).toBe(rest.body.next_cursor);
    expect(graphql.body.data.variants.next_cursor).not.toBeNull();

    const restSecond = await viaRest({
      order_by: order,
      limit: 2,
      cursor: rest.body.next_cursor,
    });
    const graphqlSecond = await viaGraphql({
      orderBy: order,
      limit: 2,
      cursor: graphql.body.data.variants.next_cursor,
    });
    expect(
      graphqlSecond.body.data.variants.items.map((i: { uri: string }) => i.uri),
    ).toEqual(restSecond.body.items.map((i: { uri: string }) => i.uri));
  });

  it('returns only the current version through both routes', async () => {
    // GIVEN — the newer version arrives first, the stale one last
    await insert({ uri: 'urn:x', version_date: '2024-06-01T00:00:00.000Z', score: 20 });
    await insert({ uri: 'urn:x', version_date: '2023-01-01T00:00:00.000Z', score: 10 });
    const where = { field: 'uri', op: 'eq', value: 'urn:x' };

    // WHEN
    const rest = await viaRest({ where });
    const graphql = await viaGraphql({ where });

    // THEN
    expect(rest.body.items).toHaveLength(1);
    expect(graphql.body.data.variants.items).toHaveLength(1);
    expect(graphql.body.data.variants.items[0].score).toBe(
      rest.body.items[0].score,
    );
    expect(graphql.body.data.variants.items[0].score).toBe(20);
  });

  it('returns an empty page rather than an error when nothing matches', async () => {
    // GIVEN
    const where = { field: 'uri', op: 'eq', value: 'urn:absent' };

    // WHEN
    const rest = await viaRest({ where });
    const graphql = await viaGraphql({ where });

    // THEN
    expect(rest.status).toBe(200);
    expect(rest.body).toEqual({ items: [], next_cursor: null });

    expect(graphql.status).toBe(200);
    expect(graphql.body.errors).toBeUndefined();
    expect(graphql.body.data.variants).toEqual({ items: [], next_cursor: null });
  });

  // ---- error parity, where the shared validator owns the check ----

  it('rejects an over-nested tree with the same code through both routes', async () => {
    // GIVEN
    const where = overNested();

    // WHEN
    const rest = await viaRest({ where });
    const graphql = await viaGraphql({ where });

    // THEN
    expect(rest.status).toBe(400);
    expect(rest.body.code).toBe('query_too_complex');

    expect(graphql.body.errors).toHaveLength(1);
    expect(graphql.body.errors[0].extensions.code).toBe('query_too_complex');
    expect(graphql.body.errors[0].message).toBe(rest.body.message);
  });

  it('rejects `in` without a list value with the same code through both routes', async () => {
    // GIVEN
    const where = { field: 'collection', op: 'in', value: 'col-a' };

    // WHEN
    const rest = await viaRest({ where });
    const graphql = await viaGraphql({ where });

    // THEN
    expect(rest.status).toBe(400);
    expect(rest.body.code).toBe('invalid_query');

    expect(graphql.body.errors[0].extensions.code).toBe('invalid_query');
    expect(graphql.body.errors[0].message).toBe(rest.body.message);
  });

  it('rejects `like` on a non-string field with the same code through both routes', async () => {
    // GIVEN
    const where = { field: 'score', op: 'like', value: '%1%' };

    // WHEN
    const rest = await viaRest({ where });
    const graphql = await viaGraphql({ where });

    // THEN
    expect(rest.status).toBe(400);
    expect(rest.body.code).toBe('invalid_query');

    expect(graphql.body.errors[0].extensions.code).toBe('invalid_query');
    expect(graphql.body.errors[0].message).toBe(rest.body.message);
  });

  // ---- error parity, where the GraphQL schema catches it first ----

  it('rejects an unknown field on both routes, naming the field', async () => {
    // GIVEN
    const where = { field: 'bogus_field', op: 'eq', value: 1 };

    // WHEN
    const rest = await viaRest({ where });
    const graphql = await viaGraphql({ where });

    // THEN — REST reaches the translator, which owns the allow-list
    expect(rest.status).toBe(400);
    expect(rest.body.code).toBe('unknown_query_field');
    expect(rest.body.message).toContain('bogus_field');

    // THEN — GraphQL rejects earlier, at the schema: `field` is a VariantField
    // enum, so the allow-list is enforced before the resolver runs. The code
    // therefore differs by design; both reject, and both name the field.
    expect(graphql.body.data).toBeFalsy();
    expect(graphql.body.errors[0].message).toContain('bogus_field');
  });

  it('rejects an unknown operator on both routes, naming the operator', async () => {
    // GIVEN
    const where = { field: 'collection', op: 'regex', value: '.*' };

    // WHEN
    const rest = await viaRest({ where });
    const graphql = await viaGraphql({ where });

    // THEN
    expect(rest.status).toBe(400);
    expect(rest.body.code).toBe('unknown_query_operator');
    expect(rest.body.message).toContain('regex');

    expect(graphql.body.data).toBeFalsy();
    expect(graphql.body.errors[0].message).toContain('regex');
  });

  // ---- the surface is read-only ----

  it('exposes no mutation at all', () => {
    // WHEN — read from the built schema; introspection is off outside development
    const { schema } = app.get(GraphQLSchemaHost);

    // THEN
    expect(schema.getMutationType()).toBeUndefined();
    expect(schema.getSubscriptionType()).toBeUndefined();
    expect(schema.getQueryType()?.getFields()).toHaveProperty('variants');
  });

  // ADR adr-graphql-query-transport: introspection is development-only. NODE_ENV
  // is `test` here, so it must already be closed.
  it('refuses introspection outside development', async () => {
    // WHEN
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ __schema { types { name } } }' });

    // THEN
    expect(response.body.data).toBeFalsy();
    expect(response.body.errors).toBeDefined();
  });

  it('rejects an attempt to write through GraphQL', async () => {
    // WHEN
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'mutation { createVariant(project_id: 42) { id } }',
      });

    // THEN
    expect(response.body.data).toBeFalsy();
    expect(response.body.errors).toBeDefined();
  });

  // ---- REST is untouched ----

  // Swagger is set up in main.ts rather than configureApp, so the document is
  // built here from the same app to check the REST contract is still published.
  it('still documents both REST endpoints in Swagger', () => {
    // GIVEN
    const config = new DocumentBuilder().setTitle('parity-check').build();

    // WHEN
    const document = SwaggerModule.createDocument(app, config);

    // THEN
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining(['/variants', '/variants/query']),
    );
    expect(document.paths['/variants'].post).toBeDefined();
    expect(document.paths['/variants/query'].post).toBeDefined();
  });
});
