/**
 * The ClickHouse connection — the only place the driver is touched.
 *
 * It is a concrete class rather than a client instance behind an injection token, so
 * dependants inject a type the container can resolve on its own.
 */

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { createClient, type ClickHouseClient } from '@clickhouse/client';
import { clickHouseConfig, type ClickHouseConfig } from './clickhouse.config';

@Injectable()
export class ClickHouseConnection implements OnApplicationShutdown {
  private readonly client: ClickHouseClient;
  readonly config: ClickHouseConfig;

  constructor() {
    // Read from the environment rather than injected: the configuration is a plain
    // shape, and an interface is not something the container can resolve.
    const config = clickHouseConfig();
    this.config = config;
    this.client = createClient({
      url: config.url,
      database: config.database,
      username: config.username,
      password: config.password,
      clickhouse_settings: {
        // The entity spec declares the timestamp columns without a timezone, so the
        // session decides how they are read. Pinning it to UTC makes "which version is
        // current" independent of the server's and the caller's local time.
        session_timezone: 'UTC',
        // UInt64 columns (project_id, user_id) would otherwise arrive as strings,
        // because JSON cannot express the full range. The values this product stores
        // are project and user ids, well inside what a number holds exactly.
        output_format_json_quote_64bit_integers: 0,
      },
    });
  }

  /** Run a read and return its rows. */
  async query<T>(sql: string, params: Record<string, unknown> = {}): Promise<T[]> {
    const result = await this.client.query({
      query: sql,
      query_params: params,
      format: 'JSONEachRow',
    });

    return result.json<T>();
  }

  /** Append rows to a table. */
  async insert(table: string, rows: Record<string, unknown>[]): Promise<void> {
    await this.client.insert({ table, values: rows, format: 'JSONEachRow' });
  }

  /** Run a statement that returns no rows (DDL). */
  async command(sql: string): Promise<void> {
    await this.client.command({ query: sql });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.close();
  }
}
