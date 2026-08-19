import request from 'supertest';
import { buildOpenApiDocument } from '../src/app.setup';
import { bootstrapVariantStore, type VariantStore } from './variant-store';

/**
 * The example Swagger UI offers must be a body the API accepts.
 *
 * This exists because it did not: every one of the 288 properties lacked an `example`, so
 * Swagger UI generated placeholders from the types — `version_date: "string"` among them —
 * and "Try it out" answered `400 version_date must be a Date instance`. Documentation that
 * fails when followed is worse than none, and no test could see it: the DTO was valid, the
 * endpoint was correct, and only the generated example was wrong.
 *
 * So the assertion is deliberately indirect: it reads the **document Swagger actually
 * serves**, builds the body from that document's own examples, and posts it. Hard-coding a
 * known-good body here would test the API and leave the docs free to rot.
 */
describe('the documented example is accepted (e2e)', () => {
  let store: VariantStore;
  let body: Record<string, unknown>;

  beforeAll(async () => {
    store = await bootstrapVariantStore();

    const document = buildOpenApiDocument(store.app);
    const schema = document.components?.schemas?.CreateVariantDto as {
      required?: string[];
      properties?: Record<string, { example?: unknown }>;
    };

    body = Object.fromEntries(
      (schema.required ?? []).map((field) => [field, schema.properties?.[field]?.example]),
    );
  });

  afterAll(async () => {
    await store.close();
  });

  it('declares an example for every field it marks required', () => {
    // Without this, the body below would carry `undefined` and the POST would fail for a
    // reason that looks like a validation bug rather than a missing example.
    expect(Object.entries(body).filter(([, value]) => value === undefined)).toEqual([]);
  });

  it('is accepted by POST /variants', async () => {
    const response = await request(store.app.getHttpServer()).post('/variants').send(body);

    expect(response.status).toBe(201);
    // The whole envelope, matching what the create route actually returns — a generated id
    // and nothing else. I had guessed `created_at` was in it; it is not.
    expect(response.body).toEqual({ id: expect.stringMatching(/^[0-9a-f-]{36}$/) });
  });
});
