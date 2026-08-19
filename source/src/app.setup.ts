/**
 * The wiring every entry point shares — the real process and the e2e suite alike, so
 * the tests exercise the pipeline that runs in production rather than a rebuilt one.
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppExceptionFilter } from './common/app-exception.filter';

export function setupApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      // Strip anything the DTO does not declare, and refuse the request rather than
      // dropping it silently — on a hand-driven test API, a typo'd field name should
      // be visible, not quietly ignored.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AppExceptionFilter());
}

/**
 * The Swagger surface. adr-graphql-query-transport keeps REST indefinitely precisely
 * for this: it is how the team exercises the API by hand.
 */
export function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Variant store')
      .setDescription(
        'Stores and queries annotated genomic variants in ClickHouse. Reads return the ' +
          'current version of each variant; the same query contract is also served, ' +
          'read-only, at /graphql.',
      )
      .setVersion('0.1.0')
      .build(),
  );

  SwaggerModule.setup('docs', app, document);
}
