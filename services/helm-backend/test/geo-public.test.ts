import assert from 'node:assert/strict';
import test from 'node:test';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../src/infrastructure/adapters/drizzle/schema.ts';
import { CatalogQueryService } from '../src/modules/catalog/application/catalog-query.service.ts';
import { CatalogRepository } from '../src/modules/catalog/infrastructure/catalog.repository.ts';

const databaseUrl = process.env.DATABASE_URL;

test('geo countries and cities public lists', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const client = postgres(databaseUrl, { max: 1 });
  try {
    const db = drizzle(client, { schema });
    const repo = new CatalogRepository(db as never);
    const queries = new CatalogQueryService(repo);
    const runId = `geo${Date.now()}`;

    await db.execute(sql`
      insert into geo.countries (code, name_en, name_ar, is_active)
      values ('TN', 'Tunisia', 'تونس', true)
      on conflict (code) do update set is_active = true, name_en = excluded.name_en
    `);
    await db.execute(sql`
      insert into geo.cities (country_code, slug, name_en, name_ar, is_active)
      values ('TN', ${`tunis-${runId}`}, 'Tunis', 'تونس', true)
      on conflict (country_code, slug) do nothing
    `);

    const countries = await queries.listCountries({ q: 'Tunisia', limit: 10, offset: 0 });
    assert.ok(countries.items.some((c) => String(c.code) === 'TN' && c.isActive === true));
    assert.ok(countries.limit <= 100);

    const cities = await queries.listCities({ country: 'TN', q: 'Tunis', limit: 10, offset: 0 });
    assert.ok(cities.items.some((c) => String(c.slug) === `tunis-${runId}`));
    assert.equal(cities.items.every((c) => String(c.countryCode) === 'TN'), true);

    await db.execute(sql`delete from geo.cities where slug = ${`tunis-${runId}`}`);
  } finally {
    await client.end({ timeout: 5 });
  }
});
