import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { ZodValidationPipe } from '../src/common/http/zod-validation.pipe';
import { AppException } from '../src/common/errors/app.exception';
import { ProblemDetailsFilter } from '../src/common/errors/problem.filter';
import { loadEnv } from '../src/infrastructure/config/env';
import { RequestIdMiddleware } from '../src/common/http/request-id.middleware';

test('zod validation pipe accepts valid body', () => {
  const pipe = new ZodValidationPipe(z.object({ name: z.string().min(1) }));
  assert.deepEqual(pipe.transform({ name: 'Helm' }), { name: 'Helm' });
});

test('zod validation pipe rejects invalid body', () => {
  const pipe = new ZodValidationPipe(z.object({ name: z.string().min(1) }));
  assert.throws(() => pipe.transform({ name: '' }), (err: unknown) => {
    assert.ok(err instanceof AppException);
    assert.equal(err.code, 'VALIDATION_FAILED');
    return true;
  });
});

test('loadEnv applies defaults when mock secret provided', () => {
  const env = loadEnv({
    NODE_ENV: 'test',
    SUPABASE_JWT_SECRET: 'test-only-helm-jwt-secret-min-32-chars!!',
  });
  assert.equal(env.PORT, 8080);
  assert.equal(env.AUTH_PROVIDER, 'mock');
  assert.equal(env.API_VERSION, 'v1');
});

test('problem filter maps AppException without leaking stacks to client', () => {
  const filter = new ProblemDetailsFilter();
  let status = 0;
  let body: unknown;
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({
        status(code: number) {
          status = code;
          return this;
        },
        setHeader() {
          return this;
        },
        json(payload: unknown) {
          body = payload;
        },
      }),
      getRequest: () => ({ requestId: 'req-1', originalUrl: '/v1/me' }),
    }),
  };
  filter.catch(AppException.unauthorized('nope'), host as never);
  assert.equal(status, 401);
  assert.equal((body as { code: string }).code, 'UNAUTHORIZED');
  assert.equal((body as { request_id: string }).request_id, 'req-1');
  assert.equal('stack' in (body as object), false);
});

test('problem filter hides internal error details from clients', () => {
  const filter = new ProblemDetailsFilter(undefined, { NODE_ENV: 'production' } as never);
  let body: unknown;
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({
        status() {
          return this;
        },
        setHeader() {
          return this;
        },
        json(payload: unknown) {
          body = payload;
        },
      }),
      getRequest: () => ({ requestId: 'req-2', originalUrl: '/v1/x' }),
    }),
  };
  filter.catch(new Error('secret connection string postgresql://x:y@z/db'), host as never);
  assert.equal((body as { detail: string }).detail, 'An unexpected error occurred');
  assert.equal((body as { code: string }).code, 'INTERNAL_ERROR');
});

test('request id middleware rejects unsafe incoming ids', () => {
  const mw = new RequestIdMiddleware();
  let outId = '';
  const req = { header: () => 'bad id with spaces\ninjection' };
  const res = {
    setHeader(name: string, value: string) {
      if (name === 'x-request-id') outId = value;
    },
  };
  mw.use(req as never, res as never, () => undefined);
  assert.match(outId, /^[0-9a-f-]{36}$/i);
});
