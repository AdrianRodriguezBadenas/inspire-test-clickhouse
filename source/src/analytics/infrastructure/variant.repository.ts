/**
 * Data access for variants. Assumes valid input — validation happened in the domain,
 * before anything reached here.
 */

import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ClickHouseConnection } from './clickhouse.provider';
import { formatClickHouseDateTime, parseClickHouseDateTime } from './clickhouse-datetime';
import { translateVariantQuery } from './variant-query.translator';
import { variantTableDdl } from './variant-table.ddl';
import { isVariantField } from '../domain/variant-fields';
import type { Variant } from '../domain/variant';
import type { ValidatedQuery } from '../domain/variant-query.validation';

/**
 * A row as the store returns it: the timestamp columns arrive as ClickHouse literals,
 * every other column as the JSON type the domain already declares.
 */
type VariantRow = Omit<Variant, 'created_at' | 'version_date'> & {
  created_at: string;
  version_date: string;
};

@Injectable()
export class VariantRepository implements OnModuleInit {
  constructor(private readonly connection: ClickHouseConnection) {}

  /**
   * Create the schema as part of coming up.
   *
   * `ensureTable` existed before this hook did, and only the e2e harness called it — so a
   * deployed instance started cleanly and answered every request with 500 ("Unknown table
   * expression identifier 'variant'") while the platform reported a successful deploy,
   * because the process was alive. The DDL is `CREATE TABLE IF NOT EXISTS`, so running it
   * on every boot is idempotent.
   *
   * Throwing here is deliberate: a boot that cannot reach the store **must fail** rather
   * than serve a broken instance. Two consequences worth knowing — the store has to be up
   * before the app (deploy order matters), and with several instances they would race on
   * the DDL, which `IF NOT EXISTS` makes harmless but which is the point at which this
   * belongs in a pre-deploy step instead.
   */
  async onModuleInit(): Promise<void> {
    await this.ensureTable();
  }

  private get table(): string {
    return this.connection.config.table;
  }

  /** Create the variant table if it does not exist yet. */
  async ensureTable(): Promise<void> {
    await this.connection.command(variantTableDdl(this.table));
  }

  /**
   * Append one variant.
   *
   * Append-only by construction: there is no update path, so a record with a lower
   * `version_date` than an existing one simply never becomes the current version.
   */
  async insert(variant: Variant): Promise<void> {
    await this.connection.insert(this.table, [toRow(variant)]);
  }

  /**
   * Read the current variants matching a validated query.
   *
   * Returns up to `limit + 1` rows: the translator asks for one row beyond the page so
   * the caller can tell whether a further page exists without counting.
   */
  async findCurrent(query: ValidatedQuery): Promise<Variant[]> {
    const { sql, params } = translateVariantQuery(query, this.table);
    const rows = await this.connection.query<VariantRow>(sql, params);

    return rows.map(toDomain);
  }
}

/**
 * Map a variant onto the columns of the table.
 *
 * Anything that is not a registered field is dropped rather than written: the record
 * may have travelled through a JSON boundary, and only the registry decides what a
 * column is.
 */
function toRow(variant: Variant): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  for (const [field, value] of Object.entries(variant)) {
    if (value === undefined || !isVariantField(field)) continue;

    row[field] = value instanceof Date ? formatClickHouseDateTime(value) : value;
  }

  return row;
}

/**
 * Map a stored row back onto the domain entity.
 *
 * The row is JSON the driver parsed, so its shape is asserted rather than proven: the
 * table was created from the same registry the entity is generated from, which is what
 * makes the two agree. Only the timestamp columns need converting — every other column
 * arrives as the JSON type the domain declares.
 */
function toDomain(row: VariantRow): Variant {
  return {
    ...row,
    created_at: parseClickHouseDateTime(row.created_at),
    version_date: parseClickHouseDateTime(row.version_date),
  };
}
