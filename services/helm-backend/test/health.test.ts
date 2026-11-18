import assert from 'node:assert/strict';
import test from 'node:test';
import { MetaController } from '../src/common/meta/meta.controller';
import { ReadinessService } from '../src/common/meta/readiness.service';
import type { AppEnv } from '../src/infrastructure/config/env';
import { AppException } from '../src/common/errors/app.exception';

const env: AppEnv = {
  NODE_ENV: 'test',
  PORT: 8080,
  LOG_LEVEL: 'error',
  APP_NAME: 'Helm حلم',
  APP_VERSION: '0.1.0',
  API_VERSION: 'v1',
  AUTH_PROVIDER: 'mock',
  SUPABASE_JWT_AUDIENCE: 'authenticated',
  AI_PROVIDER: 'mock',
  PAYMENT_PROVIDER: 'mock',
  FLIGHT_PROVIDER: 'mock',
  NOTIFY_PROVIDER: 'console',
};

test('health returns ok', () => {
  const readiness = new ReadinessService(env);
  const controller = new MetaController(env, readiness);
  const result = controller.getHealth();
  assert.equal(result.status, 'ok');
  assert.equal(result.service, 'helm-backend');
});

test('meta returns Helm brand', () => {
  const readiness = new ReadinessService(env);
  const controller = new MetaController(env, readiness);
  const result = controller.getMeta();
  assert.equal(result.name, 'Helm حلم');
  assert.equal(result.apiVersion, 'v1');
});

test('ready skips database when DATABASE_URL unset', async () => {
  const readiness = new ReadinessService(env);
  const controller = new MetaController(env, readiness);
  const result = await controller.getReady();
  assert.equal(result.status, 'ok');
  assert.equal(result.checks.database, 'skipped');
});

test('ready throws NOT_READY when database check fails', async () => {
  const readiness = {
    check: async () => ({
      status: 'unavailable' as const,
      checks: { database: 'failed' as const },
      detail: 'boom',
    }),
  };
  const controller = new MetaController(env, readiness as ReadinessService);
  await assert.rejects(() => controller.getReady(), (err: unknown) => {
    assert.ok(err instanceof AppException);
    assert.equal(err.code, 'NOT_READY');
    return true;
  });
});
