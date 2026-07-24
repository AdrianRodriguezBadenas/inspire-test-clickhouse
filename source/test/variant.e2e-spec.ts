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

describe('Variants (e2e)', () => {
  let app: INestApplication;
  let ch: ClickHouseClient;

  beforeAll(async () => {
    ch = createClient({ url: CLICKHOUSE_URL });
    // Engine changed, so drop any pre-existing table before recreating.
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

  const countByKey = async (collection: string, uri: string): Promise<string> => {
    const result = await ch.query({
      query:
        'SELECT count() AS c FROM variants WHERE project_id = 42 AND collection = {c:String} AND uri = {u:String}',
      query_params: { c: collection, u: uri },
      format: 'JSONEachRow',
    });
    const [{ c }] = await result.json<{ c: string }>();
    return c;
  };

  // ANL-01 AC: a valid record is stored and the response identifies it.
  it('stores a valid variant and returns its id', async () => {
    // GIVEN
    const payload = validPayload();

    // WHEN
    const response = await request(app.getHttpServer())
      .post('/variants')
      .send(payload);

    // THEN
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: expect.any(String) });

    expect(await countByKey(payload.collection, payload.uri)).toBe('1');
  });

  // ANL-01 AC: a record missing a required field is rejected, naming the field.
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

  // ANL-01 AC: version_date is required.
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

  // ANL-01 AC: an enumerated field outside its allowed set is rejected.
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

  // ANL-01 AC: the ingest timestamp is set by the system, not taken from input.
  it('rejects an insert that supplies created_at', async () => {
    // WHEN
    const response = await request(app.getHttpServer())
      .post('/variants')
      .send(validPayload({ created_at: '2020-01-01T00:00:00.000Z' }));

    // THEN
    expect(response.status).toBe(400);
    expect(response.body.fields).toContain('created_at');
  });

  // ANL-01 AC: the current version is the greatest version_date, regardless of
  // insertion order (out-of-order safe).
  it('keeps the greatest version_date as current, even when the older one arrives last', async () => {
    // GIVEN — insert the NEWER version first, then a stale OLDER version.
    await insert({ version_date: '2024-06-01T00:00:00.000Z', score: 20 });
    await insert({ version_date: '2023-01-01T00:00:00.000Z', score: 10 });

    // WHEN — querying by the natural key returns only the current version.
    const response = await request(app.getHttpServer())
      .get('/variants')
      .query({ project_id: 42, collection: 'col-a', uri: 'urn:variant:1' });

    // THEN
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].score).toBe(20);

    // Both versions are retained in history.
    expect(await countByKey('col-a', 'urn:variant:1')).toBe('2');
  });

  // ANL-02 AC: filtered list returns one current row per matching key.
  it('lists only the current variants matching a filter', async () => {
    // GIVEN
    await insert({ uri: 'urn:a', collection: 'col-a' });
    await insert({ uri: 'urn:b', collection: 'col-b' });

    // WHEN
    const response = await request(app.getHttpServer())
      .get('/variants')
      .query({ collection: 'col-a' });

    // THEN
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].uri).toBe('urn:a');
    expect(response.body.next_cursor).toBeNull();
  });

  // ANL-02 AC: two versions of one variant collapse to a single current row in list.
  it('returns a single current row per key in list, not every version', async () => {
    // GIVEN
    await insert({ uri: 'urn:x', version_date: '2024-01-01T00:00:00.000Z' });
    await insert({ uri: 'urn:x', version_date: '2024-02-01T00:00:00.000Z' });

    // WHEN
    const response = await request(app.getHttpServer())
      .get('/variants')
      .query({ uri: 'urn:x' });

    // THEN
    expect(response.body.items).toHaveLength(1);
  });

  // ANL-02 AC: results are paginated; the cursor walks to the next page.
  it('paginates results across pages with a cursor', async () => {
    // GIVEN
    await insert({ uri: 'urn:1' });
    await insert({ uri: 'urn:2' });
    await insert({ uri: 'urn:3' });

    // WHEN
    const page1 = await request(app.getHttpServer())
      .get('/variants')
      .query({ limit: 2 })
      .expect(200);
    const page2 = await request(app.getHttpServer())
      .get('/variants')
      .query({ limit: 2, cursor: page1.body.next_cursor })
      .expect(200);

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

  // ANL-02 AC: filters that match no records yield an empty page, not an error.
  it('returns an empty page when nothing matches', async () => {
    // WHEN
    const response = await request(app.getHttpServer())
      .get('/variants')
      .query({ collection: 'none' });

    // THEN
    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
    expect(response.body.next_cursor).toBeNull();
  });

  // ANL-02 AC: a filter on a field that does not exist is rejected.
  it('rejects a filter on an unknown field', async () => {
    // WHEN
    const response = await request(app.getHttpServer())
      .get('/variants')
      .query({ bogus_field: 'x' });

    // THEN
    expect(response.status).toBe(400);
  });

  // A query pinning the full natural key returns at most one current record.
  it('returns a single record when querying by a full natural key', async () => {
    // GIVEN
    await insert({ uri: 'urn:one', collection: 'col-a' });

    // WHEN
    const response = await request(app.getHttpServer())
      .get('/variants')
      .query({ project_id: 42, collection: 'col-a', uri: 'urn:one' });

    // THEN
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].uri).toBe('urn:one');
  });
});
