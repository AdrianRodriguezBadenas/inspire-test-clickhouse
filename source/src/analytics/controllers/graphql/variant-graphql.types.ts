// GraphQL surface for the variant read contract (analytics::variant::query).
// See .inspire_kb/01_adr/adr-graphql-query-transport.md.
//
// Everything here is DERIVED from the domain allow-lists (`VARIANT_FIELD_TYPES`,
// `QUERY_OPERATORS`) rather than transcribed. The field/operator allow-list is the
// security boundary the translator enforces; a second hand-maintained copy would
// drift, and a drifting copy widens that boundary silently. The ~290-field object
// type is generated for the same reason: transcribing it would be a third copy of
// the entity schema.

import { Field, InputType, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Allow } from 'class-validator';
import { GraphQLFloat, GraphQLScalarType, GraphQLString } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { VARIANT_FIELDS, VARIANT_FIELD_TYPES } from '../../domain/variant-fields';
import { Condition, OrderBy, QUERY_OPERATORS } from '../../domain/variant-query';

/** `{ project_id: 'project_id', … }` — an enum shape built from the allow-list. */
function enumFrom(values: readonly string[]): Record<string, string> {
  return Object.fromEntries(values.map((value) => [value, value]));
}

export const VariantFieldEnum = enumFrom(VARIANT_FIELDS);
registerEnumType(VariantFieldEnum, {
  name: 'VariantField',
  description: 'A queryable variant field. Derived from the field allow-list.',
});

export const VariantOperatorEnum = enumFrom(QUERY_OPERATORS);
registerEnumType(VariantOperatorEnum, {
  name: 'VariantOperator',
  description: 'A permitted comparison operator.',
});

export const SortDirectionEnum = { asc: 'asc', desc: 'desc' } as const;
registerEnumType(SortDirectionEnum, {
  name: 'SortDirection',
  description: 'Sort direction for an order-by entry.',
});

/**
 * A field type as `@nestjs/graphql` expects it from a `@Field` thunk: a scalar, or
 * a single-element array standing for a list of that scalar. Note this is Nest's
 * convention, not a graphql-js `GraphQLList`, which the schema builder rejects.
 */
export type GraphqlFieldType = GraphQLScalarType | [GraphQLScalarType];

/**
 * Map a ClickHouse column type onto its GraphQL output type.
 *
 * 64-bit integers map to `Float`: GraphQL's `Int` is 32-bit and would overflow.
 * `Float` is an IEEE-754 double, exact up to 2^53 — well beyond the real range of
 * the id and genomic-position columns. A column that genuinely needs the full
 * 64-bit range would have to move to `String` or a custom scalar.
 *
 * Throws on an unmapped type: a silent default would ship a wrong schema.
 */
export function graphqlTypeForClickHouseType(type: string): GraphqlFieldType {
  if (type.startsWith('Array(')) {
    const element = graphqlTypeForClickHouseType(
      type.slice('Array('.length, -1),
    );
    if (Array.isArray(element)) {
      throw new Error(`Nested array types are not supported: ${type}.`);
    }
    return [element];
  }

  switch (type) {
    case 'Float64':
    case 'UInt64':
    case 'Int64':
      return GraphQLFloat;
    case 'String':
    case 'UUID':
    case 'DateTime64(3)':
      return GraphQLString;
    default:
      throw new Error(`Unmapped ClickHouse type: ${type}.`);
  }
}

/**
 * A leaf or a boolean node of the condition tree — the AST of
 * adr-variant-structured-query, expressed as a recursive input type.
 *
 * Which shape a node takes is validated by the translator, not by the schema:
 * GraphQL cannot express "exactly one of `and` / `or` / `not` / (`field`+`op`)"
 * without `@oneOf`, and the translator already owns that check for REST. Keeping
 * one validator is what makes the two routes reject identically.
 */
// `@Allow()` on every field is load-bearing, not decoration. The app's global
// ValidationPipe runs with `whitelist` + `forbidNonWhitelisted`, and it applies to
// resolver arguments too: without a class-validator decorator every property here
// would be stripped and then rejected as unknown, before the resolver ran.
//
// `@Allow()` specifically permits a property WITHOUT constraining it, which is what
// this contract needs — adding real validators here would mean GraphQL validates
// differently from REST, and one shared validator (the translator) is exactly what
// keeps the two routes' failures identical.
@InputType('VariantCondition', {
  description:
    'A condition tree node: and/or/not, or a leaf of { field, op, value }.',
})
export class VariantConditionInput {
  @Field(() => [VariantConditionInput], { nullable: true })
  @Allow()
  and?: VariantConditionInput[];

  @Field(() => [VariantConditionInput], { nullable: true })
  @Allow()
  or?: VariantConditionInput[];

  @Field(() => VariantConditionInput, { nullable: true })
  @Allow()
  not?: VariantConditionInput;

  @Field(() => VariantFieldEnum, { nullable: true })
  @Allow()
  field?: string;

  @Field(() => VariantOperatorEnum, { nullable: true })
  @Allow()
  op?: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description:
      'The comparison value: a scalar, or a list for in/nin/between. Omitted for is_null / is_not_null.',
  })
  @Allow()
  value?: unknown;
}

@InputType('VariantOrder', { description: 'One order-by entry.' })
export class VariantOrderInput {
  @Field(() => VariantFieldEnum)
  @Allow()
  field!: string;

  @Field(() => SortDirectionEnum)
  @Allow()
  dir!: 'asc' | 'desc';
}

/**
 * A stored variant. Fields are generated from the allow-list, all nullable: the
 * table is append-only and pre-existing rows may be missing any annotation, so
 * non-null would be a promise the store cannot keep on read.
 */
@ObjectType('Variant', { description: 'A stored annotated genomic variant.' })
export class VariantType {}

for (const field of VARIANT_FIELDS) {
  Field(() => graphqlTypeForClickHouseType(VARIANT_FIELD_TYPES[field]), {
    nullable: true,
  })(VariantType.prototype, field);
}

/**
 * Hand a GraphQL condition input to the domain as a `Condition`.
 *
 * Every field on the input is optional because GraphQL cannot express "exactly one
 * of and / or / not / (field + op)", while the domain `Condition` is a discriminated
 * union — so the two are not structurally assignable. The **translator** validates
 * the shape downstream, and it is the same validator the REST route goes through,
 * which is precisely what makes the two routes reject identically.
 *
 * This is therefore a deliberate boundary crossing, validated downstream, not a
 * silenced type error — and it is confined to this one named function so it stays
 * auditable.
 */
export function toDomainCondition(
  input: VariantConditionInput | undefined | null,
): Condition | undefined {
  if (input === undefined || input === null) {
    return undefined;
  }

  // An omitted `where` does not arrive as undefined: the ValidationPipe runs with
  // `transform: true`, so a missing argument is instantiated as an empty
  // VariantConditionInput. Forwarding that would reach the translator as a
  // malformed leaf instead of meaning "no filter" (ANL-02 AF-1).
  const isEmpty =
    input.and === undefined &&
    input.or === undefined &&
    input.not === undefined &&
    input.field === undefined &&
    input.op === undefined &&
    input.value === undefined;

  return isEmpty ? undefined : (input as Condition);
}

/** As {@link toDomainCondition}, for the order-by list. */
export function toDomainOrderBy(
  input: VariantOrderInput[] | undefined,
): OrderBy[] | undefined {
  return input;
}

@ObjectType('VariantPage', {
  description: 'A page of current variants, with a cursor to the next page.',
})
export class VariantPageType {
  @Field(() => [VariantType], { description: 'The matching current variants.' })
  items!: unknown[];

  @Field(() => String, {
    nullable: true,
    description: 'Cursor for the next page, or null when none remain.',
  })
  next_cursor!: string | null;
}
