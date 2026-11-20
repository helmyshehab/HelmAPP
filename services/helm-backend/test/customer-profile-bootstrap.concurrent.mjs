/**
 * Child-process concurrent bootstrap race.
 * Runs alone so Nest AppModule.forRoot captures this disposable DATABASE_URL.
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../src/infrastructure/adapters/drizzle/schema.ts';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not set');
  process.exit(2);
}

const jwtSecret =
  process.env.SUPABASE_JWT_SECRET ?? 'test-only-helm-jwt-secret-min-32-chars!!';

async function applyMigrationsAndSeed(targetUrl) {
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

async function httpJson(baseUrl, method, pathName, token) {
  const res = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  let json = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }
  return { status: res.status, json };
}

const adminSql = postgres(databaseUrl, { max: 1 });
const disposableDb = `helm_bootstrap_race_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
let disposableUrl = '';
let app;
let fixtureSql;
let nestDrizzleClient;
let primaryError;

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
  nestDrizzleClient = nestApp.get(DRIZZLE);

  fixtureSql = postgres(disposableUrl, { max: 1 });
  const db = drizzle(fixtureSql, { schema });

  const customerId = randomUUID();
  const token = await auth.issueAccessToken({
    userId: customerId,
    email: `race.${customerId.slice(0, 8)}@helm.local`,
  });

  const [a, b] = await Promise.all([
    httpJson(baseUrl, 'POST', '/v1/customer/profile/bootstrap', token),
    httpJson(baseUrl, 'POST', '/v1/customer/profile/bootstrap', token),
  ]);

  assert.equal(a.status, 200, JSON.stringify(a.json));
  assert.equal(b.status, 200, JSON.stringify(b.json));
  assert.equal(a.json.userId, customerId);
  assert.equal(b.json.userId, customerId);

  const accountCount = await db.execute(sql`
    select count(*)::int as c from identity.user_accounts where id = ${customerId}::uuid
  `);
  const profileCount = await db.execute(sql`
    select count(*)::int as c from identity.customer_profiles where user_id = ${customerId}::uuid
  `);
  assert.equal(Number(accountCount[0]?.c ?? 0), 1);
  assert.equal(Number(profileCount[0]?.c ?? 0), 1);

  console.log('concurrent bootstrap ok');
} catch (err) {
  primaryError = err;
} finally {
  const cleanupErrors = [];

  const runCleanup = async (label, fn) => {
    try {
      await fn();
    } catch (err) {
      cleanupErrors.push(err instanceof Error ? err : new Error(`${label}: ${String(err)}`));
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
