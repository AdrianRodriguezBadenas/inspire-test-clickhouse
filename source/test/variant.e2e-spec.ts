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
  ...overrides,
});

interface StoredVariant {
  id: string;
  project_id: string;
  uri: string;
  origin: string;
  type: string;
  collection: string;
}

describe('Variants (e2e)', () => {
  let app: INestApplication;
  let ch: ClickHouseClient;

  beforeAll(async () => {
    ch = createClient({ url: CLICKHOUSE_URL });
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

  const selectById = async (id: string): Promise<StoredVariant[]> => {
    const result = await ch.query({
      query:
        'SELECT id, project_id, uri, origin, type, collection FROM variants FINAL WHERE id = {id:UUID}',
      query_params: { id },
      format: 'JSONEachRow',
    });
    return result.json<StoredVariant>();
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

    const stored = await selectById(response.body.id);
    expect(stored).toEqual([
      {
        id: response.body.id,
        project_id: String(payload.project_id),
        uri: payload.uri,
        origin: payload.origin,
        type: payload.type,
        collection: payload.collection,
      },
    ]);
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

  // ANL-01 AC: an enumerated field outside its allowed set is rejected.
  it('rejects an insert with an invalid enum value', async () => {
    // GIVEN
    const payload = validPayload({ origin: 'BOGUS' });

    // WHEN
    const response = await request(app.getHttpServer())
      .post('/variants')
      .send(payload);

    // THEN
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('invalid_enum_value');
    expect(response.body.fields).toContain('origin');
  });

  // ANL-01 AC: the storage timestamp is set by the system, not taken from input.
  it('rejects an insert that supplies created_at', async () => {
    // GIVEN
    const payload = validPayload({ created_at: '2020-01-01T00:00:00.000Z' });

    // WHEN
    const response = await request(app.getHttpServer())
      .post('/variants')
      .send(payload);

    // THEN
    expect(response.status).toBe(400);
    expect(response.body.fields).toContain('created_at');
  });

  // Entity invariant: (project_id, collection, uri) is the natural key —
  // re-inserting the same triple supersedes the prior record (last write wins).
  it('deduplicates on the natural key, keeping the latest record', async () => {
    // GIVEN
    const payload = validPayload();

    // WHEN
    await request(app.getHttpServer()).post('/variants').send(payload).expect(201);
    await request(app.getHttpServer()).post('/variants').send(payload).expect(201);

    // THEN
    const result = await ch.query({
      query:
        'SELECT count() AS c FROM variants FINAL WHERE project_id = 42 AND collection = {c:String} AND uri = {u:String}',
      query_params: { c: payload.collection, u: payload.uri },
      format: 'JSONEachRow',
    });
    const [{ c }] = await result.json<{ c: string }>();
    expect(c).toBe('1');
  });

  // ANL-02 AC: filtered list returns only the matching records.
  it('lists only the variants matching a filter', async () => {
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

  // ANL-02 AC: retrieve a single variant by id.
  it('retrieves a variant by id', async () => {
    // GIVEN
    const id = await insert({ uri: 'urn:one' });

    // WHEN
    const response = await request(app.getHttpServer()).get(`/variants/${id}`);

    // THEN
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(id);
    expect(response.body.uri).toBe('urn:one');
  });

  // ANL-02 AC: retrieving an unknown id returns not-found.
  it('returns 404 for an unknown id', async () => {
    // WHEN
    const response = await request(app.getHttpServer()).get(
      '/variants/00000000-0000-0000-0000-000000000000',
    );

    // THEN
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('variant_not_found');
  });
});
