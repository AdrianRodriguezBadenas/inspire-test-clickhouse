import { Module } from '@nestjs/common';
import { ApolloDriver } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthModule } from './health/health.module';
import { graphqlConfig } from './graphql.config';

@Module({
  imports: [
    GraphQLModule.forRoot({ driver: ApolloDriver, ...graphqlConfig() }),
    AnalyticsModule,
    HealthModule,
  ],
})
export class AppModule {}
