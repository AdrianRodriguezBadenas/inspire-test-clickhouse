import { Module } from '@nestjs/common';
import { ApolloDriver } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { AnalyticsModule } from './analytics/analytics.module';
import { graphqlConfig } from './graphql.config';

@Module({
  imports: [
    GraphQLModule.forRoot({ driver: ApolloDriver, ...graphqlConfig() }),
    AnalyticsModule,
  ],
})
export class AppModule {}
