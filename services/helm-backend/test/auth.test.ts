import assert from 'node:assert/strict';
import test from 'node:test';
import { MockAuthAdapter } from '../src/infrastructure/adapters/mock/mock-auth.adapter';
import type { AppEnv } from '../src/infrastructure/config/env';
import { GetMeUseCase } from '../src/modules/identity/application/get-me.use-case';
import { hasAnyRole } from '../src/modules/identity/domain/roles';
import { RolesGuard } from '../src/common/auth/roles.guard';
import { Reflector } from '@nestjs/core';
import { AppException } from '../src/common/errors/app.exception';

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

test('mock auth issues and verifies JWT with roles', async () => {
  const auth = new MockAuthAdapter(env);
  const token = await auth.issueAccessToken({
    userId: '11111111-1111-1111-1111-111111111111',
    email: 'ops@helm.local',
    roles: ['operator', 'customer'],
  });
  const principal = await auth.verifyAccessToken(token);
  assert.equal(principal.userId, '11111111-1111-1111-1111-111111111111');
  assert.equal(principal.email, 'ops@helm.local');
  assert.ok(principal.roles.includes('operator'));
  assert.ok(principal.roles.includes('customer'));
});

test('mock auth rejects garbage token', async () => {
  const auth = new MockAuthAdapter(env);
  await assert.rejects(() => auth.verifyAccessToken('not-a-jwt'), /Invalid|Unauthorized/);
});

test('get me use case maps principal', () => {
  const useCase = new GetMeUseCase();
  const me = useCase.execute({
    userId: 'u1',
    email: 'a@b.c',
    roles: ['customer', 'administrator'],
  });
  assert.deepEqual(me, {
    userId: 'u1',
    email: 'a@b.c',
    roles: ['customer', 'administrator'],
  });
});

test('role helper recognizes staff', () => {
  assert.equal(hasAnyRole(['customer'], ['administrator']), false);
  assert.equal(hasAnyRole(['customer', 'administrator'], ['administrator']), true);
});

test('roles guard forbids missing role', () => {
  const reflector = {
    getAllAndOverride: () => ['administrator'],
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const ctx = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: { userId: 'u', roles: ['customer'] } }),
    }),
  };
  assert.throws(() => guard.canActivate(ctx as never), (err: unknown) => {
    assert.ok(err instanceof AppException);
    assert.equal(err.code, 'FORBIDDEN');
    return true;
  });
});
