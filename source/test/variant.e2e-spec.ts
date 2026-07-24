import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { AppModule } from '../src/app.module';

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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await ch.close();
    await app.close();
  });

  beforeEach(async () => {
    await ch.command({ query: 'TRUNCATE TABLE variants' });
  });

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

  // ANL-01 AC: a record missing a required field is rejected.
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
});
