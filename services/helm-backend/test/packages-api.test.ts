/**
 * Packages API — public list hides unpublished/legacy; publish validates Ubud places.
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../src/infrastructure/adapters/drizzle/schema.ts';

const databaseUrl = process.env.DATABASE_URL;
const jwtSecret =
  process.env.SUPABASE_JWT_SECRET ?? 'test-only-helm-jwt-secret-min-32-chars!!';
const ADMIN_ID = '77777777-7777-7777-7777-777777777777';

type Json = Record<string, unknown>;

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

async function applyMigrationsAndSeed(targetUrl: string) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const migrationsDir = path.join(repoRoot, 'supabase/migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
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

test('packages: unpublished hidden; publish validates; edits require unpublish', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const adminSql = postgres(databaseUrl, { max: 1 });
  const disposableDb = `helm_packages_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  let disposableUrl = '';
  let app: { getUrl(): Promise<string>; close(): Promise<void>; get<T>(token: unknown): T } | undefined;
  let fixtureSql: ReturnType<typeof postgres> | undefined;
  let nestDrizzleClient: { end: (opts?: object) => Promise<void> } | undefined;

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
    nestDrizzleClient = nestApp.get(DRIZZLE) as unknown as {
      end: (opts?: object) => Promise<void>;
    };
    const adminToken = await auth.issueAccessToken({
      userId: ADMIN_ID,
      email: 'demo.admin@helm.local',
    });

    fixtureSql = postgres(disposableUrl, { max: 1 });
    const db = drizzle(fixtureSql, { schema });
    const ubudId = randomUUID();

    await db.execute(sql`
      insert into catalog.destinations (
        id, slug, name_en, name_ar, country_code, lifecycle_status, published_at, tags
      ) values (
        ${ubudId}::uuid, 'ubud', 'Ubud', 'أوبود', 'ID', 'published', now(), array['culture']
      )
    `);
    for (const place of [
      ['ubud-village-hotel', 'Ubud Village Hotel', 'accommodation'],
      ['ubud-moksa', 'Moksa', 'restaurant'],
      ['ubud-sacred-monkey-forest', 'Sacred Monkey Forest', 'attraction'],
    ] as const) {
      await db.execute(sql`
        insert into catalog.places (
          id, destination_id, slug, name_en, name_ar, category,
          lifecycle_status, published_at, external_key
        ) values (
          ${randomUUID()}::uuid, ${ubudId}::uuid, ${place[0]}, ${place[1]}, ${place[1]},
          ${place[2]}::catalog.place_category, 'published', now(),
          ${`test:ubud:${place[0]}`}
        )
      `);
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
  } finally {
    await app?.close();
    await nestDrizzleClient?.end({ timeout: 1 }).catch(() => undefined);
    await fixtureSql?.end({ timeout: 1 }).catch(() => undefined);
    await adminSql.unsafe(`drop database if exists "${disposableDb}"`).catch(() => undefined);
    await adminSql.end({ timeout: 1 }).catch(() => undefined);
  }
});
