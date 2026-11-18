import assert from 'node:assert/strict';
import test from 'node:test';
import { SignJWT } from 'jose';
import { MockAuthAdapter, MOCK_JWT_ISSUER } from '../src/infrastructure/adapters/mock/mock-auth.adapter';
import { SupabaseJwtAuthAdapter } from '../src/infrastructure/adapters/supabase/supabase-jwt-auth.adapter';
import { loadEnv, type AppEnv } from '../src/infrastructure/config/env';
import { GetMeUseCase } from '../src/modules/identity/application/get-me.use-case';
import { hasAnyRole } from '../src/modules/identity/domain/roles';
import { RolesGuard } from '../src/common/auth/roles.guard';
import { Reflector } from '@nestjs/core';
import { AppException } from '../src/common/errors/app.exception';

const secret = 'test-only-helm-jwt-secret-min-32-chars!!';
const encoder = new TextEncoder();

const env: AppEnv = {
  NODE_ENV: 'test',
  PORT: 8080,
  LOG_LEVEL: 'error',
  APP_NAME: 'Helm حلم',
  APP_VERSION: '0.1.0',
  API_VERSION: 'v1',
  AUTH_PROVIDER: 'mock',
  SUPABASE_JWT_SECRET: secret,
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

test('mock auth rejects expired JWT', async () => {
  const auth = new MockAuthAdapter(env);
  const token = await new SignJWT({
    sub: 'u-expired',
    role: 'authenticated',
    app_metadata: { roles: ['customer'] },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(MOCK_JWT_ISSUER)
    .setAudience('authenticated')
    .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
    .sign(encoder.encode(secret));
  await assert.rejects(() => auth.verifyAccessToken(token), /Invalid|Unauthorized/);
});

test('mock auth rejects wrong audience', async () => {
  const auth = new MockAuthAdapter(env);
  const token = await new SignJWT({
    sub: 'u-aud',
    role: 'authenticated',
    app_metadata: { roles: ['customer'] },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(MOCK_JWT_ISSUER)
    .setAudience('wrong-audience')
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(encoder.encode(secret));
  await assert.rejects(() => auth.verifyAccessToken(token), /Invalid|Unauthorized/);
});

test('mock auth rejects wrong signature', async () => {
  const auth = new MockAuthAdapter(env);
  const token = await new SignJWT({
    sub: 'u-sig',
    role: 'authenticated',
    app_metadata: { roles: ['administrator'] },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(MOCK_JWT_ISSUER)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(encoder.encode('other-secret-that-is-also-32chars!!'));
  await assert.rejects(() => auth.verifyAccessToken(token), /Invalid|Unauthorized/);
});

test('supabase adapter ignores user_metadata roles (no privilege escalation)', async () => {
  const supabaseEnv: AppEnv = {
    ...env,
    AUTH_PROVIDER: 'supabase_jwt',
    SUPABASE_JWT_ISSUER: 'http://127.0.0.1:54321/auth/v1',
  };
  const auth = new SupabaseJwtAuthAdapter(supabaseEnv);
  const token = await new SignJWT({
    sub: 'u-escalate',
    email: 'attacker@example.com',
    role: 'authenticated',
    user_metadata: { roles: ['super-administrator', 'administrator'] },
    app_metadata: { roles: ['customer'] },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('http://127.0.0.1:54321/auth/v1')
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(encoder.encode(secret));

  const principal = await auth.verifyAccessToken(token);
  assert.deepEqual(principal.roles, ['customer']);
  assert.equal(principal.roles.includes('administrator'), false);
});

test('supabase adapter rejects wrong issuer', async () => {
  const supabaseEnv: AppEnv = {
    ...env,
    AUTH_PROVIDER: 'supabase_jwt',
    SUPABASE_JWT_ISSUER: 'http://127.0.0.1:54321/auth/v1',
  };
  const auth = new SupabaseJwtAuthAdapter(supabaseEnv);
  const token = await new SignJWT({
    sub: 'u-iss',
    role: 'authenticated',
    app_metadata: { roles: ['customer'] },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('https://evil.example/auth/v1')
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(encoder.encode(secret));
  await assert.rejects(() => auth.verifyAccessToken(token), /Invalid|Unauthorized/);
});

test('loadEnv forbids mock auth in production', () => {
  assert.throws(
    () =>
      loadEnv({
        NODE_ENV: 'production',
        AUTH_PROVIDER: 'mock',
        SUPABASE_JWT_SECRET: secret,
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/postgres',
      }),
    /forbidden|AUTH_PROVIDER=mock/,
  );
});

test('loadEnv requires JWT secret for mock', () => {
  assert.throws(() => loadEnv({ NODE_ENV: 'test', AUTH_PROVIDER: 'mock' }), /SUPABASE_JWT_SECRET/);
});

test('loadEnv requires DATABASE_URL in production', () => {
  assert.throws(
    () =>
      loadEnv({
        NODE_ENV: 'production',
        AUTH_PROVIDER: 'supabase_jwt',
        SUPABASE_JWT_SECRET: secret,
      }),
    /DATABASE_URL/,
  );
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

test('roles guard forbids customer from administrator route', () => {
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

test('roles guard allows matching role', () => {
  const reflector = {
    getAllAndOverride: () => ['operator', 'administrator'],
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const ctx = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: { userId: 'u', roles: ['customer', 'operator'] } }),
    }),
  };
  assert.equal(guard.canActivate(ctx as never), true);
});
