import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StructuredLogger } from './common/logging/structured-logger';
import { loadEnv } from './infrastructure/config/env';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(StructuredLogger);
  logger.setContext('bootstrap');
  app.useLogger(logger);

  // API versioning — all HTTP routes under /v1
  app.setGlobalPrefix(env.API_VERSION);
  app.enableCors({ origin: true });

  await app.listen(env.PORT);
  logger.info(
    `helm-backend listening on :${env.PORT} prefix=/${env.API_VERSION} auth=${env.AUTH_PROVIDER}`,
  );
}

bootstrap().catch((err) => {
  console.error(JSON.stringify({
    level: 'error',
    time: new Date().toISOString(),
    context: 'bootstrap',
    message: err instanceof Error ? err.message : String(err),
  }));
  process.exit(1);
});
