/**
 * Translation of a validated condition tree into parameterized ClickHouse SQL.
 *
 * This is the only place that knows the query engine — the domain contract stays
 * storage-agnostic (adr-variant-structured-query). Two rules hold without exception:
 *
 * - **Values are never concatenated.** Every value becomes a bound `{pN:Type}`
 *   parameter typed from the field registry.
 * - **Identifiers are never client text.** A field name reaches here only after the
 *   domain validated it against the registry, so the allow-list — not escaping — is
 *   what makes interpolating it safe.
 */

import { formatClickHouseDateTime } from './clickhouse-datetime';
import { VariantOperator, SortDirection } from '../domain/variant-query';
import { variantFieldSpec, type VariantFieldName } from '../domain/variant-fields';
import type { ValidatedCondition, ValidatedQuery } from '../domain/variant-query.validation';

/** A statement plus the parameters bound into it. */
export interface TranslatedQuery {
  sql: string;
  params: Record<string, unknown>;
}

/**
 * The natural key. It is both the `LIMIT 1 BY` dedup key and the ordering tie-break
 * that makes paging deterministic.
 */
const NATURAL_KEY: readonly VariantFieldName[] = ['project_id', 'collection', 'uri'];

/**
 * Build the current-variants query.
 *
 * Shape, and why:
 *
 * ```sql
 * SELECT * FROM (
 *   SELECT * FROM variant [WHERE <pushed natural-key conditions>]
 *   ORDER BY version_date DESC LIMIT 1 BY project_id, collection, uri   -- current only
 * )
 * [WHERE <all client conditions>]
 * ORDER BY <client ordering>, project_id ASC, collection ASC, uri ASC
 * LIMIT <limit + 1> OFFSET <offset>
 * ```
 *
 * The client's conditions are applied **outside** the dedup on purpose: filtering
 * first could surface a superseded row whose current version does not match, and
 * ANL-02 requires that only current versions are ever returned.
 *
 * One extra row is requested beyond the page size — its presence is how the caller
 * learns another page exists, without a second counting query.
 */
export function translateVariantQuery(query: ValidatedQuery, table: string): TranslatedQuery {
  const binder = new ParameterBinder();
  const rendered = new Map<ValidatedCondition, string>();

  const outerWhere = query.where === null ? null : renderCondition(query.where, binder, rendered);
  const innerWhere = renderPushdown(query.where, rendered);

  const inner = [
    `SELECT * FROM ${table}`,
    innerWhere === null ? null : `WHERE ${innerWhere}`,
    `ORDER BY version_date DESC`,
    `LIMIT 1 BY ${NATURAL_KEY.join(', ')}`,
  ].filter(isPresent);

  const sql = [
    `SELECT * FROM (`,
    ...inner.map((line) => `  ${line}`),
    `)`,
    outerWhere === null ? null : `WHERE ${outerWhere}`,
    `ORDER BY ${renderOrderBy(query.order_by)}`,
    `LIMIT ${query.limit + 1} OFFSET ${query.offset}`,
  ]
    .filter(isPresent)
    .join('\n');

  return { sql, params: binder.params };
}

/**
 * The conditions that may also run *inside* the dedup, to prune the scan.
 *
 * Only conditions on the natural key qualify, and only from a purely conjunctive top
 * level. Those columns are the `LIMIT 1 BY` key, so restricting them cannot change
 * which version of a surviving key is the current one — the filter and the dedup
 * commute. A branch of an `or`/`not` carries no such guarantee, so nothing is pushed
 * from one.
 *
 * This matters for more than latency: `project_id` is the one filter
 * adr-variant-history-current-projection guarantees on every query, and the whole
 * `ORDER BY (project_id, collection, uri, version_date)` layout exists so it prunes.
 * Without the push-down, the dedup would read the table before the filter narrowed it.
 */
function renderPushdown(
  where: ValidatedCondition | null,
  rendered: Map<ValidatedCondition, string>,
): string | null {
  if (where === null) return null;

  const branches = where.kind === 'and' ? where.children : [where];
  const pushable = branches.filter(
    (branch) => branch.kind === 'leaf' && NATURAL_KEY.includes(branch.field),
  );

  if (pushable.length === 0) return null;
  if (pushable.length === 1) return rendered.get(pushable[0]) ?? null;

  return pushable.map((branch) => `(${rendered.get(branch) ?? ''})`).join(' AND ');
}

function renderCondition(
  node: ValidatedCondition,
  binder: ParameterBinder,
  rendered: Map<ValidatedCondition, string>,
): string {
  const sql = renderNode(node, binder, rendered);
  rendered.set(node, sql);

  return sql;
}

function renderNode(
  node: ValidatedCondition,
  binder: ParameterBinder,
  rendered: Map<ValidatedCondition, string>,
): string {
  switch (node.kind) {
    case 'and':
    case 'or': {
      const operator = node.kind === 'and' ? 'AND' : 'OR';
      return node.children
        .map((child) => `(${renderCondition(child, binder, rendered)})`)
        .join(` ${operator} `);
    }
    case 'not':
      return `NOT (${renderCondition(node.child, binder, rendered)})`;
    case 'leaf':
      return renderLeaf(node.field, node.op, node.value, binder);
  }
}

function renderLeaf(
  field: VariantFieldName,
  op: VariantOperator,
  value: unknown,
  binder: ParameterBinder,
): string {
  const spec = variantFieldSpec(field);
  const bind = (raw: unknown, type = spec.bindType): string => binder.bind(coerce(raw), type);

  if (spec.array === true) return renderArrayLeaf(field, op, value, bind, spec.bindType);

  switch (op) {
    case VariantOperator.EQ:
      return `${field} = ${bind(value)}`;
    case VariantOperator.NE:
      return `${field} != ${bind(value)}`;
    case VariantOperator.LT:
      return `${field} < ${bind(value)}`;
    case VariantOperator.LTE:
      return `${field} <= ${bind(value)}`;
    case VariantOperator.GT:
      return `${field} > ${bind(value)}`;
    case VariantOperator.GTE:
      return `${field} >= ${bind(value)}`;
    case VariantOperator.IN:
      return `${field} IN ${bind(value, `Array(${spec.bindType})`)}`;
    case VariantOperator.NIN:
      return `${field} NOT IN ${bind(value, `Array(${spec.bindType})`)}`;
    case VariantOperator.LIKE:
      return `${field} LIKE ${bind(value, 'String')}`;
    case VariantOperator.ILIKE:
      return `${field} ILIKE ${bind(value, 'String')}`;
    case VariantOperator.BETWEEN: {
      const [low, high] = value as [unknown, unknown];
      return `${field} BETWEEN ${bind(low)} AND ${bind(high)}`;
    }
    case VariantOperator.IS_NULL:
      return `${field} IS NULL`;
    case VariantOperator.IS_NOT_NULL:
      return `${field} IS NOT NULL`;
  }
}

/**
 * Array columns compare by membership, not equality — `hpo = 'HP:0001250'` would ask
 * whether the whole array equals one code. The domain restricts array fields to the
 * operators handled here (see `validateVariantQuery`).
 */
function renderArrayLeaf(
  field: VariantFieldName,
  op: VariantOperator,
  value: unknown,
  bind: (raw: unknown, type?: string) => string,
  elementType: string,
): string {
  switch (op) {
    case VariantOperator.EQ:
      return `has(${field}, ${bind(value)})`;
    case VariantOperator.NE:
      return `NOT has(${field}, ${bind(value)})`;
    case VariantOperator.IN:
      return `hasAny(${field}, ${bind(value, `Array(${elementType})`)})`;
    case VariantOperator.NIN:
      return `NOT hasAny(${field}, ${bind(value, `Array(${elementType})`)})`;
    default:
      // Unreachable: the domain rejects every other operator on an array field.
      throw new Error(`Operator ${op} cannot be translated for the array field ${field}.`);
  }
}

function renderOrderBy(order: ValidatedQuery['order_by']): string {
  const terms = order.map((term) => `${term.field} ${term.dir === SortDirection.DESC ? 'DESC' : 'ASC'}`);

  // The natural key always closes the ordering: without a total order, two pages of
  // the same query could repeat or skip a row — ANL-02 requires equivalent paging on
  // every access route.
  for (const field of NATURAL_KEY) {
    if (!order.some((term) => term.field === field)) terms.push(`${field} ASC`);
  }

  return terms.join(', ');
}

/** Values ClickHouse cannot bind as-is become the literal it understands. */
function coerce(value: unknown): unknown {
  if (value instanceof Date) return formatClickHouseDateTime(value);
  if (Array.isArray(value)) return value.map(coerce);

  return value;
}

class ParameterBinder {
  readonly params: Record<string, unknown> = {};
  private next = 0;

  /** Bind a value and return its `{name:Type}` placeholder. */
  bind(value: unknown, type: string): string {
    const name = `p${this.next}`;
    this.next += 1;
    this.params[name] = value;

    return `{${name}:${type}}`;
  }
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}
