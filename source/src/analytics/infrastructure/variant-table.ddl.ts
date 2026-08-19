/**
 * The physical layout of the variant table, per
 * adr-variant-history-current-projection: a single append-only `MergeTree`, ordered by
 * the natural key with the logical version last, and deliberately **not** partitioned
 * (queries never filter by date, and partitioning would fragment a variant's versions
 * across partitions — hurting exactly the natural-key access the order exists for).
 *
 * The columns are derived from the field registry rather than written out, so the
 * table, the query allow-list and the entity spec cannot drift apart.
 */

import { VARIANT_FIELDS, VARIANT_FIELD_NAMES } from '../domain/variant-fields';

/** The table holding every version of every variant — the full audit history. */
export const VARIANT_TABLE = 'variant';

/** The dedup / lookup key, with the logical version last. */
const ORDER_BY = ['project_id', 'collection', 'uri', 'version_date'] as const;

export function variantTableDdl(table: string): string {
  const columns = VARIANT_FIELD_NAMES.map((field) => `  ${field} ${VARIANT_FIELDS[field].chType}`);

  return [
    `CREATE TABLE IF NOT EXISTS ${table}`,
    '(',
    columns.join(',\n'),
    ')',
    'ENGINE = MergeTree',
    `ORDER BY (${ORDER_BY.join(', ')})`,
  ].join('\n');
}
