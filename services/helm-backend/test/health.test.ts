import assert from 'node:assert/strict';
import test from 'node:test';
import { MetaController } from '../src/common/meta/meta.controller';
import { ReadinessService } from '../src/common/meta/readiness.service';
import type { AppEnv } from '../src/infrastructure/config/env';

const env: AppEnv = {
  NODE_ENV: 'test',
  PORT: 8080,
  LOG_LEVEL: 'error',
  APP_NAME: 'Helm حلم',
  APP_VERSION: '0.1.0',
  API_VERSION: 'v1',
  AUTH_PROVIDER: 'mock',
  SUPABASE_JWT_SECRET: 'test-only-helm-jwt-secret-min-32-chars!!',
  SUPABASE_JWT_AUDIENCE: 'authenticated',
  AI_PROVIDER: 'mock',
  PAYMENT_PROVIDER: 'mock',
  FLIGHT_PROVIDER: 'mock',
  NOTIFY_PROVIDER: 'console',
};

test('health returns ok without dependency checks', () => {
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

test('ready reports degraded when DATABASE_URL unset (not ok)', async () => {
  const readiness = new ReadinessService(env);
  const controller = new MetaController(env, readiness);
  const res = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
  };
  const result = await controller.getReady(res as never);
  assert.equal(result.status, 'degraded');
  assert.equal(result.checks.database, 'skipped');
  assert.equal(res.statusCode, 200);
});

test('ready returns 503 with ReadyResponse when database check fails', async () => {
  const readiness = {
    check: async () => ({
      status: 'unavailable' as const,
      checks: { database: 'failed' as const },
      detail: 'boom',
    }),
  };
  const controller = new MetaController(env, readiness as ReadinessService);
  const res = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
  };
  const result = await controller.getReady(res as never);
  assert.equal(result.status, 'unavailable');
  assert.equal(result.checks.database, 'failed');
  assert.equal(res.statusCode, 503);
  assert.equal(result.detail, 'boom');
});

test('ready does not throw AppException on failure (keeps ReadyResponse body)', async () => {
  const readiness = {
    check: async () => ({
      status: 'unavailable' as const,
      checks: { database: 'failed' as const },
      detail: 'boom',
    }),
  };
  const controller = new MetaController(env, readiness as ReadinessService);
  const res = { statusCode: 200, status(c: number) { this.statusCode = c; return this; } };
  await assert.doesNotReject(async () => {
    await controller.getReady(res as never);
  });
  assert.equal(res.statusCode, 503);
});
