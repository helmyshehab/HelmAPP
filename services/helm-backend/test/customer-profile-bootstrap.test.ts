/**
 * Customer profile bootstrap — real Nest HTTP against DATABASE_URL.
 *
 * Verifies JWT-subject account/profile provisioning is idempotent, does not
 * link by email, returns 401 without a token, and leaves GET /v1/me read-only.
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

type Json = Record<string, unknown>;

async function applyMigrationsAndSeed(targetUrl: string, seed: boolean) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const migrationsDir = path.join(repoRoot, 'supabase/migrations');
  const files = listPlainPostgresMigrationFiles(repoRoot);
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

test('customer profile bootstrap creates once, preserves on repeat, 401 without token', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const adminSql = postgres(databaseUrl, { max: 1 });
  const disposableDb = `helm_bootstrap_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
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
    const db = drizzle(fixtureSql, { schema });

    const customerId = randomUUID();
    const customerEmail = `bootstrap.${customerId.slice(0, 8)}@helm.local`;
    const token = await auth.issueAccessToken({
      userId: customerId,
      email: customerEmail,
    });

    // GET /v1/me is read-only — must not create account/profile rows.
    const meBefore = await httpJson(baseUrl, 'GET', '/v1/me', token);
    assert.equal(meBefore.status, 200);
    assert.equal(meBefore.json.userId, customerId);

    const beforeAccounts = await db.execute(sql`
      select count(*)::int as c from identity.user_accounts where id = ${customerId}::uuid
    `);
    const beforeProfiles = await db.execute(sql`
      select count(*)::int as c from identity.customer_profiles where user_id = ${customerId}::uuid
    `);
    assert.equal(Number((beforeAccounts as unknown as { c: number }[])[0]?.c ?? 0), 0);
    assert.equal(Number((beforeProfiles as unknown as { c: number }[])[0]?.c ?? 0), 0);

    const unauth = await httpJson(baseUrl, 'POST', '/v1/customer/profile/bootstrap');
    assert.equal(unauth.status, 401);

    const first = await httpJson(baseUrl, 'POST', '/v1/customer/profile/bootstrap', token);
    assert.equal(first.status, 200, JSON.stringify(first.json));
    assert.equal(first.json.userId, customerId);
    assert.equal(first.json.accountCreated, true);
    assert.equal(first.json.profileCreated, true);
    assert.equal(first.json.accountStatus, 'active');
    assert.equal(first.json.email, customerEmail);
    assert.equal(first.json.preferredLocale, 'ar');
    assert.equal(first.json.preferredCurrency, 'EGP');

    // Mutate existing rows — repeat bootstrap must preserve them.
    const keptEmail = `kept.${customerId.slice(0, 8)}@helm.local`;
    await db.execute(sql`
      update identity.user_accounts
      set status = 'pending', primary_email = ${keptEmail}
      where id = ${customerId}::uuid
    `);
    await db.execute(sql`
      update identity.customer_profiles
      set display_name = 'Kept Name', preferred_locale = 'en', preferred_currency = 'USD'
      where user_id = ${customerId}::uuid
    `);
    await db.execute(sql`
      insert into identity.user_roles (user_id, role)
      values (${customerId}::uuid, 'operator'::identity.app_role)
    `);

    const second = await httpJson(baseUrl, 'POST', '/v1/customer/profile/bootstrap', token);
    assert.equal(second.status, 200, JSON.stringify(second.json));
    assert.equal(second.json.userId, customerId);
    assert.equal(second.json.accountCreated, false);
    assert.equal(second.json.profileCreated, false);
    assert.equal(second.json.accountStatus, 'pending');
    assert.equal(second.json.email, keptEmail);
    assert.equal(second.json.displayName, 'Kept Name');
    assert.equal(second.json.preferredLocale, 'en');
    assert.equal(second.json.preferredCurrency, 'USD');

    const accountCount = await db.execute(sql`
      select count(*)::int as c from identity.user_accounts where id = ${customerId}::uuid
    `);
    const profileCount = await db.execute(sql`
      select count(*)::int as c from identity.customer_profiles where user_id = ${customerId}::uuid
    `);
    assert.equal(Number((accountCount as unknown as { c: number }[])[0]?.c ?? 0), 1);
    assert.equal(Number((profileCount as unknown as { c: number }[])[0]?.c ?? 0), 1);

    const roles = await db.execute(sql`
      select role::text as role
      from identity.user_roles
      where user_id = ${customerId}::uuid and revoked_at is null
      order by role::text
    `);
    const roleList = (roles as unknown as { role: string }[]).map((r) => r.role);
    assert.deepEqual(roleList, ['operator']);

    // Email collision: another subject keeps their own account; no link by email.
    const otherId = randomUUID();
    const otherToken = await auth.issueAccessToken({
      userId: otherId,
      email: keptEmail,
    });
    const collided = await httpJson(
      baseUrl,
      'POST',
      '/v1/customer/profile/bootstrap',
      otherToken,
    );
    assert.equal(collided.status, 200, JSON.stringify(collided.json));
    assert.equal(collided.json.userId, otherId);
    assert.equal(collided.json.accountCreated, true);
    assert.equal(collided.json.profileCreated, true);
    assert.equal(collided.json.email, null);

    const otherAccount = await db.execute(sql`
      select id::text as id, primary_email::text as email
      from identity.user_accounts
      where id = ${otherId}::uuid
    `);
    assert.equal((otherAccount as unknown as { id: string; email: string | null }[])[0]?.id, otherId);
    assert.equal((otherAccount as unknown as { email: string | null }[])[0]?.email, null);

    // Still exactly one account for the original customer.
    const stillOne = await db.execute(sql`
      select count(*)::int as c from identity.user_accounts where id = ${customerId}::uuid
    `);
    assert.equal(Number((stillOne as unknown as { c: number }[])[0]?.c ?? 0), 1);

    // GET /v1/me remains a pure principal map (no writes).
    const meAfter = await httpJson(baseUrl, 'GET', '/v1/me', token);
    assert.equal(meAfter.status, 200);
    assert.equal(meAfter.json.userId, customerId);
    assert.ok(Array.isArray(meAfter.json.roles));
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

test('concurrent bootstrap for a fresh subject creates exactly one account and profile', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  // Nest caches AppModule/forRoot env for the process. Boot this case first in a
  // child process so DATABASE_URL is bound once to a fresh disposable database.
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const runner = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'customer-profile-bootstrap.concurrent.mjs',
  );
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, ['--import', 'tsx', runner], {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      SUPABASE_JWT_SECRET: jwtSecret,
    },
    cwd: path.join(repoRoot, 'services/helm-backend'),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
});
