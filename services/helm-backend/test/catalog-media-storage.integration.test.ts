/**
 * Opt-in real Supabase Storage integration for catalog-media.
 *
 * Disabled by default. When RUN_STORAGE_INTEGRATION=1, requires:
 *   STORAGE_PROVIDER=supabase
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Never invents storage.* tables. Uses unique object paths and always
 * attempts cleanup in finally.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { loadEnv } from '../src/infrastructure/config/env.ts';
import { SupabaseStorageAdapter } from '../src/infrastructure/adapters/supabase/supabase-storage.adapter.ts';
import { CATALOG_MEDIA_BUCKET } from '../src/infrastructure/ports/storage.port.ts';

const enabled = process.env.RUN_STORAGE_INTEGRATION === '1';

function jpegBytes(): Uint8Array {
  return Uint8Array.from([0xff, 0xd8, 0xff, 0xd9, 0x00, 0x01, 0x02, 0x03]);
}

test('catalog-media storage: private upload, signed GET, delete (opt-in)', async (t) => {
  if (!enabled) {
    t.skip('RUN_STORAGE_INTEGRATION is not 1');
    return;
  }

  const missing: string[] = [];
  if (process.env.STORAGE_PROVIDER !== 'supabase') missing.push('STORAGE_PROVIDER=supabase');
  if (!process.env.SUPABASE_URL?.trim()) missing.push('SUPABASE_URL');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length > 0) {
    throw new Error(
      `RUN_STORAGE_INTEGRATION=1 but configuration is missing: ${missing.join(', ')}`,
    );
  }

  const env = loadEnv({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV === 'production' ? 'production' : 'test',
    STORAGE_PROVIDER: 'supabase',
    SUPABASE_JWT_SECRET:
      process.env.SUPABASE_JWT_SECRET ?? 'test-only-helm-jwt-secret-min-32-chars!!',
  });

  const storage = new SupabaseStorageAdapter(env);
  const objectPath = `destinations/${randomUUID()}/cover/${randomUUID()}.jpg`;
  const body = jpegBytes();
  let uploadedUrl: string | undefined;

  try {
    await storage.uploadPrivateObject({
      bucket: CATALOG_MEDIA_BUCKET,
      path: objectPath,
      body,
      contentType: 'image/jpeg',
      upsert: false,
    });
    uploadedUrl = await storage.createSignedDownloadUrl(objectPath, 60, CATALOG_MEDIA_BUCKET);
    const unsigned = await fetch(storage.publicObjectUrl(CATALOG_MEDIA_BUCKET, objectPath));
    assert.equal(unsigned.ok, false, 'unsigned object URL must be blocked');

    const getRes = await fetch(uploadedUrl);
    assert.equal(getRes.ok, true, `signed GET failed: ${getRes.status}`);
    const got = new Uint8Array(await getRes.arrayBuffer());
    assert.equal(got.byteLength, body.byteLength);
    assert.equal(got[0], 0xff);
    assert.equal(got[1], 0xd8);

    await storage.removeObject(CATALOG_MEDIA_BUCKET, objectPath);
    const afterDelete = await fetch(uploadedUrl, { cache: 'no-store' });
    assert.equal(
      afterDelete.ok,
      false,
      `public object still reachable after delete (status ${afterDelete.status})`,
    );
    uploadedUrl = undefined;
  } finally {
    try {
      await storage.removeObject(CATALOG_MEDIA_BUCKET, objectPath);
    } catch (err) {
      if (uploadedUrl) {
        console.error('catalog-media storage cleanup failed after test body error', err);
      }
    }
  }
});
