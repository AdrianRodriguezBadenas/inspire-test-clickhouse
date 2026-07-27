import { Module } from '@nestjs/common';
import { VariantService } from './application/variant.service';
import { VariantController } from './controllers/variant.controller';
import { VariantResolver } from './controllers/variant.resolver';
import { clickhouseProvider } from './infrastructure/clickhouse.provider';
import { VariantRepository } from './infrastructure/variant.repository';

/**
 * The controller and the resolver are two access routes onto one service — REST
 * (with its Swagger surface) and read-only GraphQL. See
 * .inspire_kb/01_adr/adr-graphql-query-transport.md.
 */
@Module({
  controllers: [VariantController],
  providers: [
    VariantService,
    VariantRepository,
    clickhouseProvider,
    VariantResolver,
  ],
})
export class AnalyticsModule {}
