import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnv } from './infrastructure/config/env';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });
  await app.listen(env.PORT);
  // eslint-disable-next-line no-console
  console.log(`helm-backend listening on :${env.PORT} (providers=mock)`);
}

bootstrap();
