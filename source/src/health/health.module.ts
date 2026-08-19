import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AnalyticsModule } from '../analytics/analytics.module';

/**
 * Imports AnalyticsModule for its exported ClickHouseConnection rather than constructing a
 * second client: two clients would mean the probe could pass while the connection the
 * product actually uses is broken.
 */
@Module({ imports: [AnalyticsModule], controllers: [HealthController] })
export class HealthModule {}
