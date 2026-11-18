import assert from 'node:assert/strict';
import test from 'node:test';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/infrastructure/adapters/drizzle/schema.ts';
import { CatalogRepository } from '../src/modules/catalog/infrastructure/catalog.repository.ts';
import { CatalogQueryService } from '../src/modules/catalog/application/catalog-query.service.ts';
import { toPublicPlace } from '../src/modules/catalog/application/public-catalog.mapper.ts';

const databaseUrl = process.env.DATABASE_URL;

async function withDb<T>(fn: (repo: CatalogRepository) => Promise<T>): Promise<T> {
  if (!databaseUrl) throw new Error('DATABASE_URL required');
  const client = postgres(databaseUrl, { max: 1 });
  try {
    const db = drizzle(client, { schema });
    return await fn(new CatalogRepository(db as never));
  } finally {
    await client.end({ timeout: 5 });
  }
}

test('published places are visible and drafts are hidden (DB)', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }
  await withDb(async (repo) => {
    const queries = new CatalogQueryService(repo);
    const listed = await queries.listPublicPlaces({ limit: 50 });
    assert.ok(listed.total >= 1);
    for (const item of listed.items) {
      assert.equal(item.status, 'published');
      assert.equal('lifecycleStatus' in item, false);
      assert.equal('rejectionReason' in item, false);
    }

    await assert.rejects(() => queries.getPublicPlace('draft-unverified-cafe'), (err: unknown) => {
      assert.ok(err instanceof Error);
      return true;
    });

    const published = await queries.getPublicPlace('hagia-sophia-exterior');
    assert.equal(published.slug, 'hagia-sophia-exterior');
    assert.equal(published.status, 'published');
  });
});

test('invalid public filters are rejected', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }
  await withDb(async (repo) => {
    const queries = new CatalogQueryService(repo);
    await assert.rejects(() => queries.listPublicPlaces({ category: 'spaceship' }));
    await assert.rejects(() => queries.listPublicPlaces({ priceLevel: 9 }));
    await assert.rejects(() => queries.listPublicPlaces({ country: 'EGY' }));
  });
});

test('staff list can see unpublished while public mapper still strips internals', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }
  await withDb(async (repo) => {
    const staff = await repo.listPlaces({
      publicOnly: false,
      limit: 50,
      offset: 0,
      sort: 'name',
    });
    assert.ok(staff.items.some((p) => p.lifecycleStatus === 'draft'));
    const leaked = toPublicPlace(staff.items.find((p) => p.lifecycleStatus === 'draft')!);
    assert.equal('lifecycleStatus' in leaked, false);
  });
});
