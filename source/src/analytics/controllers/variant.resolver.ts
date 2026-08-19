/**
 * The GraphQL access route — read-only, per adr-graphql-query-transport.
 *
 * As thin as the controller: it maps the typed input types onto the same service call
 * and nothing else. No mutation is exposed, because production writes are file-based
 * ingest and advertising a write here would promise a path the product does not intend
 * to have.
 */

import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { VariantService } from '../application/variant.service';
import { DEFAULT_PAGE_SIZE } from '../domain/variant-query';
import {
  VariantConditionInput,
  VariantOrderInput,
  VariantPageObject,
} from './graphql/variant-graphql.types';

@Resolver(() => VariantPageObject)
export class VariantResolver {
  constructor(private readonly service: VariantService) {}

  @Query(() => VariantPageObject, {
    name: 'variants',
    description: 'The current version of each matching variant, paginated.',
  })
  async variants(
    @Args('where', { type: () => VariantConditionInput, nullable: true })
    where?: VariantConditionInput | null,
    @Args('orderBy', { type: () => [VariantOrderInput], nullable: true })
    orderBy?: VariantOrderInput[] | null,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: DEFAULT_PAGE_SIZE })
    limit?: number | null,
    @Args('cursor', { type: () => String, nullable: true }) cursor?: string | null,
  ): Promise<VariantPageObject> {
    const page = await this.service.query({ where, order_by: orderBy, limit, cursor });

    // The domain entities go back unchanged: the schema declares the timestamp fields
    // as ISO date-times, which is the same rendering the REST body produces — so the
    // two routes return identical values for the same record.
    return { items: page.items, next_cursor: page.next_cursor };
  }
}
