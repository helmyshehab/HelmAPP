/**
 * D9 operator authz — real Nest HTTP against DATABASE_URL.
 *
 * Boots AppModule (JwtAuthGuard + RolesGuard + DB roles), issues mock JWTs for
 * seeded staff users, and drives /v1/admin/catalog/* with fetch.
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../src/infrastructure/adapters/drizzle/schema.ts';

const databaseUrl = process.env.DATABASE_URL;
const jwtSecret =
  process.env.SUPABASE_JWT_SECRET ?? 'test-only-helm-jwt-secret-min-32-chars!!';

const OPERATOR_ID = '66666666-6666-6666-6666-666666666666';
const ADMIN_ID = '77777777-7777-7777-7777-777777777777';

type Json = Record<string, unknown>;

async function httpJson(
  baseUrl: string,
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<{ status: number; json: Json }> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
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

test('operator HTTP 403 on published destination mutations via Nest guards', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  // Disposable local database: create, migrate+seed, drop in finally.
  const adminSql = postgres(databaseUrl, { max: 1 });
  const disposableDb = `helm_d9_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  let disposableUrl = '';
  let app: { getUrl(): Promise<string>; close(): Promise<void>; get<T>(token: unknown): T } | undefined;
  let fixtureSql: ReturnType<typeof postgres> | undefined;
  let nestDrizzleClient: { end: (opts?: object) => Promise<void> } | undefined;
  let primaryError: unknown;

  try {
    await adminSql.unsafe(`create database "${disposableDb}"`);
    const u = new URL(databaseUrl);
    u.pathname = `/${disposableDb}`;
    disposableUrl = u.toString();

    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    execFileSync(path.join(repoRoot, 'scripts/apply-migrations.sh'), {
      env: {
        ...process.env,
        DATABASE_URL: disposableUrl,
        SEED: 'true',
        MIGRATION_MODE: 'plain-postgres',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Existing test configuration — must be set before AppModule loads forRoot().
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
    const operatorToken = await auth.issueAccessToken({
      userId: OPERATOR_ID,
      email: 'demo.operator@helm.local',
    });
    const adminToken = await auth.issueAccessToken({
      userId: ADMIN_ID,
      email: 'demo.admin@helm.local',
    });

    fixtureSql = postgres(disposableUrl, { max: 1 });
    const db = drizzle(fixtureSql, { schema });

    const runId = `d9${Date.now()}`;
    const slug = `d9-dest-${runId}`;
    const tagKeep = `d9-keep-${runId}`;
    const tagAttack = `d9-attack-${runId}`;
    const importKey = `d9:import-${runId}`;
    const importSlug = `d9-import-${runId}`;

    await db.execute(sql`
      insert into geo.countries (code, name_en, name_ar, default_currency, is_active)
      values ('EG', 'Egypt', 'مصر', 'EGP', true)
      on conflict (code) do update set is_active = true
    `);
    await db.execute(sql`
      insert into catalog.tags (slug, name_en, name_ar, is_active)
      values
        (${tagKeep}, 'Keep', 'ك', true),
        (${tagAttack}, 'Attack', 'ه', true)
      on conflict (slug) do nothing
    `);

    // Admin creates + publishes via HTTP (valid requests through guards).
    const created = await httpJson(baseUrl, 'POST', '/v1/admin/catalog/destinations', adminToken, {
      slug,
      nameEn: 'D9 Published Dest',
      nameAr: 'وجهة د9',
      countryCode: 'EG',
      summaryEn: 'Baseline summary',
      tagSlugs: [tagKeep],
    });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const id = String(created.json.id);
    assert.ok(id);

    for (const to of ['pending_verification', 'verified', 'approved', 'published'] as const) {
      const tr = await httpJson(
        baseUrl,
        'POST',
        `/v1/admin/catalog/destinations/${id}/transition`,
        adminToken,
        { to },
      );
      assert.equal(tr.status, 201, `transition ${to}: ${JSON.stringify(tr.json)}`);
      assert.equal(tr.json.lifecycleStatus, to);
    }

    // Operator can read published destination — proves authn + staff role guards work.
    const staffGot = await httpJson(
      baseUrl,
      'GET',
      `/v1/admin/catalog/destinations/${id}`,
      operatorToken,
    );
    assert.equal(staffGot.status, 200, JSON.stringify(staffGot.json));
    assert.equal(staffGot.json.lifecycleStatus, 'published');
    assert.equal(staffGot.json.nameEn, 'D9 Published Dest');
    assert.deepEqual(
      ((staffGot.json.tags as { slug: string }[]) ?? []).map((x) => x.slug),
      [tagKeep],
    );

    const snapshotRows = await db.execute(sql`
      select name_en as "nameEn",
             summary_en as "summaryEn",
             lifecycle_status as "lifecycleStatus"
      from catalog.destinations
      where id = ${id}::uuid
    `);
    const snap = (snapshotRows as unknown as {
      nameEn: string;
      summaryEn: string | null;
      lifecycleStatus: string;
    }[])[0];
    assert.ok(snap);
    const tagSnap = await db.execute(sql`
      select t.slug
      from catalog.destination_tags dt
      join catalog.tags t on t.id = dt.tag_id
      where dt.destination_id = ${id}::uuid
      order by t.slug
    `);
    const tagSlugsBefore = (tagSnap as unknown as { slug: string }[]).map((r) => r.slug);

    // Valid mutation requests as operator → HTTP 403 each.
    const patchDenied = await httpJson(
      baseUrl,
      'PATCH',
      `/v1/admin/catalog/destinations/${id}`,
      operatorToken,
      { nameEn: 'Hacked Name', summaryEn: 'Should not stick' },
    );
    assert.equal(patchDenied.status, 403, JSON.stringify(patchDenied.json));
    assert.equal(patchDenied.json.code, 'FORBIDDEN');

    const tagsDenied = await httpJson(
      baseUrl,
      'PUT',
      `/v1/admin/catalog/destinations/${id}/tags`,
      operatorToken,
      { tagSlugs: [tagAttack] },
    );
    assert.equal(tagsDenied.status, 403, JSON.stringify(tagsDenied.json));
    assert.equal(tagsDenied.json.code, 'FORBIDDEN');

    const archiveDenied = await httpJson(
      baseUrl,
      'POST',
      `/v1/admin/catalog/destinations/${id}/transition`,
      operatorToken,
      { to: 'archived' },
    );
    assert.equal(archiveDenied.status, 403, JSON.stringify(archiveDenied.json));
    assert.equal(archiveDenied.json.code, 'FORBIDDEN');

    const importPayload = {
      formatVersion: 'helm.catalog.import.v1',
      sourceLabel: 'd9-authz-http-fixture',
      destinations: [
        {
          externalKey: importKey,
          slug: importSlug,
          nameEn: 'D9 Import Dest',
          nameAr: 'استيراد د9',
          countryCode: 'EG',
          updateIfExists: false,
        },
      ],
      places: [],
    };
    const importDenied = await httpJson(
      baseUrl,
      'POST',
      '/v1/admin/catalog/import',
      operatorToken,
      { dryRun: false, payload: importPayload },
    );
    assert.equal(importDenied.status, 403, JSON.stringify(importDenied.json));
    assert.equal(importDenied.json.code, 'FORBIDDEN');

    // Fresh DB reads — destination, tags, import target unchanged.
    const afterDest = await db.execute(sql`
      select name_en as "nameEn",
             summary_en as "summaryEn",
             lifecycle_status as "lifecycleStatus"
      from catalog.destinations
      where id = ${id}::uuid
    `);
    const after = (afterDest as unknown as {
      nameEn: string;
      summaryEn: string | null;
      lifecycleStatus: string;
    }[])[0];
    assert.equal(after.nameEn, snap.nameEn);
    assert.equal(after.summaryEn, snap.summaryEn);
    assert.equal(after.lifecycleStatus, snap.lifecycleStatus);

    const afterTags = await db.execute(sql`
      select t.slug
      from catalog.destination_tags dt
      join catalog.tags t on t.id = dt.tag_id
      where dt.destination_id = ${id}::uuid
      order by t.slug
    `);
    assert.deepEqual(
      (afterTags as unknown as { slug: string }[]).map((r) => r.slug),
      tagSlugsBefore,
    );

    const leakedImport = await db.execute(sql`
      select id from catalog.destinations where external_key = ${importKey} limit 1
    `);
    assert.equal(
      (leakedImport as unknown as unknown[]).length,
      0,
      'operator import apply must not create destinations',
    );

    // Close Nest drizzle pool so the process can exit and the DB can be dropped.
    const drizzleDb = nestApp.get(DRIZZLE) as { $client?: { end: (opts?: object) => Promise<void> } };
    nestDrizzleClient = drizzleDb?.$client;
    if (nestDrizzleClient?.end) {
      await nestDrizzleClient.end({ timeout: 5 });
      nestDrizzleClient = undefined;
    }
    await nestApp.close();
    app = undefined;
  } catch (err) {
    primaryError = err;
  } finally {
    const cleanupErrors: unknown[] = [];

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
    await runCleanup('nestDrizzleClient.end', async () => {
      if (nestDrizzleClient?.end) await nestDrizzleClient.end({ timeout: 5 });
    });
    await runCleanup('app.close', async () => {
      if (app) await app.close();
    });
    await runCleanup('drop disposable database', async () => {
      // Terminate leftover sessions then drop disposable DB.
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
