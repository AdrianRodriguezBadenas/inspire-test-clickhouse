import request from 'supertest';
import { buildOpenApiDocument } from '../src/app.setup';
import { bootstrapVariantStore, type VariantStore } from './variant-store';

/**
 * What Swagger UI shows must be a body the API accepts.
 *
 * This file exists because it twice was not, and the second time is the instructive one:
 *
 * 1. No property declared an `example`, so the UI generated `version_date: "string"` and
 *    "Try it out" answered `400 version_date must be a Date instance`.
 * 2. Fixed by adding examples to the six REQUIRED fields — and this test, in its first
 *    version, built its body from exactly those six and passed. The UI sends **all 288**.
 *    Every nullable optional field (`number | null`) is emitted by the Nest plugin as
 *    `type: object`, which the UI renders as `{}`, so the real body carried `score: {}` and
 *    answered `400 score must be a number`. The test had been shaped by the fix instead of
 *    by the path a user actually takes.
 *
 * So it now asserts against **the example the UI displays** — the request-level example on
 * the endpoint — and separately that the schema does not mistype a scalar as an object,
 * which is the defect that produced `{}` in the first place.
 */
describe('the documented example is accepted (e2e)', () => {
  let store: VariantStore;
  let document: ReturnType<typeof buildOpenApiDocument>;

  beforeAll(async () => {
    store = await bootstrapVariantStore();
    document = buildOpenApiDocument(store.app);
  });

  afterAll(async () => {
    await store.close();
  });

  /**
   * The example as the document publishes it. Every step is optional on purpose — a path, an
   * operation, a request body or a media type can all be absent, and the assertions below are
   * what should report that, not a crash three frames deep.
   */
  interface MediaType {
    examples?: Record<string, { value?: unknown } | undefined>;
    example?: unknown;
  }

  const documentedBody = (): unknown => {
    // Navigated through a type that models absence, because TypeScript does not: an index
    // access returns the value type rather than `T | undefined` unless
    // `noUncheckedIndexedAccess` is on, so a missing path reads as present to the compiler
    // and `undefined` at runtime. Third time today that this exact optimism bit — see the
    // `getRequest()` note in request-log.interceptor.ts.
    const paths = document.paths as Record<
      string,
      { post?: { requestBody?: { content?: Record<string, MediaType | undefined> } } } | undefined
    >;
    const content = paths['/variants']?.post?.requestBody?.content?.['application/json'];

    const named = content?.examples;
    if (named !== undefined) return Object.values(named)[0]?.value;
    return content?.example;
  };

  it('publishes a request example on POST /variants', () => {
    // Without one, Swagger UI generates a body from the schema — 288 fields of type-derived
    // placeholders — which is both unusable as documentation and invalid as a request.
    expect(documentedBody()).toBeDefined();
  });

  it('is accepted by POST /variants exactly as published', async () => {
    const response = await request(store.app.getHttpServer())
      .post('/variants')
      .send(documentedBody() as object);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: expect.stringMatching(/^[0-9a-f-]{36}$/) });
  });

  it('never documents a scalar field as an object', () => {
    // `number | null` is a union the Nest Swagger plugin cannot map, so it falls back to
    // `type: object` — the schema then claims `score` is an object, and the UI offers `{}`.
    // 275 properties were wrong this way. The fix is an explicit `type` on the decorator.
    const schema = document.components?.schemas?.CreateVariantDto as {
      properties?: Record<string, { type?: string }>;
    };
    const mistyped = Object.entries(schema.properties ?? {})
      .filter(([, spec]) => spec.type === 'object')
      .map(([name]) => name);

    expect(mistyped).toEqual([]);
  });
});
