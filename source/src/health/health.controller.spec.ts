import { mock } from 'jest-mock-extended';
import { ServiceUnavailableException } from '@nestjs/common';
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
describe('HealthController', () => {
  it('reports ready when the store answers', async () => {
    const connection = mock<ClickHouseConnection>();
    connection.query.mockResolvedValue([{ ok: 1 }]);

    const result = await new HealthController(connection).check();

    expect(result).toEqual({ status: 'ok', dependencies: { clickhouse: 'ok' } });
  });

  it('asks the store a real question rather than assuming', async () => {
    const connection = mock<ClickHouseConnection>();
    connection.query.mockResolvedValue([{ ok: 1 }]);

    await new HealthController(connection).check();

    expect(connection.query).toHaveBeenCalledTimes(1);
    expect(connection.query).toHaveBeenCalledWith('SELECT 1 AS ok');
  });

  it('answers 503 and names the dependency when the store is unreachable', async () => {
    const connection = mock<ClickHouseConnection>();
    connection.query.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const controller = new HealthController(connection);

    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
    await expect(controller.check()).rejects.toMatchObject({
      response: { status: 'unavailable', dependencies: { clickhouse: 'unavailable' } },
    });
  });

  it('leaks nothing about the failure into the body', async () => {
    const connection = mock<ClickHouseConnection>();
    connection.query.mockRejectedValue(new Error('connect ECONNREFUSED 10.1.2.3:8123'));

    let thrown: unknown;
    try {
      await new HealthController(connection).check();
    } catch (error) {
      thrown = error;
    }

    expect(JSON.stringify(thrown)).not.toContain('10.1.2.3');
    expect(JSON.stringify(thrown)).not.toContain('ECONNREFUSED');
  });
});
