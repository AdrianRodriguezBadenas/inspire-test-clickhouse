/**
 * The e2e harness: a real application against a real ClickHouse.
 *
 * It runs against **its own table**, never the one local development uses. The e2e
 * suite truncates between tests, and TASK-z5vrnx exists because that destructive
 * operation used to reach the dev data through the same connection settings. The guard
 * in `bootstrapVariantStore` is what makes that mistake loud instead of silent — it is
 * a safety net, not a substitute for the isolated environment that ticket asks for.
 */

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { VariantRepository } from '../src/analytics/infrastructure/variant.repository';
import { ClickHouseConnection } from '../src/analytics/infrastructure/clickhouse.provider';
import { VARIANT_TABLE } from '../src/analytics/infrastructure/variant-table.ddl';
import { VariantOrigin, VariantType } from '../src/analytics/domain/variant';

/** The table this suite owns. Set before the application reads its configuration. */
export const E2E_TABLE = 'variant_e2e';

export interface VariantStore {
  app: INestApplication;
  connection: ClickHouseConnection;
  /** Remove every row from the e2e table. */
  clear(): Promise<void>;
  /** How many rows the table holds — history included. */
  countRows(): Promise<number>;
  close(): Promise<void>;
}

export async function bootstrapVariantStore(): Promise<VariantStore> {
  process.env.CLICKHOUSE_VARIANT_TABLE = E2E_TABLE;

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();

  const connection = app.get(ClickHouseConnection);
  if (connection.config.table === VARIANT_TABLE) {
    throw new Error(
      `Refusing to run destructive tests against the ${VARIANT_TABLE} table. ` +
        'Expected the suite to own its own table.',
    );
  }

  const repository = app.get(VariantRepository);
  await repository.ensureTable();

  const clear = async (): Promise<void> => {
    await connection.command(`TRUNCATE TABLE ${connection.config.table}`);
  };

  const countRows = async (): Promise<number> => {
    const rows = await connection.query<{ rows: number }>(
      `SELECT count() AS rows FROM ${connection.config.table}`,
    );

    return Number(rows[0]?.rows ?? 0);
  };

  await clear();

  return {
    app,
    connection,
    clear,
    countRows,
    close: async () => {
      await connection.command(`DROP TABLE IF EXISTS ${connection.config.table}`);
      await app.close();
    },
  };
}

/** A submitted record carrying only what ANL-01 requires. */
export const aVariantBody = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  project_id: 42,
  collection: 'study-1',
  uri: 'chr1:12345:A:T',
  origin: VariantOrigin.GERMLINE,
  type: VariantType.SNV_INDEL,
  version_date: '2026-07-01T00:00:00.000Z',
  ...overrides,
});
