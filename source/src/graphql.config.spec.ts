import { GraphQLError } from 'graphql';
import { QueryValidationError } from './analytics/domain/variant-query';
import { buildGraphqlConfig, formatError } from './graphql.config';

describe('buildGraphqlConfig', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  // ADR adr-graphql-query-transport: introspection is attack surface REST did not
  // carry, so it is development-only.
  it('enables introspection in development', () => {
    // GIVEN
    process.env.NODE_ENV = 'development';

    // WHEN
    const config = buildGraphqlConfig();

    // THEN
    expect(config.introspection).toBe(true);
  });

  it('disables introspection in production', () => {
    // GIVEN
    process.env.NODE_ENV = 'production';

    // WHEN
    const config = buildGraphqlConfig();

    // THEN
    expect(config.introspection).toBe(false);
  });

  it('disables introspection in any non-development environment', () => {
    // GIVEN
    process.env.NODE_ENV = 'staging';

    // WHEN
    const config = buildGraphqlConfig();

    // THEN
    expect(config.introspection).toBe(false);
  });

  it('never serves the playground', () => {
    // WHEN
    const config = buildGraphqlConfig();

    // THEN
    expect(config.playground).toBe(false);
  });

  it('serves the schema at /graphql', () => {
    // WHEN
    const config = buildGraphqlConfig();

    // THEN
    expect(config.path).toBe('/graphql');
  });
});

describe('formatError', () => {
  // ANL-02 AC: a rejected query carries the same code on every access route.
  it('surfaces a query-validation failure with its domain code', () => {
    // GIVEN
    const validation = new QueryValidationError(
      'unknown_query_field',
      'Unknown query field: bogus.',
    );
    const wrapped = new GraphQLError('wrapped', { originalError: validation });

    // WHEN
    const result = formatError(
      { message: 'wrapped', path: ['variants'] },
      wrapped,
    );

    // THEN
    expect(result).toEqual({
      message: 'Unknown query field: bogus.',
      extensions: { code: 'unknown_query_field' },
      path: ['variants'],
      locations: undefined,
    });
  });

  it('finds a query-validation failure nested behind a cause chain', () => {
    // GIVEN
    const validation = new QueryValidationError(
      'query_too_complex',
      'Too deep.',
    );
    const inner = new Error('adapter', { cause: validation });
    const wrapped = new GraphQLError('wrapped', { originalError: inner });

    // WHEN
    const result = formatError({ message: 'wrapped' }, wrapped);

    // THEN
    expect(result.extensions).toEqual({ code: 'query_too_complex' });
    expect(result.message).toBe('Too deep.');
  });

  // Apollo attaches `stacktrace` unless NODE_ENV is exactly 'production'.
  it('strips the stacktrace from a client-safe validation error', () => {
    // GIVEN
    const formatted = {
      message: 'Value "nope" does not exist in "VariantField" enum.',
      extensions: { code: 'BAD_USER_INPUT', stacktrace: ['at foo', 'at bar'] },
      path: ['variants'],
    };

    // WHEN
    const result = formatError(formatted, new Error('bad input'));

    // THEN
    expect(result.extensions).toEqual({ code: 'BAD_USER_INPUT' });
    expect(result.message).toBe(formatted.message);
  });

  it('hides an unexpected failure behind a generic internal_error', () => {
    // GIVEN
    const formatted = {
      message: 'Connection to clickhouse:9000 refused',
      extensions: { code: 'INTERNAL_SERVER_ERROR', stacktrace: ['at db'] },
      path: ['variants'],
    };

    // WHEN
    const result = formatError(formatted, new Error('db down'));

    // THEN
    expect(result).toEqual({
      message: 'An unexpected error occurred.',
      extensions: { code: 'internal_error' },
      path: ['variants'],
    });
  });

  it('hides a failure that carries no code at all', () => {
    // WHEN
    const result = formatError({ message: 'boom' }, new Error('boom'));

    // THEN
    expect(result.extensions).toEqual({ code: 'internal_error' });
    expect(result.message).toBe('An unexpected error occurred.');
  });
});
