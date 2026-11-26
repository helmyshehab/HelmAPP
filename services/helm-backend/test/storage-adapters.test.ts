import assert from 'node:assert/strict';
import test from 'node:test';
import { AppException } from '../src/common/errors/app.exception';
import { MockStorageAdapter } from '../src/infrastructure/adapters/mock/mock-storage.adapter';
import { SupabaseStorageAdapter } from '../src/infrastructure/adapters/supabase/supabase-storage.adapter';
import { loadEnv } from '../src/infrastructure/config/env';
import {
  CATALOG_MEDIA_BUCKET,
} from '../src/infrastructure/ports/storage.port';

const DEST_PATH =
  'destinations/df027529-5744-4486-a36d-56d2a2170a0c/cover/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg';

test('MockStorageAdapter upload remove and public URL', async () => {
  const storage = new MockStorageAdapter();
  const body = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9, 0x00, 0x01]);

  const uploaded = await storage.uploadPublicObject({
    bucket: CATALOG_MEDIA_BUCKET,
    path: DEST_PATH,
    body,
    contentType: 'image/jpeg',
  });

  assert.equal(
    uploaded.publicUrl,
    `mock://storage/public/${CATALOG_MEDIA_BUCKET}/${DEST_PATH}`,
  );
  assert.equal(uploaded.byteSize, body.byteLength);
  assert.ok(storage.objects.has(`${CATALOG_MEDIA_BUCKET}:${DEST_PATH}`));

  assert.equal(
    storage.publicObjectUrl(CATALOG_MEDIA_BUCKET, DEST_PATH),
    uploaded.publicUrl,
  );

  await storage.removeObject(CATALOG_MEDIA_BUCKET, DEST_PATH);
  assert.equal(storage.objects.has(`${CATALOG_MEDIA_BUCKET}:${DEST_PATH}`), false);

  // Idempotent remove
  await storage.removeObject(CATALOG_MEDIA_BUCKET, DEST_PATH);
});

test('MockStorageAdapter rejects non catalog-media bucket and unsafe paths', async () => {
  const storage = new MockStorageAdapter();
  await assert.rejects(
    () =>
      storage.uploadPublicObject({
        bucket: 'private-docs',
        path: DEST_PATH,
        body: Uint8Array.from([1, 2, 3]),
        contentType: 'image/jpeg',
      }),
    (err: unknown) => err instanceof AppException,
  );
  await assert.rejects(
    () =>
      storage.uploadPublicObject({
        bucket: CATALOG_MEDIA_BUCKET,
        path: '../escape.jpg',
        body: Uint8Array.from([1, 2, 3]),
        contentType: 'image/jpeg',
      }),
    (err: unknown) => err instanceof AppException,
  );
});

test('SupabaseStorageAdapter uses service-role REST upload and public URL', async () => {
  const calls: Array<{ url: string; method?: string; headers?: Record<string, string> }> =
    [];

  const env = loadEnv({
    NODE_ENV: 'test',
    SUPABASE_JWT_SECRET: 'test-only-helm-jwt-secret-min-32-chars!!',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
    STORAGE_PROVIDER: 'supabase',
  });

  const storage = new SupabaseStorageAdapter(env);
  storage.replaceFetchForTests(async (url, init) => {
    calls.push({
      url,
      method: init?.method,
      headers: init?.headers,
    });
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      async text() {
        return '';
      },
      async json() {
        return {};
      },
    };
  });
  const body = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);

  const uploaded = await storage.uploadPublicObject({
    bucket: CATALOG_MEDIA_BUCKET,
    path: DEST_PATH,
    body,
    contentType: 'image/jpeg',
    upsert: true,
  });

  assert.equal(
    uploaded.publicUrl,
    `https://example.supabase.co/storage/v1/object/public/${CATALOG_MEDIA_BUCKET}/${DEST_PATH}`,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.method, 'POST');
  assert.match(
    calls[0]?.url ?? '',
    /\/storage\/v1\/object\/catalog-media\/destinations\//,
  );
  assert.equal(calls[0]?.headers?.Authorization, 'Bearer service-role-test-key');
  assert.equal(calls[0]?.headers?.apikey, 'service-role-test-key');
  assert.equal(calls[0]?.headers?.['x-upsert'], 'true');
  assert.equal(calls[0]?.headers?.['Content-Type'], 'image/jpeg');

  // Never use anon key in adapter — only what was constructed with.
  assert.equal(
    Object.values(calls[0]?.headers ?? {}).includes('anon-key'),
    false,
  );

  await storage.removeObject(CATALOG_MEDIA_BUCKET, DEST_PATH);
  assert.equal(calls[1]?.method, 'DELETE');
  assert.match(calls[1]?.url ?? '', /\/storage\/v1\/object\/catalog-media$/);
});

test('loadEnv requires service role for STORAGE_PROVIDER=supabase', () => {
  assert.throws(
    () =>
      loadEnv({
        NODE_ENV: 'test',
        SUPABASE_JWT_SECRET: 'test-only-helm-jwt-secret-min-32-chars!!',
        SUPABASE_URL: 'https://example.supabase.co',
        STORAGE_PROVIDER: 'supabase',
      }),
    /SUPABASE_SERVICE_ROLE_KEY/,
  );

  const env = loadEnv({
    NODE_ENV: 'test',
    SUPABASE_JWT_SECRET: 'test-only-helm-jwt-secret-min-32-chars!!',
  });
  assert.equal(env.STORAGE_PROVIDER, 'mock');
});
