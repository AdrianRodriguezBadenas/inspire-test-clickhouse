import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLFormattedError } from 'graphql';
import { QueryValidationError } from './analytics/domain/variant-query';

/** Development is the only environment where the schema is browsable. */
function isDevelopment(): boolean {
  return (process.env.NODE_ENV ?? 'development') === 'development';
}

/**
 * Shape a GraphQL error so its `code` matches what the REST route returns for the
 * same failure (see `AppExceptionFilter`). ANL-02 requires the two routes to reject
 * a query identically, and the client-visible error code is part of that.
 *
 * An unexpected error is reported as `internal_error` with a generic message: the
 * original message and stack could carry SQL or connection details, and must not
 * cross the boundary.
 */
/**
 * Find a `QueryValidationError` inside a thrown error's wrapper chain.
 *
 * By the time Apollo calls `formatError`, the error raised in the service has been
 * wrapped — as `GraphQLError.originalError`, and potentially again via `cause` as
 * it crosses Nest's exception layer. The depth bound keeps a cyclic `cause` from
 * looping forever.
 */
function findQueryValidationError(
  error: unknown,
): QueryValidationError | undefined {
  let current: unknown = error;

  for (let depth = 0; depth < 5 && current != null; depth++) {
    if (current instanceof QueryValidationError) {
      return current;
    }
    const wrapper = current as { originalError?: unknown; cause?: unknown };
    current = wrapper.originalError ?? wrapper.cause;
  }

  return undefined;
}

export function formatError(
  formatted: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError {
  const validation = findQueryValidationError(error);

  if (validation !== undefined) {
    return {
      message: validation.message,
      extensions: { code: validation.code },
      path: formatted.path,
      locations: formatted.locations,
    };
  }

  // GraphQL's own validation (unknown field, bad enum, malformed document) is
  // already client-safe and carries GRAPHQL_VALIDATION_FAILED / BAD_USER_INPUT.
  //
  // Rebuilt field by field rather than returned as-is: Apollo attaches a
  // `stacktrace` extension whenever NODE_ENV is not exactly 'production', which
  // would leak internals in staging and any unnamed environment. Only `code`
  // crosses the boundary.
  const code = formatted.extensions?.code;
  if (typeof code === 'string' && code !== 'INTERNAL_SERVER_ERROR') {
    return {
      message: formatted.message,
      extensions: { code },
      path: formatted.path,
      locations: formatted.locations,
    };
  }

  return {
    message: 'An unexpected error occurred.',
    extensions: { code: 'internal_error' },
    path: formatted.path,
  };
}

/**
 * Code-first GraphQL configuration for the read surface
 * (.inspire_kb/01_adr/adr-graphql-query-transport.md).
 *
 * Introspection and the Apollo landing page are development-only: the ADR treats
 * them as attack surface REST did not carry. The recursive `VariantCondition`
 * input's depth limit is NOT set here — it lives in the domain layer so REST is
 * covered too (see `variant-query.limits.ts`).
 */
export function buildGraphqlConfig(): ApolloDriverConfig {
  return {
    driver: ApolloDriver,
    autoSchemaFile: true,
    sortSchema: true,
    path: '/graphql',
    introspection: isDevelopment(),
    playground: false,
    formatError,
  };
}
