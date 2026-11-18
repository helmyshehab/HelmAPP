import assert from 'node:assert/strict';
import test from 'node:test';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../src/infrastructure/adapters/drizzle/schema.ts';
import { CatalogAdminService } from '../src/modules/catalog/application/catalog-admin.service.ts';
import { CatalogRepository } from '../src/modules/catalog/infrastructure/catalog.repository.ts';
import { AuditService } from '../src/modules/audit/audit.service.ts';
import type { AuthPrincipal } from '../src/infrastructure/ports/auth.port.ts';

const databaseUrl = process.env.DATABASE_URL;

const adminActor: AuthPrincipal = {
  userId: '77777777-7777-7777-7777-777777777777',
  roles: ['administrator'],
  rolesSource: 'database',
};

const operatorActor: AuthPrincipal = {
  userId: '66666666-6666-6666-6666-666666666666',
  roles: ['operator'],
  rolesSource: 'database',
};

async function withService<T>(
  fn: (svc: CatalogAdminService, db: ReturnType<typeof drizzle>, client: ReturnType<typeof postgres>) => Promise<T>,
): Promise<T> {
  if (!databaseUrl) throw new Error('DATABASE_URL required');
  const client = postgres(databaseUrl, { max: 1 });
  try {
    const db = drizzle(client, { schema });
    const repo = new CatalogRepository(db as never);
    const audit = new AuditService(db as never);
    const svc = new CatalogAdminService(repo, audit, db as never);
    return await fn(svc, db, client);
  } finally {
    await client.end({ timeout: 5 });
  }
}

test('import destination + hotel/restaurant details, tags, ratings; dry-run; update', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  await withService(async (svc, db) => {
    // Ensure Indonesia country exists for destination import
    await db.execute(sql`
      insert into geo.countries (code, name_en, name_ar, default_currency)
      values ('ID', 'Indonesia', 'إندونيسيا', 'USD')
      on conflict (code) do nothing
    `);
    await db.execute(sql`
      insert into geo.cities (id, country_code, slug, name_en, name_ar, timezone)
      values (
        'c4444444-4444-4444-4444-444444444444',
        'ID', 'denpasar', 'Denpasar', 'دينباسار', 'Asia/Makassar'
      )
      on conflict (country_code, slug) do nothing
    `);

    const runId = `rf${Date.now()}`;
    const destKey = `id:bali-${runId}`;
    const destSlug = `bali-${runId}`;
    const hotelKey = `${destKey}:boutique-hotel`;
    const restaurantKey = `${destKey}:seafood`;

    // Cleanup any leftover debug destinations (best-effort)
    await db.execute(sql`
      delete from catalog.destinations where external_key like 'id:bali-debug%'
    `);

    const payload = {
      formatVersion: 'helm.catalog.import.v1' as const,
      sourceLabel: 'step5-review-fix-fixture',
      destinations: [
        {
          externalKey: destKey,
          slug: destSlug,
          nameEn: 'Bali Review Fix',
          nameAr: 'بالي إصلاح',
          countryCode: 'ID',
          citySlug: 'denpasar',
          summaryEn: 'Import test destination',
          tags: ['island', 'culture'],
          updateIfExists: false,
          sources: [
            {
              sourceType: 'manual_research' as const,
              name: 'Helm Bali fixture notes',
              collectedAt: '2026-11-18',
            },
          ],
        },
      ],
      places: [
        {
          externalKey: hotelKey,
          destinationSlug: destSlug,
          category: 'accommodation' as const,
          subcategory: 'boutique_hotel',
          slug: `boutique-hotel-${runId}`,
          nameEn: 'Review Fix Boutique Hotel',
          nameAr: 'فندق بوتيك',
          updateIfExists: false,
          tags: ['pool', 'spa'],
          accommodation: {
            accommodationType: 'boutique_hotel' as const,
            starRating: 4,
            amenities: ['wifi', 'pool'],
          },
          rating: {
            value: 4.6,
            scale: 5,
            reviewCount: 120,
            platform: 'manual_research',
            observedAt: '2026-11-01',
          },
          sources: [
            {
              sourceType: 'hotel_website' as const,
              name: 'Sample hotel site',
              collectedAt: '2026-11-01',
            },
          ],
        },
        {
          externalKey: restaurantKey,
          destinationSlug: destSlug,
          category: 'restaurant' as const,
          subcategory: 'restaurant',
          slug: `seafood-${runId}`,
          nameEn: 'Review Fix Seafood',
          nameAr: 'مأكولات بحرية',
          updateIfExists: false,
          dining: {
            cuisineTypes: ['seafood', 'indonesian'],
            mealTypes: ['lunch', 'dinner'],
            dietaryOptions: ['halal'],
          },
          tags: ['seafood'],
        },
      ],
    };

    const beforePlaces = await db.execute(sql`
      select count(*)::int as c from catalog.places
      where external_key = ${hotelKey} or external_key = ${restaurantKey}
    `);
    const beforeCount = Number((beforePlaces as unknown as { c: number }[])[0]?.c ?? 0);

    const dry = await svc.importCatalog(adminActor, payload, { dryRun: true });
    assert.equal(dry.dryRun, true);
    assert.equal((dry as { destinationsWouldCreate?: number }).destinationsWouldCreate, 1);
    assert.equal((dry as { placesWouldCreate?: number }).placesWouldCreate, 2);

    const afterDry = await db.execute(sql`
      select count(*)::int as c from catalog.places
      where external_key = ${hotelKey} or external_key = ${restaurantKey}
    `);
    assert.equal(
      Number((afterDry as unknown as { c: number }[])[0]?.c ?? 0),
      beforeCount,
      'dry-run must not create places',
    );

    const applied = await svc.importCatalog(adminActor, payload, { dryRun: false });
    assert.equal(applied.dryRun, false);
    assert.equal((applied as { destinationsCreated?: number }).destinationsCreated, 1);
    assert.equal((applied as { placesCreated?: number }).placesCreated, 2);
    assert.deepEqual((applied as { errors?: unknown[] }).errors ?? [], []);

    const dest = await db.execute(sql`
      select lifecycle_status as status from catalog.destinations
      where external_key = ${destKey}
    `);
    assert.equal((dest as unknown as { status: string }[])[0]?.status, 'draft');

    const hotelDetails = await db.execute(sql`
      select a.accommodation_type as typ, a.star_rating as stars
      from catalog.places p
      join catalog.place_accommodation_details a on a.place_id = p.id
      where p.external_key = ${hotelKey}
    `);
    assert.equal((hotelDetails as unknown as { typ: string }[])[0]?.typ, 'boutique_hotel');
    assert.equal(Number((hotelDetails as unknown as { stars: number }[])[0]?.stars), 4);

    const dining = await db.execute(sql`
      select d.cuisine_types as cuisine
      from catalog.places p
      join catalog.place_dining_details d on d.place_id = p.id
      where p.external_key = ${restaurantKey}
    `);
    assert.ok(
      ((dining as unknown as { cuisine: string[] }[])[0]?.cuisine ?? []).includes('seafood'),
    );

    const tags = await db.execute(sql`
      select count(*)::int as c
      from catalog.place_tags pt
      join catalog.places p on p.id = pt.place_id
      where p.external_key = ${hotelKey}
    `);
    assert.ok(Number((tags as unknown as { c: number }[])[0]?.c) >= 2);

    const ratings = await db.execute(sql`
      select r.rating_value as v, r.platform as platform
      from catalog.place_ratings r
      join catalog.places p on p.id = r.place_id
      where p.external_key = ${hotelKey}
    `);
    assert.ok((ratings as unknown as { platform: string }[])[0], 'expected place_ratings row');
    assert.equal((ratings as unknown as { platform: string }[])[0]?.platform, 'manual_research');
    assert.ok(Number((ratings as unknown as { v: string | number }[])[0]?.v) > 4);

    // Repeat import without updateIfExists → skip, no duplicates
    const again = await svc.importCatalog(adminActor, payload, { dryRun: false });
    assert.equal((again as { placesSkipped?: number }).placesSkipped, 2);
    assert.equal((again as { placesCreated?: number }).placesCreated ?? 0, 0);

    // Update existing with updateIfExists
    const updatePayload = {
      ...payload,
      destinations: [{ ...payload.destinations[0]!, updateIfExists: true, nameEn: 'Bali Review Fix Updated' }],
      places: [
        {
          ...payload.places[0]!,
          updateIfExists: true,
          nameEn: 'Review Fix Boutique Hotel Updated',
          accommodation: {
            accommodationType: 'boutique_hotel' as const,
            starRating: 5,
            amenities: ['wifi', 'pool', 'spa'],
          },
        },
      ],
    };
    const updated = await svc.importCatalog(adminActor, updatePayload, { dryRun: false });
    assert.equal((updated as { destinationsUpdated?: number }).destinationsUpdated, 1);
    assert.equal((updated as { placesUpdated?: number }).placesUpdated, 1);

    const renamed = await db.execute(sql`
      select name_en as n from catalog.places
      where external_key = ${hotelKey}
    `);
    assert.equal(
      (renamed as unknown as { n: string }[])[0]?.n,
      'Review Fix Boutique Hotel Updated',
    );
  });
});

test('operator cannot apply import; admin can', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }
  await withService(async (svc) => {
    await assert.rejects(() =>
      svc.importCatalog(
        operatorActor,
        { formatVersion: 'helm.catalog.import.v1', destinations: [], places: [] },
        { dryRun: false },
      ),
    );
    const dry = await svc.importCatalog(
      operatorActor,
      { formatVersion: 'helm.catalog.import.v1', destinations: [], places: [] },
      { dryRun: true },
    );
    assert.equal(dry.dryRun, true);
  });
});
