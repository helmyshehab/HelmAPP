import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { ZodValidationPipe } from '../src/common/http/zod-validation.pipe';
import { AppException } from '../src/common/errors/app.exception';
import { ProblemDetailsFilter } from '../src/common/errors/problem.filter';
import { loadEnv } from '../src/infrastructure/config/env';

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

test('loadEnv applies defaults', () => {
  const env = loadEnv({ NODE_ENV: 'test' });
  assert.equal(env.PORT, 8080);
  assert.equal(env.AUTH_PROVIDER, 'mock');
  assert.equal(env.API_VERSION, 'v1');
});

test('problem filter maps AppException', () => {
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
});
