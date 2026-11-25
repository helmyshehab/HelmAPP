/**
 * Trip draft itinerary API — read-only GET against disposable Postgres.
 *
 * Owner sees ordered days/items (including empty days / empty itinerary).
 * Missing bearer → 401. Invalid draft id → 400.
 * Non-owner and missing draft → same public 404 problem.
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

const SEEDED_DESTINATION_ID = '11111111-1111-1111-1111-111111111111';

type Json = Record<string, unknown>;

async function applyMigrationsAndSeed(targetUrl: string, seed: boolean) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const migrationsDir = path.join(repoRoot, 'supabase/migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const client = postgres(targetUrl, { max: 1 });
  try {
    for (const file of files) {
      const body = readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.unsafe(body);
    }
    if (seed) {
      const seedBody = readFileSync(path.join(repoRoot, 'supabase/seed.sql'), 'utf8');
      await client.unsafe(seedBody);
    }
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

function publicProblem(json: Json) {
  return {
    type: json.type,
    title: json.title,
    status: json.status,
    detail: json.detail,
    code: json.code,
  };
}

test('trip draft itinerary: ordered days/items, empty cases, 401/400/404 ownership', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const adminSql = postgres(databaseUrl, { max: 1 });
  const disposableDb = `helm_trip_itin_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
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

    await applyMigrationsAndSeed(disposableUrl, true);

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

    fixtureSql = postgres(disposableUrl, { max: 1 });
    const fixtureDb = drizzle(fixtureSql, { schema });

    const userA = randomUUID();
    const userB = randomUUID();
    const tokenA = await auth.issueAccessToken({
      userId: userA,
      email: `a-${userA.slice(0, 8)}@example.com`,
    });
    const tokenB = await auth.issueAccessToken({
      userId: userB,
      email: `b-${userB.slice(0, 8)}@example.com`,
    });

    const bootA = await httpJson(baseUrl, 'POST', '/v1/customer/profile/bootstrap', tokenA);
    assert.equal(bootA.status, 200, JSON.stringify(bootA.json));
    const bootB = await httpJson(baseUrl, 'POST', '/v1/customer/profile/bootstrap', tokenB);
    assert.equal(bootB.status, 200, JSON.stringify(bootB.json));

    const created = await httpJson(baseUrl, 'POST', '/v1/trips/drafts', tokenA, {
      destinationId: SEEDED_DESTINATION_ID,
      title: 'Itinerary draft',
    });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const draftId = String(created.json.id);

    const noToken = await httpJson(
      baseUrl,
      'GET',
      `/v1/trips/drafts/${draftId}/itinerary`,
    );
    assert.equal(noToken.status, 401);

    const invalidId = await httpJson(
      baseUrl,
      'GET',
      '/v1/trips/drafts/not-a-uuid/itinerary',
      tokenA,
    );
    assert.equal(invalidId.status, 400, JSON.stringify(invalidId.json));
    assert.equal(invalidId.json.code, 'VALIDATION_FAILED');
    assert.equal(invalidId.json.status, 400);

    const empty = await httpJson(
      baseUrl,
      'GET',
      `/v1/trips/drafts/${draftId}/itinerary`,
      tokenA,
    );
    assert.equal(empty.status, 200, JSON.stringify(empty.json));
    assert.deepEqual(empty.json.days, []);

    // Insert out of position order so the API must sort ascending.
    const day2Id = randomUUID();
    const day1Id = randomUUID();
    await fixtureDb.execute(sql`
      insert into trips.itinerary_days (id, draft_id, position, label)
      values
        (${day2Id}::uuid, ${draftId}::uuid, 2, null),
        (${day1Id}::uuid, ${draftId}::uuid, 1, 'Arrival')
    `);

    const item12Id = randomUUID();
    const item11Id = randomUUID();
    await fixtureDb.execute(sql`
      insert into trips.itinerary_items (id, day_id, position, title, notes)
      values
        (${item12Id}::uuid, ${day1Id}::uuid, 2, 'Dinner', null),
        (${item11Id}::uuid, ${day1Id}::uuid, 1, null, 'Hotel check-in notes')
    `);
    // day2 intentionally has no items.

    const ordered = await httpJson(
      baseUrl,
      'GET',
      `/v1/trips/drafts/${draftId}/itinerary`,
      tokenA,
    );
    assert.equal(ordered.status, 200, JSON.stringify(ordered.json));
    const days = ordered.json.days as Json[];
    assert.equal(days.length, 2);

    assert.equal(days[0]?.id, day1Id);
    assert.equal(days[0]?.position, 1);
    assert.equal(days[0]?.label, 'Arrival');
    const day1Items = days[0]?.items as Json[];
    assert.equal(day1Items.length, 2);
    assert.equal(day1Items[0]?.id, item11Id);
    assert.equal(day1Items[0]?.position, 1);
    assert.equal(day1Items[0]?.title, null);
    assert.equal(day1Items[0]?.notes, 'Hotel check-in notes');
    assert.equal(day1Items[1]?.id, item12Id);
    assert.equal(day1Items[1]?.position, 2);
    assert.equal(day1Items[1]?.title, 'Dinner');
    assert.equal(day1Items[1]?.notes, null);

    assert.equal(days[1]?.id, day2Id);
    assert.equal(days[1]?.position, 2);
    assert.equal(days[1]?.label, null);
    assert.deepEqual(days[1]?.items, []);

    const nonOwner = await httpJson(
      baseUrl,
      'GET',
      `/v1/trips/drafts/${draftId}/itinerary`,
      tokenB,
    );
    assert.equal(nonOwner.status, 404, JSON.stringify(nonOwner.json));

    const missing = await httpJson(
      baseUrl,
      'GET',
      `/v1/trips/drafts/${randomUUID()}/itinerary`,
      tokenA,
    );
    assert.equal(missing.status, 404, JSON.stringify(missing.json));
    assert.deepEqual(publicProblem(nonOwner.json), publicProblem(missing.json));
    assert.equal(nonOwner.json.code, 'NOT_FOUND');
    assert.equal(nonOwner.json.status, 404);
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
    await runCleanup('nestDrizzleClient.end', async () => {
      if (nestDrizzleClient?.end) await nestDrizzleClient.end({ timeout: 5 });
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
