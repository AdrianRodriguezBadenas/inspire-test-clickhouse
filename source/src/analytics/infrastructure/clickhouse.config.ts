/**
 * Where the store is and which table holds the variants.
 *
 * The table is configurable so a test run can point at its own table instead of the
 * one local development uses — the isolation gap TASK-z5vrnx tracks. It is read from
 * the environment in exactly one place so no other layer grows an opinion about it.
 */

import { VARIANT_TABLE } from './variant-table.ddl';

export interface ClickHouseConfig {
  url: string;
  database: string;
  username: string;
  password: string;
  /** The table variants are written to and read from. */
  table: string;
}

export function clickHouseConfig(env: NodeJS.ProcessEnv = process.env): ClickHouseConfig {
  return {
    url: env.CLICKHOUSE_URL ?? 'http://localhost:8123',
    database: env.CLICKHOUSE_DATABASE ?? 'default',
    username: env.CLICKHOUSE_USER ?? 'default',
    password: env.CLICKHOUSE_PASSWORD ?? '',
    table: env.CLICKHOUSE_VARIANT_TABLE ?? VARIANT_TABLE,
  };
}
