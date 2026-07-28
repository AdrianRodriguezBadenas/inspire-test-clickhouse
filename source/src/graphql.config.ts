/**
 * The GraphQL surface's configuration.
 *
 * Code-first, consistent with the TypeScript-end-to-end choice in `00_bootstrap`, and
 * with the mandatory limits of adr-graphql-query-transport: **introspection is off
 * outside development**, and the playground is never served.
 *
 * The depth and complexity caps the ADR also demands are not here but in the domain
 * (`variant-query.limits.ts`). The vector the ADR names is the recursive *input* type —
 * an arbitrarily deep condition tree — and that tree is bounded once, for every access
 * route, before a query is built. The selection set this schema exposes is shallow by
 * construction: a page, its items, and scalar fields.
 */

import type { ApolloDriverConfig } from '@nestjs/apollo';

export function graphqlConfig(env: NodeJS.ProcessEnv = process.env): ApolloDriverConfig {
  return {
    autoSchemaFile: true,
    sortSchema: true,
    path: '/graphql',
    playground: false,
    // Fails closed: only an explicit development environment opens the schema up.
    // `npm run start:dev` sets it; a deployment that sets nothing stays closed.
    introspection: env.NODE_ENV === 'development',
  };
}
