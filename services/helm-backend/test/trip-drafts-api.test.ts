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

const SEEDED_DESTINATION_ID = '11111111-1111-1111-1111-111111111111';

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

test('trip drafts: private CRUD, current quotes, and idempotent simulated bookings', async (t) => {
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

    // Owner-scoped create idempotency: same clientRequestKey returns original id.
    const idempotencyKey = `create-key-${randomUUID()}`;
    const firstKeyed = await httpJson(baseUrl, 'POST', '/v1/trips/drafts', tokenA, {
      title: 'Idempotent draft',
      constraints: { party: 2 },
      clientRequestKey: idempotencyKey,
    });
    assert.equal(firstKeyed.status, 201, JSON.stringify(firstKeyed.json));
    const keyedId = String(firstKeyed.json.id);

    const replayKeyed = await httpJson(baseUrl, 'POST', '/v1/trips/drafts', tokenA, {
      title: 'Should not create another',
      constraints: { party: 99 },
      clientRequestKey: idempotencyKey,
    });
    assert.equal(replayKeyed.status, 201, JSON.stringify(replayKeyed.json));
    assert.equal(replayKeyed.json.id, keyedId);
    assert.equal(replayKeyed.json.title, 'Idempotent draft');
    assert.deepEqual(replayKeyed.json.constraints, { party: 2 });

    const listAfterReplay = await httpJson(baseUrl, 'GET', '/v1/trips/drafts', tokenA);
    assert.equal(listAfterReplay.status, 200);
    const keyedMatches = (listAfterReplay.json.items as Json[]).filter(
      (item) => item.id === keyedId,
    );
    assert.equal(keyedMatches.length, 1);

    // Keys are owner-scoped: B can reuse the same key without colliding.
    const bKeyed = await httpJson(baseUrl, 'POST', '/v1/trips/drafts', tokenB, {
      title: 'B keyed draft',
      clientRequestKey: idempotencyKey,
    });
    assert.equal(bKeyed.status, 201, JSON.stringify(bKeyed.json));
    assert.notEqual(bKeyed.json.id, keyedId);

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
      constraints: quoteConstraints,
    });
    assert.equal(quoteDraft.status, 201, JSON.stringify(quoteDraft.json));
    const quoteDraftPath = `/v1/trips/drafts/${quoteDraft.json.id}`;
    const quotePath = `${quoteDraftPath}/quote`;
    assert.equal((await httpJson(baseUrl, 'GET', quotePath, tokenA)).status, 404);
    const { status, json: quote } = await httpJson(baseUrl, 'POST', quotePath, tokenA);
    assert.equal(status, 201, JSON.stringify(quote));
    assert.equal(quote.draftId, quoteDraft.json.id);
    assert.equal(quote.currency, 'EGP');
    assert.equal(quote.source, 'demo');
    assert.equal(quote.flightTotalEgp, 37000);
    assert.equal(quote.lodgingTotalEgp, 19600);
    assert.equal(quote.activitiesTotalEgp, 800);
    assert.equal(quote.totalEgp, 57400);
    assert.equal(Date.parse(String(quote.expiresAt)) - Date.parse(String(quote.createdAt)), 30 * 60 * 1000);
    assert.deepEqual(await httpJson(baseUrl, 'GET', quotePath, tokenA), { status: 200, json: quote });
    assert.equal((await httpJson(baseUrl, 'GET', quotePath, tokenB)).status, 404);
    assert.equal((await httpJson(baseUrl, 'POST', quotePath, tokenB)).status, 404);
    assert.equal((await httpJson(baseUrl, 'POST', quotePath)).status, 401);

    const update = await httpJson(baseUrl, 'PATCH', quoteDraftPath, tokenA, {
      constraints: {
        ...quoteConstraints,
        answers: { ...quoteConstraints.answers, travelerCount: 3 },
      },
    });
    assert.equal(update.status, 200);
    assert.equal((await httpJson(baseUrl, 'GET', quotePath, tokenA)).status, 404);
    const mismatched = await httpJson(baseUrl, 'POST', quotePath, tokenA, {
      expectedConstraints: quoteConstraints,
    });
    assert.equal(mismatched.status, 409);
    assert.equal((await httpJson(baseUrl, 'GET', quotePath, tokenA)).status, 404);
    const repriced = await httpJson(baseUrl, 'POST', quotePath, tokenA);
    assert.equal(repriced.status, 201, JSON.stringify(repriced.json));
    assert.notEqual(repriced.json.id, quote.id);
    assert.equal(repriced.json.totalEgp, 76300);

    await fixtureSql.unsafe(
      `update trips.trip_draft_quotes
       set created_at = now() - interval '31 minutes', expires_at = now() - interval '1 minute'
       where draft_id = $1::uuid`,
      [String(quoteDraft.json.id)],
    );
    assert.equal((await httpJson(baseUrl, 'GET', quotePath, tokenA)).status, 404);
    const bookingPath = '/v1/trips/demo-bookings';
    const bookingBody = (quoteId: unknown) => ({ draftId: quoteDraft.json.id, quoteId });
    const expiredBooking = await httpJson(baseUrl, 'POST', bookingPath, tokenA, bookingBody(repriced.json.id));
    assert.equal(expiredBooking.status, 409);

    const invalidUpdate = await httpJson(baseUrl, 'PATCH', quoteDraftPath, tokenA, {
      constraints: {
        ...quoteConstraints,
        selections: {
          ...quoteConstraints.selections,
          includedActivitySlugs: ['ubud-balinese-cooking-class'],
        },
      },
    });
    assert.equal(invalidUpdate.status, 200);
    assert.equal((await httpJson(baseUrl, 'POST', quotePath, tokenA)).status, 400);

    const race = await Promise.all([
      httpJson(baseUrl, 'PATCH', quoteDraftPath, tokenA, { constraints: quoteConstraints }),
      httpJson(baseUrl, 'POST', quotePath, tokenA),
    ]);
    assert.equal(race[0]?.status, 200);
    if (race[1]?.status === 201) {
      assert.equal(race[1].json.totalEgp, 57400);
      assert.deepEqual(await httpJson(baseUrl, 'GET', quotePath, tokenA), {
        status: 200,
        json: race[1].json,
      });
    } else {
      assert.equal(race[1]?.status, 400);
      assert.equal((await httpJson(baseUrl, 'GET', quotePath, tokenA)).status, 404);
    }

    const checkoutQuote = await httpJson(baseUrl, 'POST', quotePath, tokenA);
    assert.equal(checkoutQuote.status, 201, JSON.stringify(checkoutQuote.json));
    const checkout = bookingBody(checkoutQuote.json.id);
    const replacedBooking = await httpJson(baseUrl, 'POST', bookingPath, tokenA, bookingBody(quote.id));
    assert.equal(replacedBooking.status, 409);
    assert.equal((await httpJson(baseUrl, 'POST', bookingPath, tokenB, checkout)).status, 404);
    assert.equal((await httpJson(baseUrl, 'POST', bookingPath, undefined, checkout)).status, 401);
    assert.equal((await httpJson(baseUrl, 'GET', bookingPath)).status, 401);

    const [first, retry] = await Promise.all([
      httpJson(baseUrl, 'POST', bookingPath, tokenA, checkout),
      httpJson(baseUrl, 'POST', bookingPath, tokenA, checkout),
    ]);
    assert.equal(first.status, 201, JSON.stringify(first.json));
    assert.deepEqual(retry, first);
    assert.equal(first.json.status, 'pending_confirmation');
    assert.deepEqual(first.json.quote, checkoutQuote.json);
    assert.deepEqual(first.json.constraints, quoteConstraints);

    const editAfterCheckout = await httpJson(baseUrl, 'PATCH', quoteDraftPath, tokenA, {
      constraints: { ...quoteConstraints, answers: { ...quoteConstraints.answers, travelerCount: 4 } },
    });
    assert.equal(editAfterCheckout.status, 200);
    assert.deepEqual(await httpJson(baseUrl, 'POST', bookingPath, tokenA, checkout), first);
    assert.deepEqual(await httpJson(baseUrl, 'GET', bookingPath, tokenA), {
      status: 200, json: { items: [first.json] },
    });
    assert.deepEqual(await httpJson(baseUrl, 'GET', bookingPath, tokenB), {
      status: 200, json: { items: [] },
    });

    const staffPath = `/v1/admin/trips/demo-bookings/${first.json.id}/services`;
    const staffListPath = '/v1/admin/trips/demo-bookings';
    assert.equal((await httpJson(baseUrl, 'GET', staffListPath)).status, 401);
    assert.equal((await httpJson(baseUrl, 'GET', staffListPath, tokenA)).status, 403);
    assert.equal((await httpJson(baseUrl, 'PATCH', `${staffPath}/flights`)).status, 401);
    assert.equal((await httpJson(baseUrl, 'PATCH', `${staffPath}/flights`, tokenA)).status, 403);
    assert.equal((await httpJson(baseUrl, 'PATCH', `${staffPath}/flights`, tokenB)).status, 403);
    await fixtureSql.unsafe(
      'insert into identity.user_roles (user_id, role) values ($1::uuid, $2::identity.app_role)',
      [userB, 'operator'],
    );
    const staffBooking = {
      id: first.json.id,
      title: first.json.title,
      status: first.json.status,
      services: first.json.services,
      createdAt: first.json.createdAt,
    };
    const recent = await httpJson(baseUrl, 'GET', staffListPath, tokenB);
    assert.equal(recent.status, 200);
    assert.ok((recent.json.items as Json[]).some((item) => item.id === staffBooking.id));
    assert.deepEqual(await httpJson(baseUrl, 'GET', `${staffListPath}?id=${staffBooking.id}`, tokenB), {
      status: 200, json: { items: [staffBooking] },
    });
    assert.equal((await httpJson(baseUrl, 'GET', `${staffListPath}?id=invalid`, tokenB)).status, 400);
    const flights = await httpJson(baseUrl, 'PATCH', `${staffPath}/flights`, tokenB);
    assert.equal(flights.status, 200, JSON.stringify(flights.json));
    assert.equal(flights.json.status, 'pending_confirmation');
    assert.deepEqual(await httpJson(baseUrl, 'PATCH', `${staffPath}/flights`, tokenB), flights);
    const remaining = await Promise.all([
      httpJson(baseUrl, 'PATCH', `${staffPath}/stay`, tokenB),
      httpJson(baseUrl, 'PATCH', `${staffPath}/activities`, tokenB),
    ]);
    for (const result of remaining) assert.equal(result.status, 200, JSON.stringify(result.json));
    const updatedBookings = await httpJson(baseUrl, 'GET', bookingPath, tokenA);
    const confirmed = (updatedBookings.json.items as Json[])[0]!;
    assert.equal(confirmed.status, 'confirmed');
    const services = confirmed.services as Json[];
    assert.deepEqual(services.map(({ kind }) => kind), ['flights', 'stay', 'activities']);
    assert.ok(services.every(({ confirmedAt }) => typeof confirmedAt === 'string'));
    assert.ok(services.every((service) => !('confirmedBy' in service)));
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
