/**
 * The structured query contract for variant reads — an engine- and transport-agnostic
 * condition tree, per adr-variant-structured-query.
 *
 * The same types serve both access routes (REST `POST /variants/query` and the
 * read-only GraphQL surface), which is what makes their parity meaningful:
 * adr-graphql-query-transport requires both to be thin adapters over one contract.
 */

import type { Variant } from './variant';

/** The fixed operator set. Anything outside it is rejected before a query is built. */
export enum VariantOperator {
  EQ = 'eq',
  NE = 'ne',
  LT = 'lt',
  LTE = 'lte',
  GT = 'gt',
  GTE = 'gte',
  IN = 'in',
  NIN = 'nin',
  LIKE = 'like',
  ILIKE = 'ilike',
  BETWEEN = 'between',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
}

/** Sort direction. */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * A node of the condition tree: a boolean combinator (`and` / `or` / `not`) or a
 * `{ field, op, value }` leaf.
 *
 * Every key is optional because this one permissive shape is what both transports
 * produce — GraphQL's recursive input type materializes *all* keys on every node
 * (the absent ones as `null` / `undefined`). Nodes are therefore discriminated by
 * which key carries a **defined value**, never by key presence.
 */
export interface VariantCondition {
  and?: VariantCondition[] | null;
  or?: VariantCondition[] | null;
  not?: VariantCondition | null;
  field?: string | null;
  op?: string | null;
  value?: unknown;
}

/** One ordering term. */
export interface VariantOrder {
  field?: string | null;
  dir?: string | null;
}

/** A client-supplied structured query. Every part is optional. */
export interface VariantQuery {
  where?: VariantCondition | null;
  order_by?: VariantOrder[] | null;
  limit?: number | null;
  cursor?: string | null;
}

/** A page of current variants. */
export interface VariantPage {
  items: Variant[];
  /** Opaque cursor for the next page; `null` when this is the last one. */
  next_cursor: string | null;
}

/** Page size defaults and cap, per ANL-02. */
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;
