import { ClickHouseClient } from '@clickhouse/client';
import { Inject, Injectable } from '@nestjs/common';
import { Variant } from '../domain/variant';
import { CLICKHOUSE_CLIENT } from './clickhouse.provider';

/** Physical table backing the variant entity. */
const TABLE = 'variants';

/** Equality/range filters a list query supports (all optional). */
export interface VariantFilters {
  project_id?: number;
  collection?: string;
  uri?: string;
  created_from?: string;
  created_to?: string;
}

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

  /**
   * Read the current version of variants matching the filters — one row per natural
   * key (the greatest `version_date`) — returning at most `limit` rows from `offset`.
   */
  async queryCurrent(
    filters: VariantFilters,
    limit: number,
    offset: number,
  ): Promise<Variant[]> {
    const conditions: string[] = [];
    const params: Record<string, unknown> = { limit, offset };

    if (filters.project_id !== undefined) {
      conditions.push('project_id = {project_id:UInt64}');
      params.project_id = filters.project_id;
    }
    if (filters.collection !== undefined) {
      conditions.push('collection = {collection:String}');
      params.collection = filters.collection;
    }
    if (filters.uri !== undefined) {
      conditions.push('uri = {uri:String}');
      params.uri = filters.uri;
    }
    if (filters.created_from !== undefined) {
      conditions.push('created_at >= {created_from:DateTime64(3)}');
      params.created_from = filters.created_from;
    }
    if (filters.created_to !== undefined) {
      conditions.push('created_at <= {created_to:DateTime64(3)}');
      params.created_to = filters.created_to;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.client.query({
      query: `SELECT * FROM (
          SELECT * FROM ${TABLE}
          ${where}
          ORDER BY project_id, collection, uri, version_date DESC
          LIMIT 1 BY (project_id, collection, uri)
        )
        ORDER BY project_id, collection, uri
        LIMIT {limit:UInt32} OFFSET {offset:UInt32}`,
      query_params: params,
      format: 'JSONEachRow',
    });
    return result.json<Variant>();
  }
}
