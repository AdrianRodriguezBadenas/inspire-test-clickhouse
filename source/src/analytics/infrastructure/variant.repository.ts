import { ClickHouseClient } from '@clickhouse/client';
import { Inject, Injectable } from '@nestjs/common';
import { Variant } from '../domain/variant';
import { CLICKHOUSE_CLIENT } from './clickhouse.provider';

/** Physical table backing the variant entity. */
const TABLE = 'variants';

/**
 * Data access for stored variants. Assumes valid input — validation lives in the
 * DTO / service, never here. Append-only: {@link insert} adds a row and never
 * mutates one in place, per the entity's storage model.
 */
@Injectable()
export class VariantRepository {
  constructor(
    @Inject(CLICKHOUSE_CLIENT) private readonly client: ClickHouseClient,
  ) {}

  async insert(variant: Variant): Promise<void> {
    await this.client.insert({
      table: TABLE,
      values: [variant],
      format: 'JSONEachRow',
    });
  }
}
