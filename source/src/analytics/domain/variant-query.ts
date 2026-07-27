// Structured query AST for variant reads (analytics::variant::query).
// See .inspire_kb/01_adr/adr-variant-structured-query.md. Pure types; no engine
// details — the translation to ClickHouse lives in the infrastructure layer.

export type QueryOperator =
  | 'eq'
  | 'ne'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'in'
  | 'nin'
  | 'like'
  | 'ilike'
  | 'between'
  | 'is_null'
  | 'is_not_null';

export const QUERY_OPERATORS: readonly QueryOperator[] = [
  'eq',
  'ne',
  'lt',
  'lte',
  'gt',
  'gte',
  'in',
  'nin',
  'like',
  'ilike',
  'between',
  'is_null',
  'is_not_null',
];

export interface LeafCondition {
  field: string;
  op: QueryOperator;
  value?: unknown;
}

export interface AndCondition {
  and: Condition[];
}

export interface OrCondition {
  or: Condition[];
}

export interface NotCondition {
  not: Condition;
}

export type Condition =
  | LeafCondition
  | AndCondition
  | OrCondition
  | NotCondition;

export interface OrderBy {
  field: string;
  dir: 'asc' | 'desc';
}

export interface VariantQuery {
  where?: Condition;
  order_by?: OrderBy[];
  limit?: number;
  cursor?: string;
}

export type QueryErrorCode =
  | 'unknown_query_field'
  | 'unknown_query_operator'
  | 'invalid_query'
  | 'query_too_complex';

/**
 * A client-facing query-validation failure. Thrown by the translator; the HTTP
 * filter maps it to a 400 carrying `code`.
 */
export class QueryValidationError extends Error {
  constructor(
    readonly code: QueryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'QueryValidationError';
  }
}
