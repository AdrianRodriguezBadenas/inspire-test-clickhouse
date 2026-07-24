import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL ?? 'http://localhost:8123';

const validPayload = (overrides: Record<string, unknown> = {}) => ({
  project_id: 42,
  uri: 'urn:variant:1',
  origin: 'GERMLINE',
  type: 'SNV/INDEL',
  collection: 'col-a',
  version_date: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const byKey = (uri: string, collection = 'col-a') => ({
  where: {
    and: [
      { field: 'project_id', op: 'eq', value: 42 },
      { field: 'collection', op: 'eq', value: collection },
      { field: 'uri', op: 'eq', value: uri },
    ],
  },
});

describe('Variants (e2e)', () => {
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

  const insert = async (overrides: Record<string, unknown> = {}): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/variants')
      .send(validPayload(overrides))
      .expect(201);
    return response.body.id as string;
  };

  const query = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/variants/query').send(body);

  // ---- create (ANL-01) ----

  it('stores a valid variant and returns its id', async () => {
    // WHEN
    const response = await request(app.getHttpServer())
      .post('/variants')
      .send(validPayload());

    // THEN
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: expect.any(String) });
  });

  it('rejects an insert missing a required field', async () => {
    // GIVEN
    const payload = validPayload();
    delete (payload as { project_id?: number }).project_id;

    // WHEN
    const response = await request(app.getHttpServer())
      .post('/variants')
      .send(payload);

    // THEN
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('missing_required_field');
    expect(response.body.fields).toContain('project_id');
  });

  it('rejects an insert missing version_date', async () => {
    // GIVEN
    const payload = validPayload();
    delete (payload as { version_date?: string }).version_date;

    // WHEN
    const response = await request(app.getHttpServer())
      .post('/variants')
      .send(payload);

    // THEN
    expect(response.status).toBe(400);
    expect(response.body.fields).toContain('version_date');
  });

  it('rejects an insert with an invalid enum value', async () => {
    // WHEN
    const response = await request(app.getHttpServer())
      .post('/variants')
      .send(validPayload({ origin: 'BOGUS' }));

    // THEN
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('invalid_enum_value');
    expect(response.body.fields).toContain('origin');
  });

  it('rejects an insert that supplies created_at', async () => {
    // WHEN
    const response = await request(app.getHttpServer())
      .post('/variants')
      .send(validPayload({ created_at: '2020-01-01T00:00:00.000Z' }));

    // THEN
    expect(response.status).toBe(400);
    expect(response.body.fields).toContain('created_at');
  });

  // ---- query (ANL-02) ----

  it('keeps the greatest version_date as current, even when the older one arrives last', async () => {
    // GIVEN — the NEWER version first, then a stale OLDER one.
    await insert({ version_date: '2024-06-01T00:00:00.000Z', score: 20 });
    await insert({ version_date: '2023-01-01T00:00:00.000Z', score: 10 });

    // WHEN
    const response = await query(byKey('urn:variant:1'));

    // THEN
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].score).toBe(20);
  });

  it('queries current variants matching a structured condition', async () => {
    // GIVEN
    await insert({ uri: 'urn:a', collection: 'col-a' });
    await insert({ uri: 'urn:b', collection: 'col-b' });

    // WHEN
    const response = await query({
      where: { field: 'collection', op: 'eq', value: 'col-a' },
    });

    // THEN
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].uri).toBe('urn:a');
    expect(response.body.next_cursor).toBeNull();
  });

  it('filters current variants with a comparison operator', async () => {
    // GIVEN
    await insert({ uri: 'urn:low', score: 10 });
    await insert({ uri: 'urn:high', score: 20 });

    // WHEN
    const response = await query({
      where: { field: 'score', op: 'gte', value: 15 },
    });

    // THEN
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].uri).toBe('urn:high');
  });

  it('returns a single current row per key, not every version', async () => {
    // GIVEN
    await insert({ uri: 'urn:x', version_date: '2024-01-01T00:00:00.000Z' });
    await insert({ uri: 'urn:x', version_date: '2024-02-01T00:00:00.000Z' });

    // WHEN
    const response = await query({
      where: { field: 'uri', op: 'eq', value: 'urn:x' },
    });

    // THEN
    expect(response.body.items).toHaveLength(1);
  });

  it('paginates results across pages with a cursor', async () => {
    // GIVEN
    await insert({ uri: 'urn:1' });
    await insert({ uri: 'urn:2' });
    await insert({ uri: 'urn:3' });

    // WHEN
    const page1 = await query({ limit: 2 }).expect(200);
    const page2 = await query({ limit: 2, cursor: page1.body.next_cursor }).expect(200);

    // THEN
    expect(page1.body.items).toHaveLength(2);
    expect(page1.body.next_cursor).toEqual(expect.any(String));

    expect(page2.body.items).toHaveLength(1);
    expect(page2.body.next_cursor).toBeNull();

    const ids = [...page1.body.items, ...page2.body.items].map(
      (item: { id: string }) => item.id,
    );
    expect(new Set(ids).size).toBe(3);
  });

  it('returns an empty page when nothing matches', async () => {
    // WHEN
    const response = await query({
      where: { field: 'collection', op: 'eq', value: 'none' },
    });

    // THEN
    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
    expect(response.body.next_cursor).toBeNull();
  });

  it('rejects a query on an unknown field', async () => {
    // WHEN
    const response = await query({
      where: { field: 'bogus_field', op: 'eq', value: 'x' },
    });

    // THEN
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('unknown_query_field');
  });
});
