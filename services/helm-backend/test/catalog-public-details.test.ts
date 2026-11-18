import assert from 'node:assert/strict';
import test from 'node:test';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../src/infrastructure/adapters/drizzle/schema.ts';
import { CatalogRepository } from '../src/modules/catalog/infrastructure/catalog.repository.ts';
import { CatalogQueryService } from '../src/modules/catalog/application/catalog-query.service.ts';
import { assertNoInternalLeak } from '../src/modules/catalog/application/public-catalog.mapper.ts';

const databaseUrl = process.env.DATABASE_URL;

async function withDb<T>(fn: (svc: CatalogQueryService, db: ReturnType<typeof drizzle>) => Promise<T>) {
  if (!databaseUrl) throw new Error('DATABASE_URL required');
  const client = postgres(databaseUrl, { max: 1 });
  try {
    const db = drizzle(client, { schema });
    const svc = new CatalogQueryService(new CatalogRepository(db as never));
    return await fn(svc, db);
  } finally {
    await client.end({ timeout: 5 });
  }
}

test('public place detail returns accommodation / dining; hides draft and internals', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  await withDb(async (svc, db) => {
    const runId = `pub${Date.now()}`;
    const hotelId = 'd1111111-1111-1111-1111-111111111101';
    const restaurantId = 'd1111111-1111-1111-1111-111111111102';
    const bareId = 'd1111111-1111-1111-1111-111111111103';
    const draftId = 'd1111111-1111-1111-1111-111111111104';

    // Deterministic cleanup of previous fixture ids
    await db.execute(sql`
      delete from catalog.places where id in (
        ${hotelId}::uuid, ${restaurantId}::uuid, ${bareId}::uuid, ${draftId}::uuid
      )
    `);

    // Promote through lifecycle via updates so create-as-published trigger is not hit
    const insertDraft = async (
      id: string,
      category: string,
      slug: string,
      name: string,
    ) => {
      await db.execute(sql`
        insert into catalog.places (
          id, destination_id, city_id, category, subcategory, slug, name_en, name_ar,
          lifecycle_status, external_key
        ) values (
          ${id}::uuid,
          '11111111-1111-1111-1111-111111111111',
          'c1111111-1111-1111-1111-111111111111',
          ${category}::catalog.place_category,
          'general',
          ${slug},
          ${name},
          ${name},
          'draft',
          ${`seed:public:${slug}`}
        )
      `);
    };

    const publish = async (id: string) => {
      await db.execute(sql`update catalog.places set lifecycle_status = 'pending_verification' where id = ${id}::uuid`);
      await db.execute(sql`update catalog.places set lifecycle_status = 'verified' where id = ${id}::uuid`);
      await db.execute(sql`update catalog.places set lifecycle_status = 'approved' where id = ${id}::uuid`);
      await db.execute(sql`update catalog.places set lifecycle_status = 'published' where id = ${id}::uuid`);
    };

    const hotelSlug = `pub-hotel-${runId}`;
    const restaurantSlug = `pub-resto-${runId}`;
    const bareSlug = `pub-bare-${runId}`;
    const draftSlug = `pub-draft-${runId}`;

    await insertDraft(hotelId, 'accommodation', hotelSlug, 'Public Test Hotel');
    await insertDraft(restaurantId, 'restaurant', restaurantSlug, 'Public Test Restaurant');
    await insertDraft(bareId, 'attraction', bareSlug, 'Public Bare Attraction');
    await insertDraft(draftId, 'cafe', draftSlug, 'Draft Cafe Hidden');

    await db.execute(sql`
      insert into catalog.place_accommodation_details (
        place_id, accommodation_type, star_rating, amenities
      ) values (
        ${hotelId}::uuid, 'hotel', 4, '["wifi","pool"]'::jsonb
      )
    `);
    await db.execute(sql`
      insert into catalog.place_dining_details (
        place_id, cuisine_types, meal_types, dietary_options
      ) values (
        ${restaurantId}::uuid,
        array['turkish','seafood'],
        array['dinner'],
        array['halal']
      )
    `);

    await publish(hotelId);
    await publish(restaurantId);
    await publish(bareId);
    // draftId stays draft

    const hotel = await svc.getPublicPlace(hotelSlug);
    assert.equal(hotel.status, 'published');
    assert.equal((hotel.details as { type?: string } | null)?.type, 'accommodation');
    assert.equal((hotel.details as { accommodationType?: string }).accommodationType, 'hotel');
    assert.equal(Number((hotel.details as { starRating?: number }).starRating), 4);
    assertNoInternalLeak(hotel);

    const restaurant = await svc.getPublicPlace(restaurantSlug);
    assert.equal((restaurant.details as { type?: string } | null)?.type, 'dining');
    assert.ok(
      ((restaurant.details as { cuisineTypes?: string[] }).cuisineTypes ?? []).includes('turkish'),
    );
    assertNoInternalLeak(restaurant);

    const bare = await svc.getPublicPlace(bareSlug);
    assert.equal(bare.details, null);

    await assert.rejects(() => svc.getPublicPlace(draftSlug));

    const listed = await svc.listPublicPlaces({ q: hotelSlug, limit: 10 });
    const listedHotel = listed.items.find((i) => i.slug === hotelSlug);
    assert.ok(listedHotel);
    assert.equal('details' in listedHotel!, false);
    assertNoInternalLeak(listed);
  });
});
