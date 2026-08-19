import { mock } from 'jest-mock-extended';
import { HealthController } from './health.controller';
import type { ClickHouseConnection } from '../analytics/infrastructure/clickhouse.provider';

/**
 * A readiness probe, not a liveness one: it asks the store a real question, because a
 * probe that only proves the process is alive is what let a deploy report success on a
 * service that answered every request with a 500.
 *
 * `503` comes from the resolved `rest` surface convention's readiness row — deliberately
 * distinct from the `502`/`504` a failed *request* gets. The caller here is an
 * orchestrator, and it acts on that difference.
 */
/** Captures the status the controller sets, so the tests can assert it. */
const capturingResponse = (): { status: (c: number) => unknown; code: () => number | undefined } => {
  const seen: number[] = [];
  return { status: (c: number) => seen.push(c), code: () => seen[0] };
};

describe('HealthController', () => {
  it('reports ready when the store answers', async () => {
    const connection = mock<ClickHouseConnection>();
    connection.query.mockResolvedValue([{ ok: 1 }]);

    const res = capturingResponse();

    const result = await new HealthController(connection).check(res);

    expect(res.code()).toBe(200);
    expect(result).toEqual({ status: 'ok', dependencies: { clickhouse: 'ok' } });
  });

  it('asks the store a real question rather than assuming', async () => {
    const connection = mock<ClickHouseConnection>();
    connection.query.mockResolvedValue([{ ok: 1 }]);

    await new HealthController(connection).check(capturingResponse());

    expect(connection.query).toHaveBeenCalledTimes(1);
    expect(connection.query).toHaveBeenCalledWith('SELECT 1 AS ok');
  });

  it('answers 503 and names the dependency when the store is unreachable', async () => {
    const connection = mock<ClickHouseConnection>();
    connection.query.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const res = capturingResponse();

    const result = await new HealthController(connection).check(res);

    expect(res.code()).toBe(503);
    // Naming the dependency IS the contract — the convention's readiness row requires it,
    // and the first version lost it by throwing through the domain-error filter.
    expect(result).toEqual({ status: 'unavailable', dependencies: { clickhouse: 'unavailable' } });
  });

  it('leaks nothing about the failure into the body', async () => {
    const connection = mock<ClickHouseConnection>();
    connection.query.mockRejectedValue(new Error('connect ECONNREFUSED 10.1.2.3:8123'));

    const result = await new HealthController(connection).check(capturingResponse());

    expect(JSON.stringify(result)).not.toContain('10.1.2.3');
    expect(JSON.stringify(result)).not.toContain('ECONNREFUSED');
  });
});
