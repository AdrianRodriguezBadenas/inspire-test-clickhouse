import { ClickHouseClient, createClient } from '@clickhouse/client';
import { Provider } from '@nestjs/common';

/** DI token for the shared ClickHouse client. */
export const CLICKHOUSE_CLIENT = 'CLICKHOUSE_CLIENT';

/**
 * Provides a single ClickHouse client built from the environment. Connection
 * config only — the ClickHouse-as-primary-database decision is recorded in
 * .inspire_kb/01_adr/adr-clickhouse-primary-database.md.
 */
export const clickhouseProvider: Provider = {
  provide: CLICKHOUSE_CLIENT,
  useFactory: (): ClickHouseClient =>
    createClient({
      url: process.env.CLICKHOUSE_URL ?? 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER ?? 'default',
      password: process.env.CLICKHOUSE_PASSWORD ?? '',
      database: process.env.CLICKHOUSE_DATABASE ?? 'default',
      // Accept ISO-8601 timestamps (JS Date serialization) for DateTime columns.
      clickhouse_settings: { date_time_input_format: 'best_effort' },
    }),
};
