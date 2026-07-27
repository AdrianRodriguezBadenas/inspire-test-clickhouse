import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { VariantService } from '../application/variant.service';
import {
  VariantConditionInput,
  VariantOrderInput,
  VariantPageType,
  VariantType,
  toDomainCondition,
  toDomainOrderBy,
} from './graphql/variant-graphql.types';

/**
 * GraphQL read surface for variants — the second access route onto the same
 * contract `VariantController` serves over REST
 * (.inspire_kb/01_adr/adr-graphql-query-transport.md).
 *
 * Deliberately a thin adapter: validation, translation, the current-version
 * projection and pagination all live behind `VariantService`. Any logic that grows
 * here is drift, because it would exist on one route and not the other.
 *
 * Read-only by design — there is no mutation. Production writes are file-based
 * bulk ingest, not API calls (see the ADR, and TASK-2mf2yu).
 */
@Resolver(() => VariantType)
export class VariantResolver {
  constructor(private readonly service: VariantService) {}

  @Query(() => VariantPageType, {
    name: 'variants',
    description:
      'Query the current variants with a structured condition tree, paginated.',
  })
  async variants(
    @Args('where', { type: () => VariantConditionInput, nullable: true })
    where?: VariantConditionInput,
    @Args('orderBy', { type: () => [VariantOrderInput], nullable: true })
    orderBy?: VariantOrderInput[],
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('cursor', { type: () => String, nullable: true }) cursor?: string,
  ): Promise<VariantPageType> {
    const page = await this.service.query({
      where: toDomainCondition(where),
      order_by: toDomainOrderBy(orderBy),
      limit,
      cursor,
    });

    return { items: page.items, next_cursor: page.next_cursor };
  }
}
