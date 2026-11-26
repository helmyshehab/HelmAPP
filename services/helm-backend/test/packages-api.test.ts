/**
 * Packages API — public list hides unpublished/legacy; publish validates destination places.
 * Covers legacy ubud_trip_preview and shared trip_preview (Istanbul).
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
import { sql } from 'drizzle-orm';
import * as schema from '../src/infrastructure/adapters/drizzle/schema.ts';
import { listPlainPostgresMigrationFiles } from './support/plain-postgres-migrations.ts';

const databaseUrl = process.env.DATABASE_URL;
const jwtSecret =
  process.env.SUPABASE_JWT_SECRET ?? 'test-only-helm-jwt-secret-min-32-chars!!';
const ADMIN_ID = '77777777-7777-7777-7777-777777777777';

type Json = Record<string, unknown>;
type SqlClient = ReturnType<typeof postgres>;

const packageContent = {
  kind: 'ubud_trip_preview',
  version: 1,
  answers: {
    budgetEgp: 85000,
    destination: 'ubud',
    travelerCount: 2,
    lifestyle: 'culture',
    nights: 2,
    amenities: ['Pool'],
  },
  selections: {
    flightId: 'economy-example',
    hotelSlug: 'ubud-village-hotel',
    includedActivitySlugs: ['ubud-sacred-monkey-forest'],
  },
  itinerary: {
    days: [
      { dayNumber: 1, stopSlugs: ['ubud-sacred-monkey-forest', 'ubud-moksa'] },
      { dayNumber: 2, stopSlugs: ['ubud-moksa'] },
    ],
  },
};

const istanbulPackageContent = {
  kind: 'trip_preview',
  version: 1,
  answers: {
    budgetEgp: 90000,
    destination: 'istanbul',
    travelerCount: 2,
    lifestyle: 'culture',
    nights: 3,
    amenities: ['Breakfast included'],
  },
  selections: {
    flightId: 'economy-example',
    hotelSlug: 'istanbul-ajia-hotel',
    includedActivitySlugs: ['hagia-sophia-exterior'],
  },
  itinerary: {
    days: [
      { dayNumber: 1, stopSlugs: ['hagia-sophia-exterior', 'istanbul-grand-bazaar'] },
      { dayNumber: 2, stopSlugs: ['istanbul-galata-tower'] },
      { dayNumber: 3, stopSlugs: ['hagia-sophia-exterior'] },
    ],
  },
};

async function promotePlaceToPublished(
  db: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> },
  placeId: string,
) {
  for (const step of [
    sql`update catalog.places set lifecycle_status = 'pending_verification' where id = ${placeId}::uuid`,
    sql`update catalog.places set lifecycle_status = 'verified', verified_at = now() where id = ${placeId}::uuid`,
    sql`update catalog.places set lifecycle_status = 'approved', approved_at = now() where id = ${placeId}::uuid`,
    sql`update catalog.places set lifecycle_status = 'published', published_at = now() where id = ${placeId}::uuid`,
  ]) {
    await db.execute(step);
  }
}

async function applyMigrationsAndSeed(targetUrl: string) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const migrationsDir = path.join(repoRoot, 'supabase/migrations');
  const files = listPlainPostgresMigrationFiles(repoRoot);
  const client = postgres(targetUrl, { max: 1 });
  try {
    for (const file of files) {
      const body = readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.unsafe(body);
    }
    await client.unsafe(readFileSync(path.join(repoRoot, 'supabase/seed.sql'), 'utf8'));
  } finally {
    await client.end({ timeout: 5 });
  }
}

async function httpJson(
  baseUrl: string,
  method: string,
  pathName: string,
  token?: string,
  body?: unknown,
): Promise<{ status: number; json: Json }> {
  const res = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: Json = {};
  if (text) {
    try {
      json = JSON.parse(text) as Json;
    } catch {
      json = { raw: text };
    }
  }
  return { status: res.status, json };
}

function nestPostgresClient(db: unknown): SqlClient | undefined {
  if (!db || typeof db !== 'object') return undefined;
  const client = (db as { $client?: SqlClient }).$client;
  return typeof client?.end === 'function' ? client : undefined;
}

test('packages: unpublished hidden; publish validates; edits require unpublish', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const adminSql = postgres(databaseUrl, { max: 1 });
  const disposableDb = `helm_packages_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  let disposableUrl = '';
  let app: { close(): Promise<void> } | undefined;
  let fixtureSql: SqlClient | undefined;
  let nestSql: SqlClient | undefined;
  let primaryError: unknown;

  try {
    await adminSql.unsafe(`create database "${disposableDb}"`);
    const u = new URL(databaseUrl);
    u.pathname = `/${disposableDb}`;
    disposableUrl = u.toString();
    await applyMigrationsAndSeed(disposableUrl);

    process.env.NODE_ENV = 'test';
    process.env.AUTH_PROVIDER = 'mock';
    process.env.SUPABASE_JWT_SECRET = jwtSecret;
    process.env.SUPABASE_JWT_AUDIENCE = process.env.SUPABASE_JWT_AUDIENCE ?? 'authenticated';
    process.env.DATABASE_URL = disposableUrl;
    process.env.LOG_LEVEL = 'error';
    process.env.API_VERSION = 'v1';
    process.env.AI_PROVIDER = 'mock';
    process.env.PAYMENT_PROVIDER = 'mock';
    process.env.FLIGHT_PROVIDER = 'mock';
    process.env.NOTIFY_PROVIDER = 'console';

    const { NestFactory } = await import('@nestjs/core');
    const { AppModule } = await import('../src/app.module.ts');
    const { MockAuthAdapter } = await import(
      '../src/infrastructure/adapters/mock/mock-auth.adapter.ts'
    );
    const { DRIZZLE } = await import('../src/infrastructure/adapters/drizzle/drizzle.client.ts');

    const nestApp = await NestFactory.create(AppModule, { logger: false });
    nestApp.setGlobalPrefix('v1');
    await nestApp.listen(0, '127.0.0.1');
    app = nestApp;
    const baseUrl = await nestApp.getUrl();
    const auth = nestApp.get(MockAuthAdapter);
    nestSql = nestPostgresClient(nestApp.get(DRIZZLE));
    const adminToken = await auth.issueAccessToken({
      userId: ADMIN_ID,
      email: 'demo.admin@helm.local',
    });

    fixtureSql = postgres(disposableUrl, { max: 1 });
    const db = drizzle(fixtureSql, { schema });
    const ubudId = randomUUID();

    // Seed has TR/GE/EG only — Ubud needs Indonesia + IDR before destination insert.
    await db.execute(sql`
      insert into pricing.currencies (code, name_en, name_ar, minor_units)
      values ('IDR', 'Indonesian Rupiah', 'روبية إندونيسية', 2)
      on conflict (code) do nothing
    `);
    await db.execute(sql`
      insert into geo.countries (code, name_en, name_ar, default_currency)
      values ('ID', 'Indonesia', 'إندونيسيا', 'IDR')
      on conflict (code) do nothing
    `);

    // Lifecycle trigger forbids creating destinations/places as published.
    await db.execute(sql`
      insert into catalog.destinations (
        id, slug, name_en, name_ar, country_code, lifecycle_status, tags
      ) values (
        ${ubudId}::uuid, 'ubud', 'Ubud', 'أوبود', 'ID', 'draft', array['culture']
      )
    `);
    for (const step of [
      sql`update catalog.destinations set lifecycle_status = 'pending_verification' where id = ${ubudId}::uuid`,
      sql`update catalog.destinations set lifecycle_status = 'verified', verified_at = now() where id = ${ubudId}::uuid`,
      sql`update catalog.destinations set lifecycle_status = 'approved', approved_at = now() where id = ${ubudId}::uuid`,
      sql`update catalog.destinations set lifecycle_status = 'published', published_at = now() where id = ${ubudId}::uuid`,
    ]) {
      await db.execute(step);
    }
    for (const place of [
      ['ubud-village-hotel', 'Ubud Village Hotel', 'accommodation'],
      ['ubud-moksa', 'Moksa', 'restaurant'],
      ['ubud-sacred-monkey-forest', 'Sacred Monkey Forest', 'attraction'],
    ] as const) {
      const placeId = randomUUID();
      await db.execute(sql`
        insert into catalog.places (
          id, destination_id, slug, name_en, name_ar, category,
          lifecycle_status, external_key
        ) values (
          ${placeId}::uuid, ${ubudId}::uuid, ${place[0]}, ${place[1]}, ${place[1]},
          ${place[2]}::catalog.place_category, 'draft',
          ${`test:ubud:${place[0]}`}
        )
      `);
      await promotePlaceToPublished(db, placeId);
    }

    // Seed already published Hagia Sophia; add hotel + stops for Istanbul Customize.
    const istanbulDestinationId = '11111111-1111-1111-1111-111111111111';
    for (const place of [
      ['istanbul-ajia-hotel', 'Ajia Hotel', 'accommodation'],
      ['istanbul-grand-bazaar', 'Grand Bazaar', 'attraction'],
      ['istanbul-galata-tower', 'Galata Tower', 'attraction'],
    ] as const) {
      const placeId = randomUUID();
      await db.execute(sql`
        insert into catalog.places (
          id, destination_id, slug, name_en, name_ar, category,
          lifecycle_status, external_key
        ) values (
          ${placeId}::uuid, ${istanbulDestinationId}::uuid, ${place[0]}, ${place[1]}, ${place[1]},
          ${place[2]}::catalog.place_category, 'draft',
          ${`test:istanbul:${place[0]}`}
        )
      `);
      await promotePlaceToPublished(db, placeId);
    }

    const publicBefore = await httpJson(baseUrl, 'GET', '/v1/packages');
    assert.equal(publicBefore.status, 200, JSON.stringify(publicBefore.json));
    assert.equal((publicBefore.json.items as unknown[]).length, 0);

    const staffList = await httpJson(baseUrl, 'GET', '/v1/admin/packages', adminToken);
    assert.equal(staffList.status, 200, JSON.stringify(staffList.json));
    const istanbul = (staffList.json.items as Json[]).find(
      (item) => item.slug === 'istanbul-5d-private-stay',
    );
    assert.ok(istanbul, 'legacy Istanbul package must remain');
    assert.equal(istanbul.content, null);

    const created = await httpJson(baseUrl, 'POST', '/v1/admin/packages', adminToken, {
      destinationId: ubudId,
      slug: 'ubud-culture-escape',
      titleEn: 'Ubud culture escape',
      titleAr: 'أوبود',
      summaryEn: 'Demo package',
      content: packageContent,
    });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const packageId = String(created.json.id);
    assert.equal(created.json.publishStatus, 'unpublished');
    assert.equal(created.json.durationDays, 2);

    const stillHidden = await httpJson(baseUrl, 'GET', '/v1/packages');
    assert.equal((stillHidden.json.items as unknown[]).length, 0);

    const published = await httpJson(
      baseUrl,
      'POST',
      `/v1/admin/packages/${packageId}/publish`,
      adminToken,
    );
    assert.equal(published.status, 200, JSON.stringify(published.json));
    assert.equal(published.json.publishStatus, 'published');

    const publicAfter = await httpJson(baseUrl, 'GET', '/v1/packages');
    assert.equal((publicAfter.json.items as Json[]).length, 1);
    assert.equal((publicAfter.json.items as Json[])[0]?.slug, 'ubud-culture-escape');

    const blockedEdit = await httpJson(
      baseUrl,
      'PATCH',
      `/v1/admin/packages/${packageId}`,
      adminToken,
      { titleEn: 'Changed while published' },
    );
    assert.equal(blockedEdit.status, 409, JSON.stringify(blockedEdit.json));

    const unpublished = await httpJson(
      baseUrl,
      'POST',
      `/v1/admin/packages/${packageId}/unpublish`,
      adminToken,
    );
    assert.equal(unpublished.status, 200, JSON.stringify(unpublished.json));

    const hiddenAgain = await httpJson(baseUrl, 'GET', '/v1/packages');
    assert.equal((hiddenAgain.json.items as unknown[]).length, 0);

    const edited = await httpJson(
      baseUrl,
      'PATCH',
      `/v1/admin/packages/${packageId}`,
      adminToken,
      {
        titleEn: 'Ubud culture escape v2',
        content: {
          ...packageContent,
          answers: { ...packageContent.answers, budgetEgp: 90000 },
        },
      },
    );
    assert.equal(edited.status, 200, JSON.stringify(edited.json));
    assert.equal(edited.json.titleEn, 'Ubud culture escape v2');

    const republished = await httpJson(
      baseUrl,
      'POST',
      `/v1/admin/packages/${packageId}/publish`,
      adminToken,
    );
    assert.equal(republished.status, 200, JSON.stringify(republished.json));
    const latest = await httpJson(baseUrl, 'GET', '/v1/packages/ubud-culture-escape');
    assert.equal(latest.status, 200, JSON.stringify(latest.json));
    assert.equal(latest.json.titleEn, 'Ubud culture escape v2');
    assert.equal(
      ((latest.json.content as Json).answers as Json).budgetEgp,
      90000,
    );

    // Istanbul trip_preview package (new slug; legacy null-content row stays hidden).
    const istanbulCreated = await httpJson(baseUrl, 'POST', '/v1/admin/packages', adminToken, {
      destinationId: istanbulDestinationId,
      slug: 'istanbul-bosphorus-escape',
      titleEn: 'Istanbul Bosphorus escape',
      titleAr: 'إسطنبول — رحلة البوسفور',
      summaryEn: 'Three nights with Hagia Sophia and the Grand Bazaar.',
      content: istanbulPackageContent,
    });
    assert.equal(istanbulCreated.status, 201, JSON.stringify(istanbulCreated.json));
    const istanbulPackageId = String(istanbulCreated.json.id);
    assert.equal(istanbulCreated.json.publishStatus, 'unpublished');
    assert.equal(istanbulCreated.json.durationDays, 3);

    const istanbulPublishBlockedWrongPlace = await httpJson(
      baseUrl,
      'POST',
      `/v1/admin/packages/${istanbulPackageId}/publish`,
      adminToken,
    );
    // Places exist — should succeed.
    assert.equal(
      istanbulPublishBlockedWrongPlace.status,
      200,
      JSON.stringify(istanbulPublishBlockedWrongPlace.json),
    );

    const publicWithIstanbul = await httpJson(baseUrl, 'GET', '/v1/packages');
    assert.equal(publicWithIstanbul.status, 200, JSON.stringify(publicWithIstanbul.json));
    const publicSlugs = (publicWithIstanbul.json.items as Json[]).map((item) => item.slug);
    assert.ok(publicSlugs.includes('ubud-culture-escape'));
    assert.ok(publicSlugs.includes('istanbul-bosphorus-escape'));
    assert.ok(!publicSlugs.includes('istanbul-5d-private-stay'));

    const istanbulGet = await httpJson(baseUrl, 'GET', '/v1/packages/istanbul-bosphorus-escape');
    assert.equal(istanbulGet.status, 200, JSON.stringify(istanbulGet.json));
    assert.equal((istanbulGet.json.content as Json).kind, 'trip_preview');
    assert.equal(((istanbulGet.json.content as Json).answers as Json).destination, 'istanbul');

    // Reject publish when content destination does not match package destination.
    const mismatched = await httpJson(baseUrl, 'POST', '/v1/admin/packages', adminToken, {
      destinationId: istanbulDestinationId,
      slug: 'istanbul-wrong-content',
      titleEn: 'Mismatch',
      titleAr: 'Mismatch',
      content: packageContent,
    });
    assert.equal(mismatched.status, 201, JSON.stringify(mismatched.json));
    const mismatchPublish = await httpJson(
      baseUrl,
      'POST',
      `/v1/admin/packages/${String(mismatched.json.id)}/publish`,
      adminToken,
    );
    assert.equal(mismatchPublish.status, 400, JSON.stringify(mismatchPublish.json));
  } catch (err) {
    primaryError = err;
  } finally {
    const cleanupErrors: Error[] = [];
    const runCleanup = async (label: string, fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (err) {
        cleanupErrors.push(
          err instanceof Error ? err : new Error(`${label}: ${String(err)}`),
        );
      }
    };

    await runCleanup('fixtureSql.end', async () => {
      if (fixtureSql) await fixtureSql.end({ timeout: 5 });
    });
    await runCleanup('nestSql.end', async () => {
      if (nestSql) await nestSql.end({ timeout: 5 });
    });
    await runCleanup('app.close', async () => {
      if (app) await app.close();
    });
    await runCleanup('drop disposable database', async () => {
      await adminSql.unsafe(
        `select pg_terminate_backend(pid)
         from pg_stat_activity
         where datname = $1 and pid <> pg_backend_pid()`,
        [disposableDb],
      );
      await adminSql.unsafe(`drop database if exists "${disposableDb}"`);
    });
    await runCleanup('adminSql.end', async () => {
      await adminSql.end({ timeout: 5 });
    });

    if (primaryError && cleanupErrors.length > 0) {
      throw new AggregateError(
        [primaryError, ...cleanupErrors],
        `Test assertion failed and disposable database cleanup also failed (${cleanupErrors.length})`,
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
  }
});
