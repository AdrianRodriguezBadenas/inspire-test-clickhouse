import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { AnalyticsModule } from './analytics/analytics.module';
import { buildGraphqlConfig } from './graphql.config';

@Module({
  imports: [GraphQLModule.forRoot(buildGraphqlConfig()), AnalyticsModule],
})
export class AppModule {}
