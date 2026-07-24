import { Module } from '@nestjs/common';
import { VariantService } from './application/variant.service';
import { VariantController } from './controllers/variant.controller';
import { clickhouseProvider } from './infrastructure/clickhouse.provider';
import { VariantRepository } from './infrastructure/variant.repository';

@Module({
  controllers: [VariantController],
  providers: [VariantService, VariantRepository, clickhouseProvider],
})
export class AnalyticsModule {}
