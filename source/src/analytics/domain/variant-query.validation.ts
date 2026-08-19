/**
 * Validation of a client-supplied structured query — the security boundary of the
 * read path (adr-variant-structured-query: "a field allow-list and operator whitelist
 * are the security boundary; both are validated before any query is built").
 *
 * It runs once, in the domain, for every access route: REST and GraphQL are thin
 * adapters over the same service, so a condition rejected on one is rejected
 * identically on the other (an ANL-02 parity criterion).
 *
 * The output is a **narrowed** tree. Everything downstream — the ClickHouse
 * translator in particular — consumes only validated input and never re-checks it.
 */

import { decodeCursor } from './variant-cursor';
import {
  invalidQueryCondition,
  unknownQueryField,
  unknownQueryOperator,
} from './variant-errors';
import { isVariantField, variantFieldSpec, type VariantFieldName } from './variant-fields';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  SortDirection,
  VariantOperator,
  type VariantCondition,
  type VariantOrder,
  type VariantQuery,
} from './variant-query';
import { assertConditionWithinLimits } from './variant-query.limits';

/** A validated condition tree: every field is known and every operator allowed. */
export type ValidatedCondition =
  | { kind: 'and'; children: ValidatedCondition[] }
  | { kind: 'or'; children: ValidatedCondition[] }
  | { kind: 'not'; child: ValidatedCondition }
  | { kind: 'leaf'; field: VariantFieldName; op: VariantOperator; value: unknown };

/** A validated ordering term. */
export interface ValidatedOrder {
  field: VariantFieldName;
  dir: SortDirection;
}

/** A query that has passed every domain rule and is safe to translate. */
export interface ValidatedQuery {
  where: ValidatedCondition | null;
  order_by: ValidatedOrder[];
  limit: number;
  offset: number;
}

const OPERATORS = new Set<string>(Object.values(VariantOperator));

/** Operators taking a list of values. */
const LIST_OPERATORS = new Set<VariantOperator>([VariantOperator.IN, VariantOperator.NIN]);

/** Operators taking no value at all. */
const NULLARY_OPERATORS = new Set<VariantOperator>([
  VariantOperator.IS_NULL,
  VariantOperator.IS_NOT_NULL,
]);

/** Operators taking a string pattern. */
const PATTERN_OPERATORS = new Set<VariantOperator>([VariantOperator.LIKE, VariantOperator.ILIKE]);

/**
 * The operators a list-valued field accepts. A list column compares by membership, so
 * ordering, pattern and null-check operators have no meaning on one — rejecting them
 * here is what lets the translator handle every case it is given.
 */
const LIST_FIELD_OPERATORS = new Set<VariantOperator>([
  VariantOperator.EQ,
  VariantOperator.NE,
  VariantOperator.IN,
  VariantOperator.NIN,
]);

/**
 * Validate a structured query and narrow it.
 *
 * Order matters: the size bounds come first, so an oversized tree is refused before
 * any per-node work — ANL-02 requires rejection "before any data is read".
 */
export function validateVariantQuery(query: VariantQuery): ValidatedQuery {
  assertConditionWithinLimits(query.where);

  return {
    where: isPresent(query.where) ? validateCondition(query.where) : null,
    order_by: validateOrderBy(query.order_by),
    limit: validateLimit(query.limit),
    offset: validateCursor(query.cursor),
  };
}

function validateCondition(node: VariantCondition): ValidatedCondition {
  // Discriminate on which key carries a defined value: a GraphQL input node
  // materializes every key of the recursive input type, most of them null.
  // `branches` is typed `unknown` on purpose. `VariantCondition` declares `and`/`or` as
  // arrays, but this function is what validates a client-supplied tree — that declaration
  // is a promise about the input, not a proof of it. Carrying the real (unvalidated)
  // knowledge here keeps the Array.isArray guard below meaningful instead of dead code.
  const combinators: { kind: 'and' | 'or'; branches: unknown }[] = [
    { kind: 'and' as const, branches: node.and },
    { kind: 'or' as const, branches: node.or },
  ].filter((candidate) => isPresent(candidate.branches));
  const hasNot = isPresent(node.not);
  const hasLeaf = isPresent(node.field) || isPresent(node.op);

  const forms = combinators.length + (hasNot ? 1 : 0) + (hasLeaf ? 1 : 0);
  if (forms !== 1) {
    throw invalidQueryCondition(
      'A query condition must be exactly one of and / or / not / a {field, op, value} leaf.',
    );
  }

  if (hasNot) {
    return { kind: 'not', child: validateCondition(node.not as VariantCondition) };
  }

  // `.at(0)` rather than `[0]`: indexed access is typed as always-defined while
  // `noUncheckedIndexedAccess` is off, which makes the guard below look impossible to the
  // compiler even though the array is empty whenever the node is a leaf. `.at()` returns
  // `T | undefined` honestly.
  const combinator = combinators.at(0);
  if (combinator !== undefined) {
    const { branches } = combinator;
    if (!Array.isArray(branches) || branches.length === 0) {
      throw invalidQueryCondition('A query condition combinator needs at least one branch.');
    }
    return {
      kind: combinator.kind,
      children: (branches as VariantCondition[]).map(validateCondition),
    };
  }

  return validateLeaf(node);
}

function validateLeaf(node: VariantCondition): ValidatedCondition {
  const field = node.field;
  if (typeof field !== 'string' || !isVariantField(field)) {
    throw unknownQueryField(String(field));
  }

  const op = node.op;
  if (typeof op !== 'string' || !OPERATORS.has(op)) {
    throw unknownQueryOperator(String(op));
  }
  const operator = op as VariantOperator;

  if (variantFieldSpec(field).array === true && !LIST_FIELD_OPERATORS.has(operator)) {
    throw invalidQueryCondition(`Operator ${operator} cannot be applied to the list field ${field}.`);
  }

  return { kind: 'leaf', field, op: operator, value: validateValue(operator, node.value) };
}

function validateValue(op: VariantOperator, value: unknown): unknown {
  if (NULLARY_OPERATORS.has(op)) {
    if (isPresent(value)) throw invalidQueryCondition(`Operator ${op} takes no value.`);
    return null;
  }

  if (!isPresent(value)) throw invalidQueryCondition(`Operator ${op} expects a value.`);

  if (LIST_OPERATORS.has(op)) {
    if (!Array.isArray(value) || value.length === 0) {
      throw invalidQueryCondition(`Operator ${op} expects a non-empty list value.`);
    }
    return value;
  }

  if (op === VariantOperator.BETWEEN) {
    if (!Array.isArray(value) || value.length !== 2) {
      throw invalidQueryCondition(`Operator ${op} expects a list of exactly two values.`);
    }
    return value;
  }

  if (PATTERN_OPERATORS.has(op) && typeof value !== 'string') {
    throw invalidQueryCondition(`Operator ${op} expects a string value.`);
  }

  if (Array.isArray(value)) {
    throw invalidQueryCondition(`Operator ${op} expects a single value.`);
  }

  return value;
}

function validateOrderBy(order: VariantOrder[] | null | undefined): ValidatedOrder[] {
  if (!isPresent(order)) return [];
  if (!Array.isArray(order)) {
    throw invalidQueryCondition('Ordering must be a list of {field, dir} terms.');
  }

  return order.map((term) => {
    const field = term.field;
    if (typeof field !== 'string' || !isVariantField(field)) {
      throw unknownQueryField(String(field));
    }

    if (!isPresent(term.dir)) return { field, dir: SortDirection.ASC };
    if (!isSortDirection(term.dir)) {
      throw invalidQueryCondition(`Sort direction must be asc or desc, got ${term.dir}.`);
    }

    return { field, dir: term.dir };
  });
}

function validateLimit(limit: number | null | undefined): number {
  if (!isPresent(limit)) return DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(limit) || limit < 1) {
    throw invalidQueryCondition('Page size must be a positive integer.');
  }

  // ANL-02 says the page size "is capped at 200" — an over-large request is clamped,
  // not refused, and clamping in the domain keeps both routes identical.
  return Math.min(limit, MAX_PAGE_SIZE);
}

function validateCursor(cursor: string | null | undefined): number {
  if (!isPresent(cursor)) return 0;

  const offset = typeof cursor === 'string' ? decodeCursor(cursor) : null;
  if (offset === null) throw invalidQueryCondition('Invalid cursor.');

  return offset;
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

const SORT_DIRECTIONS: readonly string[] = Object.values(SortDirection);

function isSortDirection(value: string): value is SortDirection {
  return SORT_DIRECTIONS.includes(value);
}
