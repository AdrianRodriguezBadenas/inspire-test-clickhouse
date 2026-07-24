import { ClickHouseClient } from '@clickhouse/client';
import { Inject, Injectable } from '@nestjs/common';
import { Variant } from '../domain/variant';
import { Condition, OrderBy } from '../domain/variant-query';
import { CLICKHOUSE_CLIENT } from './clickhouse.provider';
import {
  translateOrderBy,
  translateWhere,
} from './variant-query.translator';

/** Physical table backing the variant entity (append-only history). */
const TABLE = 'variants';

/**
 * Data access for stored variants. Assumes valid input — validation lives in the
 * DTO / translator, never here. Append-only: {@link insert} adds a row and never
 * mutates one in place.
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

  /**
   * Query the current variants (one per natural key — the greatest `version_date`)
   * matching the structured `where`, ordered, returning at most `limit` rows from
   * `offset`. The client conditions apply to the current set (dedup first, then
   * filter), so a stale version can never surface.
   */
  async queryCurrent(
    where: Condition | undefined,
    orderBy: OrderBy[] | undefined,
    limit: number,
    offset: number,
  ): Promise<Variant[]> {
    const { sql: whereSql, params } = translateWhere(where);
    const orderSql = translateOrderBy(orderBy);

    const whereClause = whereSql ? `WHERE ${whereSql}` : '';
    const outerOrder = orderSql || 'project_id, collection, uri';

    const query = `SELECT * FROM (
        SELECT * FROM ${TABLE}
        ORDER BY project_id, collection, uri, version_date DESC
        LIMIT 1 BY (project_id, collection, uri)
      ) AS current
      ${whereClause}
      ORDER BY ${outerOrder}
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}`;

    const result = await this.client.query({
      query,
      query_params: { ...params, limit, offset },
      format: 'JSONEachRow',
    });
    return result.json<Variant>();
  }
}
