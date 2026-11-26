/**
 * Trip requests API — owner submit, staff review, idempotent duplicates,
 * snapshot frozen after draft edits (Ubud + Istanbul).
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { listPlainPostgresMigrationFiles } from './support/plain-postgres-migrations.ts';

const databaseUrl = process.env.DATABASE_URL;
const jwtSecret =
  process.env.SUPABASE_JWT_SECRET ?? 'test-only-helm-jwt-secret-min-32-chars!!';

type Json = Record<string, unknown>;
type SqlClient = ReturnType<typeof postgres>;

const ubudConstraints = {
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

const istanbulConstraints = {
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

async function applyMigrationsAndSeed(targetUrl: string) {
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

test('trip requests: submit snapshot, isolate owners, staff review, both destinations', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const adminSql = postgres(databaseUrl, { max: 1 });
  const disposableDb = `helm_trip_req_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  let disposableUrl = '';
  let app: { close(): Promise<void> } | undefined;
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

    assert.equal(
      (await httpJson(baseUrl, 'POST', '/v1/customer/profile/bootstrap', tokenA)).status,
      200,
    );
    assert.equal(
      (await httpJson(baseUrl, 'POST', '/v1/customer/profile/bootstrap', tokenB)).status,
      200,
    );

    const draftUbud = await httpJson(baseUrl, 'POST', '/v1/trips/drafts', tokenA, {
      title: 'Ubud trip · 2 nights',
      constraints: ubudConstraints,
    });
    assert.equal(draftUbud.status, 201, JSON.stringify(draftUbud.json));
    const ubudDraftId = String(draftUbud.json.id);

    const draftIstanbul = await httpJson(baseUrl, 'POST', '/v1/trips/drafts', tokenA, {
      title: 'Istanbul trip · 3 nights',
      constraints: istanbulConstraints,
    });
    assert.equal(draftIstanbul.status, 201, JSON.stringify(draftIstanbul.json));
    const istanbulDraftId = String(draftIstanbul.json.id);

    assert.equal((await httpJson(baseUrl, 'POST', '/v1/trips/requests')).status, 401);
    assert.equal(
      (
        await httpJson(baseUrl, 'POST', '/v1/trips/requests', tokenB, {
          draftId: ubudDraftId,
        })
      ).status,
      404,
    );

    const [first, retry] = await Promise.all([
      httpJson(baseUrl, 'POST', '/v1/trips/requests', tokenA, { draftId: ubudDraftId }),
      httpJson(baseUrl, 'POST', '/v1/trips/requests', tokenA, { draftId: ubudDraftId }),
    ]);
    assert.equal(first.status, 201, JSON.stringify(first.json));
    assert.equal(retry.status, 201, JSON.stringify(retry.json));
    assert.equal(first.json.id, retry.json.id);
    assert.equal(first.json.status, 'submitted');
    assert.equal(first.json.destinationSlug, 'ubud');
    assert.deepEqual(first.json.constraints, ubudConstraints);
    assert.equal('staffNote' in first.json, false);

    const edited = await httpJson(baseUrl, 'PATCH', `/v1/trips/drafts/${ubudDraftId}`, tokenA, {
      constraints: {
        ...ubudConstraints,
        answers: { ...ubudConstraints.answers, travelerCount: 4 },
      },
    });
    assert.equal(edited.status, 200, JSON.stringify(edited.json));
    const again = await httpJson(baseUrl, 'POST', '/v1/trips/requests', tokenA, {
      draftId: ubudDraftId,
    });
    assert.equal(again.status, 201);
    assert.equal(again.json.id, first.json.id);
    assert.deepEqual(again.json.constraints, ubudConstraints);

    const istanbulReq = await httpJson(baseUrl, 'POST', '/v1/trips/requests', tokenA, {
      draftId: istanbulDraftId,
    });
    assert.equal(istanbulReq.status, 201, JSON.stringify(istanbulReq.json));
    assert.equal(istanbulReq.json.destinationSlug, 'istanbul');
    assert.deepEqual(istanbulReq.json.constraints, istanbulConstraints);

    const listA = await httpJson(baseUrl, 'GET', '/v1/trips/requests', tokenA);
    assert.equal(listA.status, 200);
    assert.equal((listA.json.items as Json[]).length, 2);
    for (const item of listA.json.items as Json[]) {
      assert.equal('staffNote' in item, false);
    }
    const listB = await httpJson(baseUrl, 'GET', '/v1/trips/requests', tokenB);
    assert.equal(listB.status, 200);
    assert.equal((listB.json.items as Json[]).length, 0);
    assert.equal(
      (await httpJson(baseUrl, 'GET', `/v1/trips/requests/${String(first.json.id)}`, tokenB))
        .status,
      404,
    );

    const staffPath = '/v1/admin/trips/requests';
    assert.equal((await httpJson(baseUrl, 'GET', staffPath)).status, 401);
    assert.equal((await httpJson(baseUrl, 'GET', staffPath, tokenA)).status, 403);

    const fixtureSql = postgres(disposableUrl, { max: 1 });
    try {
      await fixtureSql.unsafe(
        'insert into identity.user_roles (user_id, role) values ($1::uuid, $2::identity.app_role)',
        [userB, 'operator'],
      );
    } finally {
      await fixtureSql.end({ timeout: 5 });
    }

    const staffList = await httpJson(baseUrl, 'GET', staffPath, tokenB);
    assert.equal(staffList.status, 200);
    assert.ok((staffList.json.items as Json[]).some((item) => item.id === first.json.id));

    const staffGet = await httpJson(
      baseUrl,
      'GET',
      `${staffPath}/${String(first.json.id)}`,
      tokenB,
    );
    assert.equal(staffGet.status, 200, JSON.stringify(staffGet.json));
    assert.equal(staffGet.json.staffNote, null);
    assert.deepEqual(staffGet.json.constraints, ubudConstraints);

    const underReview = await httpJson(
      baseUrl,
      'PATCH',
      `${staffPath}/${String(first.json.id)}`,
      tokenB,
      { status: 'under_review', staffNote: 'Checking lodging' },
    );
    assert.equal(underReview.status, 200, JSON.stringify(underReview.json));
    assert.equal(underReview.json.status, 'under_review');
    assert.equal(underReview.json.staffNote, 'Checking lodging');

    const travelerGet = await httpJson(
      baseUrl,
      'GET',
      `/v1/trips/requests/${String(first.json.id)}`,
      tokenA,
    );
    assert.equal(travelerGet.status, 200);
    assert.equal(travelerGet.json.status, 'under_review');
    assert.equal('staffNote' in travelerGet.json, false);

    const declined = await httpJson(
      baseUrl,
      'PATCH',
      `${staffPath}/${String(first.json.id)}`,
      tokenB,
      { status: 'declined', staffNote: 'Dates unavailable' },
    );
    assert.equal(declined.status, 200, JSON.stringify(declined.json));
    assert.equal(declined.json.status, 'declined');

    const finalBlocked = await httpJson(
      baseUrl,
      'PATCH',
      `${staffPath}/${String(first.json.id)}`,
      tokenB,
      { status: 'under_review' },
    );
    assert.equal(finalBlocked.status, 409, JSON.stringify(finalBlocked.json));

    // Ubud demo quote/checkout path still works for a fresh draft.
    const quoteConstraints = {
      kind: 'ubud_trip_preview',
      version: 1,
      answers: { destination: 'ubud', travelerCount: 2, nights: 2 },
      selections: {
        flightId: 'economy-example',
        hotelSlug: 'ubud-komaneka-bisma',
        includedActivitySlugs: ['ubud-tirta-empul'],
      },
      itinerary: {
        days: [
          { dayNumber: 1, stopSlugs: ['ubud-tirta-empul'] },
          { dayNumber: 2, stopSlugs: [] },
        ],
      },
      totalEgp: 1,
    };
    const quoteDraft = await httpJson(baseUrl, 'POST', '/v1/trips/drafts', tokenA, {
      title: 'Ubud checkout check',
      constraints: quoteConstraints,
    });
    assert.equal(quoteDraft.status, 201, JSON.stringify(quoteDraft.json));
    const quote = await httpJson(
      baseUrl,
      'POST',
      `/v1/trips/drafts/${String(quoteDraft.json.id)}/quote`,
      tokenA,
    );
    assert.equal(quote.status, 201, JSON.stringify(quote.json));
    const booking = await httpJson(baseUrl, 'POST', '/v1/trips/demo-bookings', tokenA, {
      draftId: quoteDraft.json.id,
      quoteId: quote.json.id,
    });
    assert.equal(booking.status, 201, JSON.stringify(booking.json));
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
