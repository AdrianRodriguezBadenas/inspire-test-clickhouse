import request from 'supertest';
import { bootstrapVariantStore, type VariantStore } from './variant-store';

/**
 * The unit tests hold the probe's logic; this holds that it is actually WIRED — routed,
 * its module registered, and injected with the same ClickHouse connection the product
 * uses. A probe that exists and is not reachable is worse than none: the platform would
 * read a 404 as a failing deploy for ever, or (with no healthcheck configured) go on
 * treating "the process started" as "the deploy worked".
 *
 * Only the ready path is exercised here. Reaching `503` end to end means stopping the
 * database of a running instance, and the boot hook refuses to start without it — so
 * `503` is strictly a post-boot state and it is the unit tests that pin it.
 */
describe('GET /health (e2e)', () => {
  let store: VariantStore;

  beforeAll(async () => {
    store = await bootstrapVariantStore();
  });

  afterAll(async () => {
    // `store.close()`, not `store.app.close()`. The latter shuts the app down and leaves the
    // table behind — a leak this file had, visible as a stray `variant_e2e_health` in
    // `SHOW TABLES` after a run. The harness's close is the one that drops it.
    await store.close();
  });

  it('is reachable and reports every dependency ready', async () => {
    const response = await request(store.app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', dependencies: { clickhouse: 'ok' } });
  });
});
