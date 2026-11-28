/**
 * Destination cover — real Postgres integration (mock object storage).
 *
 * Requires DATABASE_URL. Creates an isolated disposable database, applies
 * plain-postgres migrations + seed, and always drops the disposable DB.
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/infrastructure/adapters/drizzle/schema.ts';
import { AppException } from '../src/common/errors/app.exception.ts';
import { MockStorageAdapter } from '../src/infrastructure/adapters/mock/mock-storage.adapter.ts';
import { CATALOG_MEDIA_BUCKET } from '../src/infrastructure/ports/storage.port.ts';
import type { AuthPrincipal } from '../src/infrastructure/ports/auth.port.ts';
import { AuditService } from '../src/modules/audit/audit.service.ts';
import { CatalogAdminService } from '../src/modules/catalog/application/catalog-admin.service.ts';
import { CatalogRepository } from '../src/modules/catalog/infrastructure/catalog.repository.ts';
import { listPlainPostgresMigrationFiles } from './support/plain-postgres-migrations.ts';

const databaseUrl = process.env.DATABASE_URL;

const adminActor: AuthPrincipal = {
  userId: '77777777-7777-7777-7777-777777777777',
  roles: ['administrator'],
  rolesSource: 'database',
};

function jpegBytes(pad = 0): Uint8Array {
  const body = new Uint8Array(16 + pad);
  body[0] = 0xff;
  body[1] = 0xd8;
  body[2] = 0xff;
  body[3] = 0xd9;
  for (let i = 0; i < pad; i += 1) body[4 + i] = i % 256;
  return body;
}

async function applyPlainMigrationsAndSeed(targetUrl: string) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const migrationsDir = path.join(repoRoot, 'supabase/migrations');
  const files = listPlainPostgresMigrationFiles(repoRoot);
  const client = postgres(targetUrl, { max: 1 });
  try {
    for (const file of files) {
      await client.unsafe(readFileSync(path.join(migrationsDir, file), 'utf8'));
    }
    await client.unsafe(readFileSync(path.join(repoRoot, 'supabase/seed.sql'), 'utf8'));
  } finally {
    await client.end({ timeout: 1 });
  }
}

async function activeCoverRows(
  client: postgres.Sql,
  destinationId: string,
): Promise<Array<{ mediaId: string; storagePath: string }>> {
  const rows = await client`
    select dm.media_id as "mediaId", m.storage_path as "storagePath"
    from catalog.destination_media dm
    join catalog.media_assets m on m.id = dm.media_id
    where dm.destination_id = ${destinationId}::uuid
      and dm.is_active = true
      and dm.is_cover = true
      and m.is_active = true
  `;
  return rows.map((r) => ({
    mediaId: String(r.mediaId),
    storagePath: String(r.storagePath),
  }));
}

test('destination cover DB: concurrency, uniqueness, failure, shared refs, publish unchanged', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  // Refuse non-local hosts — never touch hosted/staging.
  try {
    const host = new URL(databaseUrl).hostname;
    if (host !== '127.0.0.1' && host !== 'localhost') {
      throw new Error(`Refusing non-local DATABASE_URL host: ${host}`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Refusing')) throw err;
    throw new Error('DATABASE_URL must be a local postgresql URL');
  }

  const adminSql = postgres(databaseUrl, { max: 1 });
  const disposableDb = `helm_cover_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  let disposableUrl = '';
  const cleanupErrors: unknown[] = [];
  let primaryError: unknown;

  try {
    await adminSql.unsafe(`create database "${disposableDb}"`);
    const u = new URL(databaseUrl);
    u.pathname = `/${disposableDb}`;
    disposableUrl = u.toString();
    await applyPlainMigrationsAndSeed(disposableUrl);

    const client = postgres(disposableUrl, { max: 4, prepare: false });
    const db = drizzle(client, { schema });
    const repo = new CatalogRepository(db as never);
    const audit = new AuditService(db as never);
    const storage = new MockStorageAdapter();
    const admin = new CatalogAdminService(repo, audit, db as never, storage);

    try {
      const runId = randomUUID().slice(0, 8);
      const slug = `cover-${runId}`;

      await client`
        insert into geo.countries (code, name_en, name_ar, default_currency, is_active)
        values ('EG', 'Egypt', 'مصر', 'EGP', true)
        on conflict (code) do update set is_active = true
      `;

      const created = await admin.createDestination(adminActor, {
        slug,
        nameEn: 'Cover Test',
        nameAr: 'اختبار الغلاف',
        countryCode: 'EG',
      });
      const destId = String(created.id);
      const draft = await admin.uploadDestinationCover(
        adminActor, destId, { buffer: jpegBytes(0), mimetype: 'image/jpeg' }, 'Draft cover',
      );
      assert.match(draft.coverPreviewUrl ?? '', /^mock:\/\/storage\/signed/);
      assert.equal(await repo.getActiveDestinationCover(destId), null);
      await admin.transitionDestination(adminActor, destId, 'pending_verification');
      await admin.transitionDestination(adminActor, destId, 'verified');
      await admin.transitionDestination(adminActor, destId, 'approved');
      const published = await admin.transitionDestination(adminActor, destId, 'published');
      assert.equal(String(published.lifecycleStatus), 'published');
      const publishedAtBefore = String(published.publishedAt);
      assert.ok(publishedAtBefore);

      // --- initial upload ---
      const first = await admin.uploadDestinationCover(
        adminActor,
        destId,
        { buffer: jpegBytes(1), mimetype: 'image/jpeg' },
        'First cover',
        'الغلاف الأول',
      );
      assert.equal(String(first.lifecycleStatus), 'published');
      assert.equal(String(first.publishedAt), publishedAtBefore);

      const coversAfterFirst = await activeCoverRows(client, destId);
      assert.equal(coversAfterFirst.length, 1);
      const firstMediaId = coversAfterFirst[0]!.mediaId;
      const firstPath = coversAfterFirst[0]!.storagePath;
      assert.equal(storage.objects.has(`${CATALOG_MEDIA_BUCKET}:${firstPath}`), true);
      assert.equal((await repo.getActiveDestinationCover(destId))?.storagePath, firstPath);

      // --- concurrent replacements: exactly one active cover ---
      const concurrent = await Promise.allSettled([
        admin.uploadDestinationCover(
          adminActor,
          destId,
          { buffer: jpegBytes(2), mimetype: 'image/jpeg' },
          'Concurrent A',
        ),
        admin.uploadDestinationCover(
          adminActor,
          destId,
          { buffer: jpegBytes(3), mimetype: 'image/jpeg' },
          'Concurrent B',
        ),
      ]);
      const fulfilled = concurrent.filter((r) => r.status === 'fulfilled');
      assert.ok(fulfilled.length >= 1, 'at least one concurrent upload must succeed');
      // Under FOR UPDATE serialization both may succeed; failures must not be unexpected crashes.
      for (const r of concurrent) {
        if (r.status === 'rejected') {
          assert.ok(
            r.reason instanceof AppException,
            `unexpected rejection: ${String(r.reason)}`,
          );
        }
      }
      const coversAfterRace = await activeCoverRows(client, destId);
      assert.equal(coversAfterRace.length, 1, 'exactly one active cover after concurrency');

      const afterRaceDest = await client`
        select lifecycle_status as "lifecycleStatus", published_at as "publishedAt"
        from catalog.destinations where id = ${destId}::uuid
      `;
      assert.equal(String(afterRaceDest[0]!.lifecycleStatus), 'published');
      assert.equal(String(afterRaceDest[0]!.publishedAt), publishedAtBefore);

      // --- failed replacement preserves prior cover ---
      const prior = (await activeCoverRows(client, destId))[0]!;
      const priorObjectCount = storage.objects.size;
      const originalReplace = repo.replaceDestinationCover.bind(repo);
      let failOnce = true;
      repo.replaceDestinationCover = async (input) => {
        if (failOnce) {
          failOnce = false;
          throw AppException.conflict('Injected cover replace failure');
        }
        return originalReplace(input);
      };
      await assert.rejects(
        () =>
          admin.uploadDestinationCover(
            adminActor,
            destId,
            { buffer: jpegBytes(4), mimetype: 'image/jpeg' },
            'Should fail',
          ),
        (err: unknown) => err instanceof AppException && err.code === 'CONFLICT',
      );
      repo.replaceDestinationCover = originalReplace;

      const coversAfterFail = await activeCoverRows(client, destId);
      assert.equal(coversAfterFail.length, 1);
      assert.equal(coversAfterFail[0]!.mediaId, prior.mediaId);
      assert.equal(coversAfterFail[0]!.storagePath, prior.storagePath);
      // Compensating cleanup should not grow orphaned objects beyond prior set in a leaky way;
      // prior object must remain.
      assert.equal(
        storage.objects.has(`${CATALOG_MEDIA_BUCKET}:${prior.storagePath}`),
        true,
      );
      assert.ok(storage.objects.size <= priorObjectCount + 1);

      // --- shared asset reference protection ---
      const sharedCreated = await admin.createDestination(adminActor, {
        slug: `shared-${runId}`,
        nameEn: 'Shared Cover Peer',
        nameAr: 'نظير',
        countryCode: 'EG',
      });
      const sharedDestId = String(sharedCreated.id);
      await admin.transitionDestination(adminActor, sharedDestId, 'pending_verification');
      await admin.transitionDestination(adminActor, sharedDestId, 'verified');
      await admin.transitionDestination(adminActor, sharedDestId, 'approved');
      await admin.transitionDestination(adminActor, sharedDestId, 'published');
      // Link the current cover media to a second destination as an active non-cover ref
      // so countActiveMediaReferences > 0 after dest1 replace deactivates its own link.
      const sharedMediaId = coversAfterFail[0]!.mediaId;
      const sharedPath = coversAfterFail[0]!.storagePath;
      await client`
        insert into catalog.destination_media (
          destination_id, media_id, sort_order, is_cover, is_active
        ) values (
          ${sharedDestId}::uuid, ${sharedMediaId}::uuid, 0, false, true
        )
      `;

      await admin.uploadDestinationCover(
        adminActor,
        destId,
        { buffer: jpegBytes(5), mimetype: 'image/jpeg' },
        'Replacement while shared',
      );

      const coversAfterShared = await activeCoverRows(client, destId);
      assert.equal(coversAfterShared.length, 1);
      assert.notEqual(coversAfterShared[0]!.mediaId, sharedMediaId);

      const sharedAsset = await client`
        select is_active as "isActive", storage_path as "storagePath"
        from catalog.media_assets where id = ${sharedMediaId}::uuid
      `;
      assert.equal(sharedAsset[0]!.isActive, true);
      assert.equal(
        storage.objects.has(`${CATALOG_MEDIA_BUCKET}:${sharedPath}`),
        true,
        'shared storage object must not be deleted',
      );

      const stillLinked = await client`
        select count(*)::int as n from catalog.destination_media
        where media_id = ${sharedMediaId}::uuid and is_active = true
      `;
      assert.ok(Number(stillLinked[0]!.n) >= 1);

      const finalDest = await client`
        select lifecycle_status as "lifecycleStatus", published_at as "publishedAt"
        from catalog.destinations where id = ${destId}::uuid
      `;
      assert.equal(String(finalDest[0]!.lifecycleStatus), 'published');
      assert.equal(String(finalDest[0]!.publishedAt), publishedAtBefore);

      // first cover media may be inactive if unreferenced; ensure we never had >1 active cover
      const activeCoverCount = await client`
        select count(*)::int as n
        from catalog.destination_media
        where destination_id = ${destId}::uuid
          and is_active = true
          and is_cover = true
      `;
      assert.equal(Number(activeCoverCount[0]!.n), 1);

      await admin.transitionDestination(adminActor, destId, 'archived');
      assert.equal(await repo.getActiveDestinationCover(destId), null);

      // silence unused firstMediaId lint-style retention
      assert.ok(firstMediaId);
    } finally {
      await client.end({ timeout: 5 });
    }
  } catch (err) {
    primaryError = err;
  } finally {
    try {
      await adminSql.unsafe(`drop database if exists "${disposableDb}"`);
    } catch (err) {
      cleanupErrors.push(err);
    }
    await adminSql.end({ timeout: 5 });
  }

  if (primaryError && cleanupErrors.length > 0) {
    throw new AggregateError(
      [primaryError, ...cleanupErrors],
      `Cover DB test failed and disposable cleanup also failed (${cleanupErrors.length})`,
    );
  }
  if (primaryError) throw primaryError;
  if (cleanupErrors.length === 1) throw cleanupErrors[0];
  if (cleanupErrors.length > 1) {
    throw new AggregateError(
      cleanupErrors,
      `Disposable database cleanup failed (${cleanupErrors.length})`,
    );
  }
});
