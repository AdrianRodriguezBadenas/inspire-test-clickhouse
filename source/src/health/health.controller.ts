/**
 * Readiness probe.
 *
 * Deliberately a **readiness** check and not a liveness one: it asks ClickHouse a real
 * question. A probe that only proves the process is alive is what let this service report a
 * successful deploy while answering every request with a 500 — the schema did not exist and
 * nothing had noticed. An orchestrator that trusts such a probe routes traffic to an
 * instance that cannot serve.
 *
 * `503` is the resolved `rest` convention's readiness row, and it is distinct from the
 * `502`/`504` a failed request gets: `502` says "your request failed downstream", `503` says
 * "do not send me requests yet". The caller is a platform, and it acts on the difference.
 */

import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClickHouseConnection } from '../analytics/infrastructure/clickhouse.provider';

/** The cheapest question that still proves the connection round-trips. */
const PROBE_QUERY = 'SELECT 1 AS ok';

type DependencyState = 'ok' | 'unavailable';

interface HealthReport {
  status: 'ok' | 'unavailable';
  dependencies: Record<string, DependencyState>;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly connection: ClickHouseConnection) {}

  /**
   * Sets the status on the response rather than throwing.
   *
   * Throwing a `ServiceUnavailableException` looked right and was not: `AppExceptionFilter`
   * catches everything and rewrites it into the one domain-error shape, so the report was
   * flattened to `{code:'service_unavailable', message:'Service Unavailable Exception'}` —
   * losing the only part that matters, WHICH dependency is down. That is exactly what the
   * convention's readiness row requires the body to carry.
   *
   * It survived four unit tests because they exercised the controller in isolation, never
   * through the filter, and survived the e2e because reaching `503` needs a dead store. A
   * live probe against a stopped database is what found it.
   */
  @Get()
  @ApiOperation({ summary: 'Readiness probe — reports whether the service can serve' })
  @ApiResponse({ status: 200, description: 'Ready: every dependency answered.' })
  @ApiResponse({ status: 503, description: 'Not ready: a dependency did not answer.' })
  async check(
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<HealthReport> {
    let clickhouse: DependencyState = 'ok';

    try {
      await this.connection.query(PROBE_QUERY);
    } catch {
      // The cause is deliberately dropped rather than reported. A probe is reachable by
      // anyone who can reach the service, so its body must not describe the internals —
      // no host, no port, no driver message. The detail belongs in the logs.
      clickhouse = 'unavailable';
    }

    const report: HealthReport = {
      status: clickhouse === 'ok' ? 'ok' : 'unavailable',
      dependencies: { clickhouse },
    };

    response.status(report.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return report;
  }
}
