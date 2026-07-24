import { VARIANT_FIELD_TYPES } from '../domain/variant-fields';
import {
  Condition,
  OrderBy,
  QUERY_OPERATORS,
  QueryOperator,
  QueryValidationError,
} from '../domain/variant-query';

export interface TranslatedQuery {
  sql: string;
  params: Record<string, unknown>;
}

const OPERATORS = new Set<string>(QUERY_OPERATORS);
const COMPARISON: ReadonlySet<QueryOperator> = new Set([
  'lt',
  'lte',
  'gt',
  'gte',
  'between',
]);
const SQL_COMPARATOR: Record<string, string> = {
  lt: '<',
  lte: '<=',
  gt: '>',
  gte: '>=',
};

function fieldType(field: string): string {
  const type = VARIANT_FIELD_TYPES[field];
  if (type === undefined) {
    throw new QueryValidationError(
      'unknown_query_field',
      `Unknown query field: ${field}.`,
    );
  }
  return type;
}

function isArray(type: string): boolean {
  return type.startsWith('Array(');
}

function elementType(type: string): string {
  return type.slice('Array('.length, -1);
}

class ParamBag {
  private n = 0;
  readonly params: Record<string, unknown> = {};

  bind(type: string, value: unknown): string {
    const name = `p${this.n++}`;
    this.params[name] = value;
    return `{${name}:${type}}`;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function translateLeaf(field: string, op: QueryOperator, value: unknown, bag: ParamBag): string {
  const type = fieldType(field);
  const column = `\`${field}\``;
  const array = isArray(type);
  const scalarType = array ? elementType(type) : type;

  if (array && COMPARISON.has(op)) {
    throw new QueryValidationError(
      'invalid_query',
      `Operator ${op} is not supported on the array field ${field}.`,
    );
  }
  if ((op === 'like' || op === 'ilike') && scalarType !== 'String') {
    throw new QueryValidationError(
      'invalid_query',
      `Operator ${op} is only supported on string fields, not ${field}.`,
    );
  }

  switch (op) {
    case 'is_null':
      return `${column} IS NULL`;
    case 'is_not_null':
      return `${column} IS NOT NULL`;
    case 'eq':
      return array
        ? `has(${column}, ${bag.bind(scalarType, value)})`
        : `${column} = ${bag.bind(scalarType, value)}`;
    case 'ne':
      return array
        ? `NOT has(${column}, ${bag.bind(scalarType, value)})`
        : `${column} != ${bag.bind(scalarType, value)}`;
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte':
      return `${column} ${SQL_COMPARATOR[op]} ${bag.bind(scalarType, value)}`;
    case 'like':
      return `${column} LIKE ${bag.bind('String', value)}`;
    case 'ilike':
      return `${column} ILIKE ${bag.bind('String', value)}`;
    case 'in':
    case 'nin': {
      if (!Array.isArray(value)) {
        throw new QueryValidationError(
          'invalid_query',
          `Operator ${op} requires an array value for ${field}.`,
        );
      }
      const placeholder = bag.bind(`Array(${scalarType})`, value);
      return op === 'in'
        ? `${column} IN ${placeholder}`
        : `${column} NOT IN ${placeholder}`;
    }
    case 'between': {
      if (!Array.isArray(value) || value.length !== 2) {
        throw new QueryValidationError(
          'invalid_query',
          `Operator between requires a two-element array value for ${field}.`,
        );
      }
      const lo = bag.bind(scalarType, value[0]);
      const hi = bag.bind(scalarType, value[1]);
      return `${column} BETWEEN ${lo} AND ${hi}`;
    }
    default:
      throw new QueryValidationError(
        'unknown_query_operator',
        `Unsupported operator: ${String(op)}.`,
      );
  }
}

function translateCondition(cond: Condition, bag: ParamBag): string {
  if (!isRecord(cond)) {
    throw new QueryValidationError('invalid_query', 'Malformed condition.');
  }

  if ('and' in cond || 'or' in cond) {
    const key = 'and' in cond ? 'and' : 'or';
    const children = (cond as Record<string, unknown>)[key];
    if (!Array.isArray(children) || children.length === 0) {
      throw new QueryValidationError(
        'invalid_query',
        `"${key}" must be a non-empty array of conditions.`,
      );
    }
    const joiner = key === 'and' ? ' AND ' : ' OR ';
    return `(${children
      .map((child) => translateCondition(child as Condition, bag))
      .join(joiner)})`;
  }

  if ('not' in cond) {
    return `(NOT ${translateCondition((cond as NotShape).not, bag)})`;
  }

  const leaf = cond as { field?: unknown; op?: unknown; value?: unknown };
  if (typeof leaf.field !== 'string' || typeof leaf.op !== 'string') {
    throw new QueryValidationError(
      'invalid_query',
      'A condition leaf needs a string field and op.',
    );
  }
  if (!OPERATORS.has(leaf.op)) {
    throw new QueryValidationError(
      'unknown_query_operator',
      `Unsupported operator: ${leaf.op}.`,
    );
  }
  return translateLeaf(leaf.field, leaf.op as QueryOperator, leaf.value, bag);
}

interface NotShape {
  not: Condition;
}

/** Translate an optional condition tree to a parameterized WHERE fragment. */
export function translateWhere(where: Condition | undefined): TranslatedQuery {
  if (where === undefined) {
    return { sql: '', params: {} };
  }
  const bag = new ParamBag();
  const sql = translateCondition(where, bag);
  return { sql, params: bag.params };
}

/** Translate an optional order-by list to a safe ORDER BY fragment (validated fields). */
export function translateOrderBy(orderBy: OrderBy[] | undefined): string {
  if (!orderBy || orderBy.length === 0) {
    return '';
  }
  return orderBy
    .map((entry) => {
      fieldType(entry.field); // validates the field is known
      if (entry.dir !== 'asc' && entry.dir !== 'desc') {
        throw new QueryValidationError(
          'invalid_query',
          `Invalid sort direction: ${String(entry.dir)}.`,
        );
      }
      return `\`${entry.field}\` ${entry.dir.toUpperCase()}`;
    })
    .join(', ');
}
