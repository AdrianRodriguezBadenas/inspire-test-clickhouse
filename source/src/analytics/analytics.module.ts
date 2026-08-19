/**
 * The analytics module — the variant store.
 *
 * Both access routes (the REST controller and the GraphQL resolver) sit on the one
 * service, which is what adr-graphql-query-transport requires of them.
 */

import { Module } from '@nestjs/common';
import { VariantService } from './application/variant.service';
import { ClickHouseConnection } from './infrastructure/clickhouse.provider';
import { VariantRepository } from './infrastructure/variant.repository';
import { VariantController } from './controllers/variant.controller';
import { VariantResolver } from './controllers/variant.resolver';

@Module({
  controllers: [VariantController],
  providers: [VariantService, VariantRepository, ClickHouseConnection, VariantResolver],
  // ClickHouseConnection is exported so the readiness probe can ask THE connection the
  // product uses. A second client would let the probe pass while the real one is broken.
  exports: [VariantService, VariantRepository, ClickHouseConnection],
})
export class AnalyticsModule {}
