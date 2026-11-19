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

test('destinationSlug filters public places by destination and keeps published-only', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }
  await withDb(async (repo) => {
    const queries = new CatalogQueryService(repo);
    const suffix = Date.now().toString(36);
    const destSlug = `dest-filter-${suffix}`;
    const otherSlug = `dest-other-${suffix}`;
    const publishedSlug = `place-pub-${suffix}`;
    const draftSlug = `place-draft-${suffix}`;
    const otherPublishedSlug = `place-other-${suffix}`;

    const sqlClient = postgres(databaseUrl!, { max: 1 });
    try {
      await sqlClient.begin(async (sql) => {
        const [dest] = await sql<{ id: string }[]>`
          insert into catalog.destinations (
            slug, name_en, name_ar, country_code, lifecycle_status, external_key
          ) values (
            ${destSlug}, ${`Dest ${suffix}`}, ${`وجهة ${suffix}`}, 'TR',
            'draft', ${`fixture:dest-filter-${suffix}`}
          )
          returning id
        `;
        const [otherDest] = await sql<{ id: string }[]>`
          insert into catalog.destinations (
            slug, name_en, name_ar, country_code, lifecycle_status, external_key
          ) values (
            ${otherSlug}, ${`Other ${suffix}`}, ${`أخرى ${suffix}`}, 'TR',
            'draft', ${`fixture:dest-other-${suffix}`}
          )
          returning id
        `;

        const insertPlace = async (
          destinationId: string,
          slug: string,
          externalKey: string,
        ) => {
          const [row] = await sql<{ id: string }[]>`
            insert into catalog.places (
              destination_id, category, subcategory, slug, name_en, name_ar,
              short_description_en, lifecycle_status, external_key
            ) values (
              ${destinationId}, 'attraction', 'fixture', ${slug},
              ${slug}, ${slug}, ${`Copy for ${slug}`}, 'draft', ${externalKey}
            )
            returning id
          `;
          return row.id;
        };

        const publishedId = await insertPlace(
          dest.id,
          publishedSlug,
          `fixture:place-pub-${suffix}`,
        );
        await insertPlace(dest.id, draftSlug, `fixture:place-draft-${suffix}`);
        const otherPublishedId = await insertPlace(
          otherDest.id,
          otherPublishedSlug,
          `fixture:place-other-${suffix}`,
        );

        const advanceToPublished = async (id: string) => {
          for (const to of [
            'pending_verification',
            'verified',
            'approved',
            'published',
          ] as const) {
            await sql`
              update catalog.places
              set lifecycle_status = ${to}
              where id = ${id}
            `;
          }
        };

        await advanceToPublished(publishedId);
        await advanceToPublished(otherPublishedId);
      });
    } finally {
      await sqlClient.end({ timeout: 5 });
    }

    try {
      const scoped = await queries.listPublicPlaces({
        destinationSlug: destSlug,
        limit: 50,
      });
      assert.equal(scoped.total, 1);
      assert.equal(scoped.items.length, 1);
      assert.equal(scoped.items[0]?.slug, publishedSlug);
      assert.equal(scoped.items[0]?.status, 'published');
      assert.ok(!scoped.items.some((p) => p.slug === draftSlug));
      assert.ok(!scoped.items.some((p) => p.slug === otherPublishedSlug));

      // Scope by the unique suffix shared across the three fixture slugs/names;
      // leave destinationSlug unset so both destinations are eligible.
      const unfiltered = await queries.listPublicPlaces({
        q: suffix,
        limit: 100,
      });
      assert.equal(unfiltered.total, 2);
      assert.ok(unfiltered.items.some((p) => p.slug === publishedSlug));
      assert.ok(unfiltered.items.some((p) => p.slug === otherPublishedSlug));
      assert.ok(!unfiltered.items.some((p) => p.slug === draftSlug));
    } finally {
      const cleanup = postgres(databaseUrl!, { max: 1 });
      try {
        await cleanup`
          delete from catalog.places
          where external_key in (
            ${`fixture:place-pub-${suffix}`},
            ${`fixture:place-draft-${suffix}`},
            ${`fixture:place-other-${suffix}`}
          )
        `;
        await cleanup`
          delete from catalog.destinations
          where external_key in (
            ${`fixture:dest-filter-${suffix}`},
            ${`fixture:dest-other-${suffix}`}
          )
        `;
      } finally {
        await cleanup.end({ timeout: 5 });
      }
    }
  });
});
