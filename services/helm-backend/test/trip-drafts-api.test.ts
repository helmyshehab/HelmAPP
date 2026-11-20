/**
 * Trip drafts API — real Nest HTTP against disposable Postgres.
 *
 * A creates/lists/opens/edits a draft. B cannot see it; B's GET/PATCH are 404
 * and leave A's row unchanged. Missing bearer returns 401.
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

test('trip drafts: owner CRUD, cross-owner 404, denied PATCH unchanged, 401 without token', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const adminSql = postgres(databaseUrl, { max: 1 });
  const disposableDb = `helm_trip_drafts_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
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

    const noToken = await httpJson(baseUrl, 'GET', '/v1/trips/drafts');
    assert.equal(noToken.status, 401);

    const created = await httpJson(baseUrl, 'POST', '/v1/trips/drafts', tokenA, {
      destinationId: SEEDED_DESTINATION_ID,
      title: 'Cairo weekend',
      constraints: { party: 2, pace: 'relaxed', budget: { currency: 'EGP', max: 15000 } },
    });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    assert.equal(created.json.status, 'draft');
    assert.equal(created.json.title, 'Cairo weekend');
    assert.equal(created.json.destinationId, SEEDED_DESTINATION_ID);
    assert.equal(typeof created.json.id, 'string');
    const draftId = String(created.json.id);
    const constraints = created.json.constraints as Record<string, unknown>;
    assert.equal(constraints.party, 2);

    const listA = await httpJson(baseUrl, 'GET', '/v1/trips/drafts', tokenA);
    assert.equal(listA.status, 200, JSON.stringify(listA.json));
    const itemsA = listA.json.items as Json[];
    assert.equal(itemsA.length, 1);
    assert.equal(itemsA[0]?.id, draftId);

    const getA = await httpJson(baseUrl, 'GET', `/v1/trips/drafts/${draftId}`, tokenA);
    assert.equal(getA.status, 200, JSON.stringify(getA.json));
    assert.equal(getA.json.title, 'Cairo weekend');

    const patched = await httpJson(baseUrl, 'PATCH', `/v1/trips/drafts/${draftId}`, tokenA, {
      title: 'Istanbul long weekend',
      constraints: { party: 3, pace: 'busy' },
    });
    assert.equal(patched.status, 200, JSON.stringify(patched.json));
    assert.equal(patched.json.title, 'Istanbul long weekend');
    assert.equal(patched.json.destinationId, SEEDED_DESTINATION_ID);
    assert.equal(patched.json.status, 'draft');
    const patchedConstraints = patched.json.constraints as Record<string, unknown>;
    assert.equal(patchedConstraints.party, 3);
    assert.equal(patchedConstraints.pace, 'busy');
    assert.equal(patchedConstraints.budget, undefined);

    // Explicit null clears nullable fields; omitted constraints are preserved.
    const cleared = await httpJson(baseUrl, 'PATCH', `/v1/trips/drafts/${draftId}`, tokenA, {
      title: null,
      destinationId: null,
    });
    assert.equal(cleared.status, 200, JSON.stringify(cleared.json));
    assert.equal(cleared.json.title, null);
    assert.equal(cleared.json.destinationId, null);
    assert.equal(cleared.json.status, 'draft');
    const clearedConstraints = cleared.json.constraints as Record<string, unknown>;
    assert.equal(clearedConstraints.party, 3);
    assert.equal(clearedConstraints.pace, 'busy');
    assert.deepEqual(clearedConstraints, { party: 3, pace: 'busy' });

    const listB = await httpJson(baseUrl, 'GET', '/v1/trips/drafts', tokenB);
    assert.equal(listB.status, 200, JSON.stringify(listB.json));
    const itemsB = listB.json.items as Json[];
    assert.equal(itemsB.length, 0);

    const getB = await httpJson(baseUrl, 'GET', `/v1/trips/drafts/${draftId}`, tokenB);
    assert.equal(getB.status, 404);

    const beforeDenied = await fixtureDb.execute(sql`
      select title, constraints_json::text as constraints, destination_id::text as destination_id
      from trips.trip_drafts
      where id = ${draftId}::uuid
    `);
    const beforeRow = (Array.isArray(beforeDenied) ? beforeDenied : [])[0] as
      | { title?: string | null; constraints?: string; destination_id?: string | null }
      | undefined;
    assert.ok(beforeRow);
    assert.equal(beforeRow.title, null);
    assert.equal(beforeRow.destination_id, null);

    const patchB = await httpJson(baseUrl, 'PATCH', `/v1/trips/drafts/${draftId}`, tokenB, {
      title: 'Hijacked title',
      constraints: { party: 99 },
    });
    assert.equal(patchB.status, 404);

    const afterDenied = await fixtureDb.execute(sql`
      select title, constraints_json::text as constraints, destination_id::text as destination_id
      from trips.trip_drafts
      where id = ${draftId}::uuid
    `);
    const afterRow = (Array.isArray(afterDenied) ? afterDenied : [])[0] as
      | { title?: string | null; constraints?: string; destination_id?: string | null }
      | undefined;
    assert.ok(afterRow);
    assert.equal(afterRow.title, beforeRow.title);
    assert.equal(afterRow.constraints, beforeRow.constraints);
    assert.equal(afterRow.destination_id, beforeRow.destination_id);

    const getAAgain = await httpJson(baseUrl, 'GET', `/v1/trips/drafts/${draftId}`, tokenA);
    assert.equal(getAAgain.status, 200);
    assert.equal(getAAgain.json.title, null);
    assert.equal(getAAgain.json.destinationId, null);
    assert.deepEqual(getAAgain.json.constraints, { party: 3, pace: 'busy' });
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
