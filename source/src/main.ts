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
  await app.listen(port);

  new Logger('bootstrap').log(`Listening on :${port} — REST /variants · GraphQL /graphql · docs /docs`);
}

void bootstrap();
