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

/** Deterministic fixture ids — isolated from seed UUIDs. */
const FIXTURE = {
  accommodation: 'd1111111-1111-1111-1111-111111111101',
  restaurant: 'd1111111-1111-1111-1111-111111111102',
  cafe: 'd1111111-1111-1111-1111-111111111105',
  bar: 'd1111111-1111-1111-1111-111111111106',
  beachClub: 'd1111111-1111-1111-1111-111111111107',
  attraction: 'd1111111-1111-1111-1111-111111111108',
  activity: 'd1111111-1111-1111-1111-111111111109',
  nightlife: 'd1111111-1111-1111-1111-11111111110a',
  transport: 'd1111111-1111-1111-1111-11111111110b',
  bare: 'd1111111-1111-1111-1111-111111111103',
  draft: 'd1111111-1111-1111-1111-111111111104',
} as const;

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

async function cleanupFixtures(db: ReturnType<typeof drizzle>) {
  // Cascades remove category detail rows, tags, media, sources.
  // Bind ids individually — drizzle/postgres array params are unreliable here.
  await db.execute(sql`
    delete from catalog.places
    where id in (
      ${FIXTURE.accommodation}::uuid,
      ${FIXTURE.restaurant}::uuid,
      ${FIXTURE.cafe}::uuid,
      ${FIXTURE.bar}::uuid,
      ${FIXTURE.beachClub}::uuid,
      ${FIXTURE.attraction}::uuid,
      ${FIXTURE.activity}::uuid,
      ${FIXTURE.nightlife}::uuid,
      ${FIXTURE.transport}::uuid,
      ${FIXTURE.bare}::uuid,
      ${FIXTURE.draft}::uuid
    )
       or external_key like 'seed:public-details:%'
  `);
}

test('public place details map every category; hide drafts, internals, and list payloads', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  await withDb(async (svc, db) => {
    const runId = `pd${Date.now()}`;
    await cleanupFixtures(db);

    try {
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
            ${`seed:public-details:${slug}`}
          )
        `);
      };

      const publish = async (id: string) => {
        await db.execute(
          sql`update catalog.places set lifecycle_status = 'pending_verification' where id = ${id}::uuid`,
        );
        await db.execute(
          sql`update catalog.places set lifecycle_status = 'verified' where id = ${id}::uuid`,
        );
        await db.execute(
          sql`update catalog.places set lifecycle_status = 'approved' where id = ${id}::uuid`,
        );
        await db.execute(
          sql`update catalog.places set lifecycle_status = 'published' where id = ${id}::uuid`,
        );
      };

      const slug = (kind: string) => `pub-${kind}-${runId}`;

      const hotelSlug = slug('hotel');
      const restaurantSlug = slug('resto');
      const cafeSlug = slug('cafe');
      const barSlug = slug('bar');
      const beachClubSlug = slug('beach-club');
      const attractionSlug = slug('attraction');
      const activitySlug = slug('activity');
      const nightlifeSlug = slug('nightlife');
      const transportSlug = slug('transport');
      const bareSlug = slug('bare');
      const draftSlug = slug('draft');

      await insertDraft(FIXTURE.accommodation, 'accommodation', hotelSlug, 'Public Test Hotel');
      await insertDraft(FIXTURE.restaurant, 'restaurant', restaurantSlug, 'Public Test Restaurant');
      await insertDraft(FIXTURE.cafe, 'cafe', cafeSlug, 'Public Test Cafe');
      await insertDraft(FIXTURE.bar, 'bar', barSlug, 'Public Test Bar');
      await insertDraft(FIXTURE.beachClub, 'beach_club', beachClubSlug, 'Public Test Beach Club');
      await insertDraft(FIXTURE.attraction, 'attraction', attractionSlug, 'Public Test Attraction');
      await insertDraft(FIXTURE.activity, 'activity', activitySlug, 'Public Test Activity');
      await insertDraft(FIXTURE.nightlife, 'nightlife', nightlifeSlug, 'Public Test Nightlife');
      await insertDraft(FIXTURE.transport, 'transport', transportSlug, 'Public Test Transport');
      await insertDraft(FIXTURE.bare, 'attraction', bareSlug, 'Public Bare Attraction');
      await insertDraft(FIXTURE.draft, 'cafe', draftSlug, 'Draft Cafe Hidden');

      await db.execute(sql`
        insert into catalog.place_accommodation_details (
          place_id, accommodation_type, star_rating, star_rating_verified, amenities, room_features
        ) values (
          ${FIXTURE.accommodation}::uuid,
          'hotel',
          4,
          true,
          '["wifi","pool"]'::jsonb,
          '["balcony"]'::jsonb
        )
      `);

      const insertDining = async (placeId: string, cuisine: string) => {
        await db.execute(sql`
          insert into catalog.place_dining_details (
            place_id, cuisine_types, meal_types, dietary_options, opening_hours
          ) values (
            ${placeId}::uuid,
            array[${cuisine}]::text[],
            array['dinner']::text[],
            array['halal']::text[],
            '{"mon":"10-22"}'::jsonb
          )
        `);
      };
      await insertDining(FIXTURE.restaurant, 'turkish');
      await insertDining(FIXTURE.cafe, 'coffee');
      await insertDining(FIXTURE.bar, 'cocktails');
      await insertDining(FIXTURE.beachClub, 'mediterranean');

      await db.execute(sql`
        insert into catalog.place_attraction_details (
          place_id, attraction_type, typical_duration_minutes, booking_required, suitable_for, seasonal_notes
        ) values (
          ${FIXTURE.attraction}::uuid,
          'museum',
          90,
          false,
          array['families']::text[],
          'Best in spring'
        )
      `);

      await db.execute(sql`
        insert into catalog.place_activity_details (
          place_id, activity_type, typical_duration_minutes, booking_required, suitable_for, seasonal_availability
        ) values (
          ${FIXTURE.activity}::uuid,
          'water_sports',
          120,
          true,
          array['adults']::text[],
          'May–October'
        )
      `);

      await db.execute(sql`
        insert into catalog.place_nightlife_details (
          place_id, venue_type, music_genres, age_restriction, age_restriction_verified, event_notes
        ) values (
          ${FIXTURE.nightlife}::uuid,
          'nightclub',
          array['house','techno']::text[],
          21,
          true,
          'Guest list preferred'
        )
      `);

      await db.execute(sql`
        insert into catalog.place_transport_details (
          place_id, transport_type, service_notes
        ) values (
          ${FIXTURE.transport}::uuid,
          'airport_transfer',
          'Meet at arrivals'
        )
      `);

      for (const id of [
        FIXTURE.accommodation,
        FIXTURE.restaurant,
        FIXTURE.cafe,
        FIXTURE.bar,
        FIXTURE.beachClub,
        FIXTURE.attraction,
        FIXTURE.activity,
        FIXTURE.nightlife,
        FIXTURE.transport,
        FIXTURE.bare,
      ]) {
        await publish(id);
      }
      // FIXTURE.draft stays draft / unpublished

      const asRecord = (details: unknown) => details as Record<string, unknown> | null;

      // --- accommodation ---
      const hotel = await svc.getPublicPlace(hotelSlug);
      assert.equal(hotel.status, 'published');
      assert.equal(asRecord(hotel.details)?.type, 'accommodation');
      assert.equal(asRecord(hotel.details)?.accommodationType, 'hotel');
      assert.equal(Number(asRecord(hotel.details)?.starRating), 4);
      assert.ok(Array.isArray(asRecord(hotel.details)?.amenities));
      assert.equal('starRatingVerified' in (asRecord(hotel.details) ?? {}), false);
      assert.equal('star_rating_verified' in (asRecord(hotel.details) ?? {}), false);
      assertNoInternalLeak(hotel);

      // --- dining mappings (restaurant, cafe, bar, beach_club) ---
      for (const [placeSlug, cuisine] of [
        [restaurantSlug, 'turkish'],
        [cafeSlug, 'coffee'],
        [barSlug, 'cocktails'],
        [beachClubSlug, 'mediterranean'],
      ] as const) {
        const place = await svc.getPublicPlace(placeSlug);
        const details = asRecord(place.details);
        assert.equal(details?.type, 'dining', `${placeSlug} should map to dining details`);
        assert.ok(
          ((details?.cuisineTypes as string[] | undefined) ?? []).includes(cuisine),
          `${placeSlug} cuisineTypes should include ${cuisine}`,
        );
        assert.ok(((details?.mealTypes as string[] | undefined) ?? []).includes('dinner'));
        assert.ok(((details?.dietaryOptions as string[] | undefined) ?? []).includes('halal'));
        assert.ok(details?.openingHours);
        assertNoInternalLeak(place);
      }

      // --- attraction ---
      const attraction = await svc.getPublicPlace(attractionSlug);
      assert.equal(asRecord(attraction.details)?.type, 'attraction');
      assert.equal(asRecord(attraction.details)?.attractionType, 'museum');
      assert.equal(Number(asRecord(attraction.details)?.typicalDurationMinutes), 90);
      assert.equal(asRecord(attraction.details)?.bookingRequired, false);
      assert.ok(
        ((asRecord(attraction.details)?.suitableFor as string[] | undefined) ?? []).includes(
          'families',
        ),
      );
      assert.equal(asRecord(attraction.details)?.seasonalNotes, 'Best in spring');
      assertNoInternalLeak(attraction);

      // --- activity ---
      const activity = await svc.getPublicPlace(activitySlug);
      assert.equal(asRecord(activity.details)?.type, 'activity');
      assert.equal(asRecord(activity.details)?.activityType, 'water_sports');
      assert.equal(Number(asRecord(activity.details)?.typicalDurationMinutes), 120);
      assert.equal(asRecord(activity.details)?.bookingRequired, true);
      assert.equal(asRecord(activity.details)?.seasonalAvailability, 'May–October');
      assertNoInternalLeak(activity);

      // --- nightlife (staff-only age_restriction_verified must not leak) ---
      const nightlife = await svc.getPublicPlace(nightlifeSlug);
      assert.equal(asRecord(nightlife.details)?.type, 'nightlife');
      assert.equal(asRecord(nightlife.details)?.venueType, 'nightclub');
      assert.ok(
        ((asRecord(nightlife.details)?.musicGenres as string[] | undefined) ?? []).includes(
          'techno',
        ),
      );
      assert.equal(Number(asRecord(nightlife.details)?.ageRestriction), 21);
      assert.equal(asRecord(nightlife.details)?.eventNotes, 'Guest list preferred');
      assert.equal('ageRestrictionVerified' in (asRecord(nightlife.details) ?? {}), false);
      assert.equal('age_restriction_verified' in (asRecord(nightlife.details) ?? {}), false);
      assertNoInternalLeak(nightlife);

      // --- transport ---
      const transport = await svc.getPublicPlace(transportSlug);
      assert.equal(asRecord(transport.details)?.type, 'transport');
      assert.equal(asRecord(transport.details)?.transportType, 'airport_transfer');
      assert.equal(asRecord(transport.details)?.serviceNotes, 'Meet at arrivals');
      assertNoInternalLeak(transport);

      // --- missing detail rows → details: null ---
      const bare = await svc.getPublicPlace(bareSlug);
      assert.equal(bare.details, null);
      assertNoInternalLeak(bare);

      // --- unpublished / draft inaccessible ---
      await assert.rejects(() => svc.getPublicPlace(draftSlug));

      // --- list endpoints stay lean (no category details payload) ---
      const listed = await svc.listPublicPlaces({ q: `pub-hotel-${runId}`, limit: 20 });
      const listedHotel = listed.items.find((i) => i.slug === hotelSlug);
      assert.ok(listedHotel, 'published hotel should appear in list');
      assert.equal('details' in listedHotel!, false);
      for (const item of listed.items) {
        assert.equal('details' in item, false);
      }
      assertNoInternalLeak(listed);

      const listedDining = await svc.listPublicPlaces({ q: `pub-resto-${runId}`, limit: 10 });
      const listedRestaurant = listedDining.items.find((i) => i.slug === restaurantSlug);
      assert.ok(listedRestaurant);
      assert.equal('details' in listedRestaurant!, false);
    } finally {
      await cleanupFixtures(db);
    }
  });
});
