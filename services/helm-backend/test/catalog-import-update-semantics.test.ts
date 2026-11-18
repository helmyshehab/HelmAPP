import assert from 'node:assert/strict';
import test from 'node:test';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../src/infrastructure/adapters/drizzle/schema.ts';
import { CatalogImportWriter } from '../src/modules/catalog/infrastructure/catalog-import.writer.ts';

const databaseUrl = process.env.DATABASE_URL;

test('updateIfExists preserves omitted optionals/details/tags; conflicts are rejected', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const client = postgres(databaseUrl, { max: 1 });
  try {
    const db = drizzle(client, { schema });
    const writer = new CatalogImportWriter(db as never);
    const runId = `upd${Date.now()}`;
    const destKey = `id:upd-${runId}`;
    const placeKey = `${destKey}:hotel`;

    const dest = await writer.importDestination({
      externalKey: destKey,
      slug: `upd-${runId}`,
      nameEn: 'Update Dest',
      nameAr: 'ت',
      countryCode: 'TR',
      citySlug: 'istanbul',
      summaryEn: 'Keep me',
      updateIfExists: false,
      tags: ['culture'],
    });
    assert.equal(dest.action, 'created');

    const created = await writer.importPlace(
      {
        externalKey: placeKey,
        destinationSlug: `upd-${runId}`,
        category: 'accommodation',
        subcategory: 'hotel',
        slug: `hotel-${runId}`,
        nameEn: 'Update Hotel',
        nameAr: 'ف',
        shortDescriptionEn: 'Keep this short description',
        updateIfExists: false,
        accommodation: {
          accommodationType: 'hotel',
          starRating: 3,
          amenities: ['wifi'],
        },
        tags: ['pool'],
      },
      dest.id,
    );
    assert.equal(created.action, 'created');

    // Omit shortDescription, accommodation, tags — should preserve curated values
    const updated = await writer.importPlace(
      {
        externalKey: placeKey,
        destinationSlug: `upd-${runId}`,
        category: 'accommodation',
        subcategory: 'boutique_hotel',
        slug: `hotel-${runId}`,
        nameEn: 'Update Hotel Renamed',
        nameAr: 'ف',
        updateIfExists: true,
      },
      dest.id,
    );
    assert.equal(updated.action, 'updated');

    const row = await db.execute(sql`
      select p.name_en as name, p.short_description_en as short,
             a.star_rating as stars, a.accommodation_type as typ
      from catalog.places p
      join catalog.place_accommodation_details a on a.place_id = p.id
      where p.external_key = ${placeKey}
    `);
    const place = (row as unknown as {
      name: string;
      short: string;
      stars: number;
      typ: string;
    }[])[0];
    assert.equal(place?.name, 'Update Hotel Renamed');
    assert.equal(place?.short, 'Keep this short description');
    assert.equal(Number(place?.stars), 3);
    assert.equal(place?.typ, 'hotel');

    const tagCount = await db.execute(sql`
      select count(*)::int as c
      from catalog.place_tags pt
      join catalog.places p on p.id = pt.place_id
      where p.external_key = ${placeKey}
    `);
    assert.ok(Number((tagCount as unknown as { c: number }[])[0]?.c) >= 1);

    // Slug conflict with different external key
    await assert.rejects(() =>
      writer.importPlace(
        {
          externalKey: `${placeKey}-other`,
          destinationSlug: `upd-${runId}`,
          category: 'accommodation',
          subcategory: 'hotel',
          slug: `hotel-${runId}`,
          nameEn: 'Clash',
          nameAr: 'ص',
          updateIfExists: false,
        },
        dest.id,
      ),
    );
  } finally {
    await client.end({ timeout: 5 });
  }
});
