import { GraphQLFloat, GraphQLString } from 'graphql';
import { VARIANT_FIELDS, VARIANT_FIELD_TYPES } from '../../domain/variant-fields';
import { QUERY_OPERATORS } from '../../domain/variant-query';
import {
  VariantConditionInput,
  VariantFieldEnum,
  VariantOperatorEnum,
  graphqlTypeForClickHouseType,
  toDomainCondition,
} from './variant-graphql.types';

describe('variant GraphQL types', () => {
  // ADR adr-graphql-query-transport: the enums are DERIVED from the allow-list,
  // never a second hand-maintained copy — a drifting copy would silently widen
  // the security boundary.
  describe('VariantFieldEnum', () => {
    it('exposes exactly the queryable fields, in allow-list order', () => {
      // WHEN
      const values = Object.keys(VariantFieldEnum);

      // THEN
      expect(values).toEqual([...VARIANT_FIELDS]);
    });

    it('maps every value to its own field name', () => {
      // WHEN
      const entries = Object.entries(VariantFieldEnum);

      // THEN
      expect(entries).toEqual(VARIANT_FIELDS.map((field) => [field, field]));
    });
  });

  describe('VariantOperatorEnum', () => {
    it('exposes exactly the whitelisted operators', () => {
      // WHEN
      const values = Object.keys(VariantOperatorEnum);

      // THEN
      expect(values).toEqual([...QUERY_OPERATORS]);
    });

    it('maps every value to its own operator name', () => {
      // WHEN
      const entries = Object.entries(VariantOperatorEnum);

      // THEN
      expect(entries).toEqual(QUERY_OPERATORS.map((op) => [op, op]));
    });
  });

  describe('toDomainCondition', () => {
    it('passes a populated condition through', () => {
      // GIVEN
      const input = new VariantConditionInput();
      input.field = 'collection';
      input.op = 'eq';
      input.value = 'col-a';

      // WHEN
      const result = toDomainCondition(input);

      // THEN
      expect(result).toBe(input);
    });

    it('treats an absent condition as no filter', () => {
      // WHEN
      const result = toDomainCondition(undefined);

      // THEN
      expect(result).toBeUndefined();
    });

    // The ValidationPipe instantiates an omitted argument, so "no filter" reaches
    // the resolver as an empty instance rather than undefined (ANL-02 AF-1).
    it('treats an all-undefined instance as no filter', () => {
      // GIVEN
      const input = new VariantConditionInput();

      // WHEN
      const result = toDomainCondition(input);

      // THEN
      expect(result).toBeUndefined();
    });

    it('keeps a condition whose only populated field is `not`', () => {
      // GIVEN
      const inner = new VariantConditionInput();
      inner.field = 'score';
      inner.op = 'is_null';
      const input = new VariantConditionInput();
      input.not = inner;

      // WHEN
      const result = toDomainCondition(input);

      // THEN
      expect(result).toBe(input);
    });
  });

  describe('graphqlTypeForClickHouseType', () => {
    it('maps Float64 to Float', () => {
      // WHEN
      const type = graphqlTypeForClickHouseType('Float64');

      // THEN
      expect(type).toBe(GraphQLFloat);
    });

    it('maps 64-bit integers to Float, which JavaScript can represent exactly', () => {
      // WHEN
      const unsigned = graphqlTypeForClickHouseType('UInt64');
      const signed = graphqlTypeForClickHouseType('Int64');

      // THEN
      expect(unsigned).toBe(GraphQLFloat);
      expect(signed).toBe(GraphQLFloat);
    });

    it('maps String, UUID and DateTime64 to String', () => {
      // WHEN
      const string = graphqlTypeForClickHouseType('String');
      const uuid = graphqlTypeForClickHouseType('UUID');
      const timestamp = graphqlTypeForClickHouseType('DateTime64(3)');

      // THEN
      expect(string).toBe(GraphQLString);
      expect(uuid).toBe(GraphQLString);
      expect(timestamp).toBe(GraphQLString);
    });

    // `[Scalar]` is the shape @nestjs/graphql's schema builder understands; a
    // graphql-js GraphQLList is rejected with "Cannot determine a GraphQL output
    // type".
    it('maps an array field to a single-element list of its element type', () => {
      // WHEN
      const type = graphqlTypeForClickHouseType('Array(String)');

      // THEN
      expect(type).toEqual([GraphQLString]);
    });

    it('covers every type in the field allow-list', () => {
      // GIVEN — no field may fall through to a default that hides a mapping gap
      const act = () =>
        Object.values(VARIANT_FIELD_TYPES).map(graphqlTypeForClickHouseType);

      // THEN
      expect(act).not.toThrow();
    });

    it('rejects an unmapped ClickHouse type rather than guessing', () => {
      // WHEN
      const act = () => graphqlTypeForClickHouseType('Decimal(38, 10)');

      // THEN
      expect(act).toThrow('Unmapped ClickHouse type: Decimal(38, 10).');
    });
  });
});
