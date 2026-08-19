import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { setupApp, setupSwagger } from './app.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  setupApp(app);
  setupSwagger(app);
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);

  // Bind `::`, not the default. Railway's private network resolves a service's internal
  // DNS name to an IPv6 address (and, in environments created from October 2025 on, to an
  // IPv4 one too), so a server listening on IPv4 only is unreachable from a sibling
  // service. `::` covers both families and is a no-op locally.
  await app.listen(port, '::');

  new Logger('bootstrap').log(`Listening on :${port} — REST /variants · GraphQL /graphql · docs /docs`);
}

void bootstrap();
