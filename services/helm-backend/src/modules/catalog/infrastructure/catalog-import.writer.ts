import { sql, type SQL } from 'drizzle-orm';
import type { DrizzleClient } from '../../../infrastructure/adapters/drizzle/drizzle.client';
import { AppException } from '../../../common/errors/app.exception';
import type {
  CatalogImportDestination,
  CatalogImportPlace,
} from '../domain/import-format';

type Tx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

export type ImportAction = 'created' | 'updated' | 'skipped';

export type ImportEntityResult = {
  id: string;
  action: ImportAction;
};

function rowsOf<T extends Record<string, unknown>>(result: unknown): T[] {
  return result as T[];
}

/** Bind JS string[] as Postgres text[] (drizzle/postgres.js otherwise mangles arrays). */
function textArray(values: string[] | undefined | null): SQL {
  const list = values ?? [];
  if (list.length === 0) return sql`'{}'::text[]`;
  return sql`ARRAY[${sql.join(
    list.map((v) => sql`${v}`),
    sql`,`,
  )}]::text[]`;
}

async function exec<T extends Record<string, unknown>>(
  tx: Tx,
  query: SQL,
): Promise<T[]> {
  return rowsOf<T>(await tx.execute(query));
}

async function ensureSource(
  tx: Tx,
  input: { sourceType: string; name: string; url?: string; notes?: string },
): Promise<string> {
  const existing = await exec<{ id: string }>(
    tx,
    sql`
      select id from catalog.sources
      where name = ${input.name}
        and source_type = ${input.sourceType}::catalog.source_type
      limit 1
    `,
  );
  if (existing[0]?.id) return String(existing[0].id);
  const inserted = await exec<{ id: string }>(
    tx,
    sql`
      insert into catalog.sources (source_type, name, url, notes)
      values (
        ${input.sourceType}::catalog.source_type,
        ${input.name},
        ${input.url ?? null},
        ${input.notes ?? null}
      )
      returning id
    `,
  );
  if (!inserted[0]?.id) throw AppException.validation('Failed to insert source');
  return String(inserted[0].id);
}

async function linkEntitySource(
  tx: Tx,
  input: {
    entityType: string;
    entityId: string;
    sourceId: string;
    collectedAt?: string;
    notes?: string;
  },
) {
  await tx.execute(sql`
    insert into catalog.entity_sources (
      entity_type, entity_id, source_id, collected_at, verification_status, notes
    ) values (
      ${input.entityType},
      ${input.entityId}::uuid,
      ${input.sourceId}::uuid,
      ${input.collectedAt ?? null}::date,
      'unverified',
      ${input.notes ?? null}
    )
    on conflict (entity_type, entity_id, source_id) do nothing
  `);
}

async function ensureTag(tx: Tx, slug: string): Promise<string> {
  const existing = await exec<{ id: string }>(
    tx,
    sql`select id from catalog.tags where slug = ${slug} limit 1`,
  );
  if (existing[0]?.id) return String(existing[0].id);
  const name = slug.replace(/-/g, ' ');
  const inserted = await exec<{ id: string }>(
    tx,
    sql`
      insert into catalog.tags (slug, name_en, name_ar, is_active)
      values (${slug}, ${name}, ${name}, true)
      returning id
    `,
  );
  if (!inserted[0]?.id) throw AppException.validation(`Failed to create tag ${slug}`);
  return String(inserted[0].id);
}

async function linkPlaceTags(tx: Tx, placeId: string, tags: string[]) {
  for (const slug of tags) {
    const tagId = await ensureTag(tx, slug);
    await tx.execute(sql`
      insert into catalog.place_tags (place_id, tag_id)
      values (${placeId}::uuid, ${tagId}::uuid)
      on conflict do nothing
    `);
  }
}

async function linkDestinationTags(tx: Tx, destinationId: string, tags: string[]) {
  for (const slug of tags) {
    const tagId = await ensureTag(tx, slug);
    await tx.execute(sql`
      insert into catalog.destination_tags (destination_id, tag_id)
      values (${destinationId}::uuid, ${tagId}::uuid)
      on conflict do nothing
    `);
  }
}

async function upsertPlaceDetails(tx: Tx, placeId: string, place: CatalogImportPlace) {
  if (place.accommodation) {
    const a = place.accommodation;
    await tx.execute(sql`
      insert into catalog.place_accommodation_details (
        place_id, accommodation_type, star_rating, amenities
      ) values (
        ${placeId}::uuid,
        ${a.accommodationType ?? 'hotel'},
        ${a.starRating ?? null},
        ${JSON.stringify(a.amenities ?? [])}::jsonb
      )
      on conflict (place_id) do update set
        accommodation_type = excluded.accommodation_type,
        star_rating = coalesce(excluded.star_rating, catalog.place_accommodation_details.star_rating),
        amenities = excluded.amenities,
        updated_at = now()
    `);
  }
  if (place.dining) {
    const d = place.dining;
    await tx.execute(sql`
      insert into catalog.place_dining_details (
        place_id, cuisine_types, meal_types, dietary_options
      ) values (
        ${placeId}::uuid,
        ${textArray(d.cuisineTypes)},
        ${textArray(d.mealTypes)},
        ${textArray(d.dietaryOptions)}
      )
      on conflict (place_id) do update set
        cuisine_types = excluded.cuisine_types,
        meal_types = excluded.meal_types,
        dietary_options = excluded.dietary_options,
        updated_at = now()
    `);
  }
  if (place.attraction) {
    const a = place.attraction;
    await tx.execute(sql`
      insert into catalog.place_attraction_details (
        place_id, attraction_type, typical_duration_minutes, booking_required, suitable_for
      ) values (
        ${placeId}::uuid,
        ${a.attractionType ?? 'landmark'},
        ${a.typicalDurationMinutes ?? null},
        ${a.bookingRequired ?? null},
        ${textArray(a.suitableFor)}
      )
      on conflict (place_id) do update set
        attraction_type = excluded.attraction_type,
        typical_duration_minutes = coalesce(excluded.typical_duration_minutes, catalog.place_attraction_details.typical_duration_minutes),
        booking_required = coalesce(excluded.booking_required, catalog.place_attraction_details.booking_required),
        suitable_for = excluded.suitable_for,
        updated_at = now()
    `);
  }
  if (place.activity) {
    const a = place.activity;
    await tx.execute(sql`
      insert into catalog.place_activity_details (
        place_id, activity_type, typical_duration_minutes, booking_required
      ) values (
        ${placeId}::uuid,
        ${a.activityType ?? 'tour'},
        ${a.typicalDurationMinutes ?? null},
        ${a.bookingRequired ?? null}
      )
      on conflict (place_id) do update set
        activity_type = excluded.activity_type,
        typical_duration_minutes = coalesce(excluded.typical_duration_minutes, catalog.place_activity_details.typical_duration_minutes),
        booking_required = coalesce(excluded.booking_required, catalog.place_activity_details.booking_required),
        updated_at = now()
    `);
  }
  if (place.nightlife) {
    const n = place.nightlife;
    await tx.execute(sql`
      insert into catalog.place_nightlife_details (
        place_id, venue_type, music_genres
      ) values (
        ${placeId}::uuid,
        ${n.venueType ?? 'nightclub'},
        ${textArray(n.musicGenres)}
      )
      on conflict (place_id) do update set
        venue_type = excluded.venue_type,
        music_genres = excluded.music_genres,
        updated_at = now()
    `);
  }
  if (place.transport) {
    const t = place.transport;
    await tx.execute(sql`
      insert into catalog.place_transport_details (
        place_id, transport_type, service_notes
      ) values (
        ${placeId}::uuid,
        ${t.transportType ?? 'local'},
        ${t.serviceNotes ?? null}
      )
      on conflict (place_id) do update set
        transport_type = excluded.transport_type,
        service_notes = coalesce(excluded.service_notes, catalog.place_transport_details.service_notes),
        updated_at = now()
    `);
  }
}

async function upsertPlaceRating(tx: Tx, placeId: string, place: CatalogImportPlace) {
  if (!place.rating) return;
  const r = place.rating;
  await tx.execute(sql`
    insert into catalog.place_ratings (
      place_id, rating_value, rating_scale, review_count, platform, observed_at, is_primary
    ) values (
      ${placeId}::uuid,
      ${r.value},
      ${r.scale},
      ${r.reviewCount ?? null},
      ${r.platform},
      ${r.observedAt}::date,
      true
    )
    on conflict (place_id, platform, observed_at) do update set
      rating_value = excluded.rating_value,
      rating_scale = excluded.rating_scale,
      review_count = excluded.review_count,
      is_primary = true
  `);
  await tx.execute(sql`
    update catalog.places set
      rating_value = ${r.value},
      rating_scale = ${r.scale},
      rating_source = ${r.platform},
      review_count = ${r.reviewCount ?? null},
      rating_observed_at = ${r.observedAt}::timestamptz
    where id = ${placeId}::uuid
  `);
}

export class CatalogImportWriter {
  constructor(private readonly db: DrizzleClient) {}

  async countryExists(countryCode: string): Promise<boolean> {
    const rows = rowsOf<{ code: string }>(
      await this.db.execute(sql`
        select code from geo.countries where code = ${countryCode.toUpperCase()} limit 1
      `),
    );
    return Boolean(rows[0]);
  }

  async findCityId(countryCode: string, citySlug: string): Promise<string | null> {
    const rows = rowsOf<{ id: string }>(
      await this.db.execute(sql`
        select id from geo.cities
        where country_code = ${countryCode.toUpperCase()} and slug = ${citySlug}
        limit 1
      `),
    );
    return rows[0]?.id ? String(rows[0].id) : null;
  }

  async findDestinationByExternalKey(externalKey: string) {
    const rows = rowsOf<{ id: string; slug: string; lifecycleStatus: string }>(
      await this.db.execute(sql`
        select id, slug, lifecycle_status as "lifecycleStatus"
        from catalog.destinations where external_key = ${externalKey} limit 1
      `),
    );
    return rows[0] ?? null;
  }

  async findDestinationBySlug(slug: string) {
    const rows = rowsOf<{
      id: string;
      slug: string;
      lifecycleStatus: string;
      externalKey: string | null;
    }>(
      await this.db.execute(sql`
        select id, slug, lifecycle_status as "lifecycleStatus",
               external_key as "externalKey"
        from catalog.destinations where slug = ${slug} limit 1
      `),
    );
    return rows[0] ?? null;
  }

  async findPlaceByExternalKey(externalKey: string) {
    const rows = rowsOf<{ id: string; slug: string; lifecycleStatus: string }>(
      await this.db.execute(sql`
        select id, slug, lifecycle_status as "lifecycleStatus"
        from catalog.places where external_key = ${externalKey} limit 1
      `),
    );
    return rows[0] ?? null;
  }

  /**
   * Import one destination atomically (row + tags + provenance).
   * Always creates as draft. Never silently overwrites without updateIfExists.
   */
  async importDestination(dest: CatalogImportDestination): Promise<ImportEntityResult> {
    return this.db.transaction(async (tx) => {
      const countries = await exec<{ code: string }>(
        tx,
        sql`select code from geo.countries where code = ${dest.countryCode.toUpperCase()} limit 1`,
      );
      if (!countries[0]) {
        throw AppException.validation(`Unknown country code: ${dest.countryCode}`);
      }

      let cityId: string | null = null;
      if (dest.citySlug) {
        const cities = await exec<{ id: string }>(
          tx,
          sql`
            select id from geo.cities
            where country_code = ${dest.countryCode.toUpperCase()}
              and slug = ${dest.citySlug}
            limit 1
          `,
        );
        if (!cities[0]) {
          throw AppException.validation(
            `Unknown city slug '${dest.citySlug}' for country ${dest.countryCode}`,
          );
        }
        cityId = String(cities[0].id);
      }

      const byKey = await exec<{ id: string; slug: string }>(
        tx,
        sql`
          select id, slug from catalog.destinations
          where external_key = ${dest.externalKey} limit 1
        `,
      );
      const bySlug = await exec<{ id: string; external_key: string | null }>(
        tx,
        sql`
          select id, external_key from catalog.destinations
          where slug = ${dest.slug} limit 1
        `,
      );

      if (bySlug[0] && byKey[0] && String(bySlug[0].id) !== String(byKey[0].id)) {
        throw AppException.validation(
          `Destination slug '${dest.slug}' conflicts with a different externalKey`,
        );
      }
      if (bySlug[0] && !byKey[0] && bySlug[0].external_key && bySlug[0].external_key !== dest.externalKey) {
        throw AppException.validation(
          `Destination slug '${dest.slug}' already exists with a different externalKey`,
        );
      }

      let id: string;
      let action: ImportAction;

      if (byKey[0]) {
        if (!dest.updateIfExists) {
          return { id: String(byKey[0].id), action: 'skipped' };
        }
        id = String(byKey[0].id);
        await tx.execute(sql`
          update catalog.destinations set
            name_en = ${dest.nameEn},
            name_ar = ${dest.nameAr},
            country_code = ${dest.countryCode.toUpperCase()},
            city_id = case when ${cityId !== null} then ${cityId}::uuid else city_id end,
            summary_en = case
              when ${dest.summaryEn !== undefined} then ${dest.summaryEn ?? null}
              else summary_en end,
            summary_ar = case
              when ${dest.summaryAr !== undefined} then ${dest.summaryAr ?? null}
              else summary_ar end,
            short_description_en = case
              when ${dest.shortDescriptionEn !== undefined} then ${dest.shortDescriptionEn ?? null}
              else short_description_en end,
            short_description_ar = case
              when ${dest.shortDescriptionAr !== undefined} then ${dest.shortDescriptionAr ?? null}
              else short_description_ar end,
            latitude = case
              when ${dest.latitude !== undefined} then ${dest.latitude ?? null}
              else latitude end,
            longitude = case
              when ${dest.longitude !== undefined} then ${dest.longitude ?? null}
              else longitude end,
            timezone = case
              when ${dest.timezone !== undefined} then ${dest.timezone ?? null}
              else timezone end,
            tags = case
              when ${dest.tags !== undefined} then ${textArray(dest.tags)}
              else tags end
          where id = ${id}::uuid
        `);
        action = 'updated';
      } else if (bySlug[0] && !bySlug[0].external_key) {
        // Adopt legacy seed row lacking external_key when update requested
        if (!dest.updateIfExists) {
          throw AppException.validation(
            `Destination slug '${dest.slug}' already exists; set updateIfExists to adopt`,
          );
        }
        id = String(bySlug[0].id);
        await tx.execute(sql`
          update catalog.destinations set
            external_key = ${dest.externalKey},
            name_en = ${dest.nameEn},
            name_ar = ${dest.nameAr},
            country_code = ${dest.countryCode.toUpperCase()},
            city_id = ${cityId},
            summary_en = ${dest.summaryEn ?? null},
            summary_ar = ${dest.summaryAr ?? null},
            short_description_en = ${dest.shortDescriptionEn ?? null},
            short_description_ar = ${dest.shortDescriptionAr ?? null},
            latitude = ${dest.latitude ?? null},
            longitude = ${dest.longitude ?? null},
            timezone = ${dest.timezone ?? null},
            tags = ${textArray(dest.tags)}
          where id = ${id}::uuid
        `);
        action = 'updated';
      } else if (bySlug[0]) {
        throw AppException.validation(
          `Destination slug '${dest.slug}' already exists with a different externalKey`,
        );
      } else {
        const inserted = dest.id
          ? await exec<{ id: string }>(
              tx,
              sql`
                insert into catalog.destinations (
                  id, slug, name_en, name_ar, country_code, city_id,
                  summary_en, summary_ar, short_description_en, short_description_ar,
                  latitude, longitude, timezone, tags, external_key, lifecycle_status
                ) values (
                  ${dest.id}::uuid,
                  ${dest.slug},
                  ${dest.nameEn},
                  ${dest.nameAr},
                  ${dest.countryCode.toUpperCase()},
                  ${cityId},
                  ${dest.summaryEn ?? null},
                  ${dest.summaryAr ?? null},
                  ${dest.shortDescriptionEn ?? null},
                  ${dest.shortDescriptionAr ?? null},
                  ${dest.latitude ?? null},
                  ${dest.longitude ?? null},
                  ${dest.timezone ?? null},
                  ${textArray(dest.tags)},
                  ${dest.externalKey},
                  'draft'
                )
                returning id
              `,
            )
          : await exec<{ id: string }>(
              tx,
              sql`
                insert into catalog.destinations (
                  slug, name_en, name_ar, country_code, city_id,
                  summary_en, summary_ar, short_description_en, short_description_ar,
                  latitude, longitude, timezone, tags, external_key, lifecycle_status
                ) values (
                  ${dest.slug},
                  ${dest.nameEn},
                  ${dest.nameAr},
                  ${dest.countryCode.toUpperCase()},
                  ${cityId},
                  ${dest.summaryEn ?? null},
                  ${dest.summaryAr ?? null},
                  ${dest.shortDescriptionEn ?? null},
                  ${dest.shortDescriptionAr ?? null},
                  ${dest.latitude ?? null},
                  ${dest.longitude ?? null},
                  ${dest.timezone ?? null},
                  ${textArray(dest.tags)},
                  ${dest.externalKey},
                  'draft'
                )
                returning id
              `,
            );
        if (!inserted[0]?.id) {
          throw AppException.validation('Failed to insert destination');
        }
        id = String(inserted[0].id);
        action = 'created';
      }

      if (dest.tags?.length) {
        await linkDestinationTags(tx, id, dest.tags);
      }
      for (const source of dest.sources ?? []) {
        const sourceId = await ensureSource(tx, source);
        await linkEntitySource(tx, {
          entityType: 'destination',
          entityId: id,
          sourceId,
          collectedAt: source.collectedAt,
          notes: source.notes,
        });
      }

      return { id, action };
    });
  }

  /**
   * Import one place atomically (row + details + tags + rating + provenance).
   */
  async importPlace(
    place: CatalogImportPlace,
    destinationId: string,
  ): Promise<ImportEntityResult> {
    return this.db.transaction(async (tx) => {
      const byKey = await exec<{ id: string }>(
        tx,
        sql`
          select id from catalog.places
          where external_key = ${place.externalKey} limit 1
        `,
      );

      const bySlug = await exec<{ id: string; external_key: string | null }>(
        tx,
        sql`
          select id, external_key from catalog.places
          where destination_id = ${destinationId}::uuid
            and category = ${place.category}::catalog.place_category
            and slug = ${place.slug}
          limit 1
        `,
      );

      if (bySlug[0] && byKey[0] && String(bySlug[0].id) !== String(byKey[0].id)) {
        throw AppException.validation(
          `Place slug '${place.slug}' conflicts with a different externalKey`,
        );
      }
      if (
        bySlug[0] &&
        !byKey[0] &&
        bySlug[0].external_key &&
        bySlug[0].external_key !== place.externalKey
      ) {
        throw AppException.validation(
          `Place slug '${place.slug}' already exists with a different externalKey`,
        );
      }

      let id: string;
      let action: ImportAction;

      if (byKey[0]) {
        if (!place.updateIfExists) {
          return { id: String(byKey[0].id), action: 'skipped' };
        }
        id = String(byKey[0].id);
        // Required fields always replace. Optional scalars: omitted → keep existing
        // (never silently clear curated values). Detail/tag/rating blocks below are
        // additive or replace-only-when-present.
        await tx.execute(sql`
          update catalog.places set
            name_en = ${place.nameEn},
            name_ar = ${place.nameAr},
            subcategory = ${place.subcategory},
            short_description_en = case
              when ${place.shortDescriptionEn !== undefined} then ${place.shortDescriptionEn ?? null}
              else short_description_en end,
            short_description_ar = case
              when ${place.shortDescriptionAr !== undefined} then ${place.shortDescriptionAr ?? null}
              else short_description_ar end,
            description_en = case
              when ${place.descriptionEn !== undefined} then ${place.descriptionEn ?? null}
              else description_en end,
            description_ar = case
              when ${place.descriptionAr !== undefined} then ${place.descriptionAr ?? null}
              else description_ar end,
            latitude = case
              when ${place.latitude !== undefined} then ${place.latitude ?? null}
              else latitude end,
            longitude = case
              when ${place.longitude !== undefined} then ${place.longitude ?? null}
              else longitude end,
            address_text = case
              when ${place.addressText !== undefined} then ${place.addressText ?? null}
              else address_text end,
            website_url = case
              when ${place.websiteUrl !== undefined} then ${place.websiteUrl ?? null}
              else website_url end,
            contact_phone = case
              when ${place.contactPhone !== undefined} then ${place.contactPhone ?? null}
              else contact_phone end,
            contact_email = case
              when ${place.contactEmail !== undefined} then ${place.contactEmail ?? null}
              else contact_email end,
            price_level = case
              when ${place.priceLevel !== undefined} then ${place.priceLevel ?? null}
              else price_level end
          where id = ${id}::uuid
        `);
        action = 'updated';
      } else {
        const inserted = await exec<{ id: string }>(
          tx,
          sql`
            insert into catalog.places (
              destination_id, category, subcategory, slug, name_en, name_ar,
              short_description_en, short_description_ar,
              description_en, description_ar,
              latitude, longitude, address_text, website_url,
              contact_phone, contact_email, price_level,
              external_key, lifecycle_status
            ) values (
              ${destinationId}::uuid,
              ${place.category}::catalog.place_category,
              ${place.subcategory},
              ${place.slug},
              ${place.nameEn},
              ${place.nameAr},
              ${place.shortDescriptionEn ?? null},
              ${place.shortDescriptionAr ?? null},
              ${place.descriptionEn ?? null},
              ${place.descriptionAr ?? null},
              ${place.latitude ?? null},
              ${place.longitude ?? null},
              ${place.addressText ?? null},
              ${place.websiteUrl ?? null},
              ${place.contactPhone ?? null},
              ${place.contactEmail ?? null},
              ${place.priceLevel ?? null},
              ${place.externalKey},
              'draft'
            )
            returning id
          `,
        );
        if (!inserted[0]?.id) {
          throw AppException.validation('Failed to insert place');
        }
        id = String(inserted[0].id);
        action = 'created';
      }

      await upsertPlaceDetails(tx, id, place);
      if (place.tags?.length) {
        await linkPlaceTags(tx, id, place.tags);
      }
      await upsertPlaceRating(tx, id, place);

      for (const source of place.sources ?? []) {
        const sourceId = await ensureSource(tx, source);
        await linkEntitySource(tx, {
          entityType: 'place',
          entityId: id,
          sourceId,
          collectedAt: source.collectedAt,
          notes: source.notes,
        });
      }

      return { id, action };
    });
  }
}
