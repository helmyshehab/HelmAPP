import { Inject, Injectable, Optional } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleClient } from '../../../infrastructure/adapters/drizzle/drizzle.client';
import { AppException } from '../../../common/errors/app.exception';
import type { LifecycleStatus } from '../domain/lifecycle';
import type { PlaceCategory } from '../domain/categories';

/**
 * Must match `hashtext(...)` key in `catalog.enforce_destination_parent_acyclic`
 * (Step 6.3). Nest acquires this xact advisory lock *before* INSERT/UPDATE that
 * change `parent_id`, so the lock is held prior to destination row locks.
 */
export const DESTINATION_PARENT_HIERARCHY_LOCK_KEY =
  'catalog.destinations.parent_hierarchy';

type SqlExecutor = {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
};

export type PlaceListFilters = {
  country?: string;
  city?: string;
  area?: string;
  category?: string;
  subcategory?: string;
  minRating?: number;
  priceLevel?: number;
  tags?: string[];
  featured?: boolean;
  q?: string;
  sort?: 'name' | 'rating' | 'updated';
  limit: number;
  offset: number;
  /** When true, only published (public). When false, staff sees all. */
  publicOnly: boolean;
};

export type DestinationListFilters = {
  country?: string;
  featured?: boolean;
  q?: string;
  lifecycleStatus?: LifecycleStatus;
  parentId?: string;
  topLevelOnly?: boolean;
  limit: number;
  offset: number;
  publicOnly: boolean;
};

const DESTINATION_ADMIN_COLUMNS = sql`
  d.id, d.slug, d.name_en as "nameEn", d.name_ar as "nameAr",
  d.short_description_en as "shortDescriptionEn",
  d.short_description_ar as "shortDescriptionAr",
  d.summary_en as "summaryEn", d.summary_ar as "summaryAr",
  d.description_en as "descriptionEn", d.description_ar as "descriptionAr",
  d.country_code as "countryCode", d.city_id as "cityId",
  d.parent_id as "parentId",
  d.timezone, d.latitude, d.longitude,
  d.address_text as "addressText", d.website_url as "websiteUrl",
  d.is_featured as "isFeatured", d.external_key as "externalKey",
  d.lifecycle_status as "lifecycleStatus",
  d.verified_by as "verifiedBy", d.verified_at as "verifiedAt",
  d.approved_by as "approvedBy", d.approved_at as "approvedAt",
  d.rejected_by as "rejectedBy", d.rejected_at as "rejectedAt",
  d.rejection_reason as "rejectionReason",
  d.archived_at as "archivedAt",
  d.published_at as "publishedAt",
  d.created_at as "createdAt", d.updated_at as "updatedAt"
`;

@Injectable()
export class CatalogRepository {
  constructor(@Optional() @Inject(DRIZZLE) private readonly db?: DrizzleClient) {}

  private requireDb(): DrizzleClient {
    if (!this.db) {
      throw AppException.validation('Catalog database is not configured (DATABASE_URL)');
    }
    return this.db;
  }

  async listDestinations(filters: DestinationListFilters) {
    const db = this.requireDb();
    const limit = Math.min(Math.max(filters.limit, 1), 100);
    const offset = Math.max(filters.offset, 0);
    const lifecycle = filters.lifecycleStatus ?? null;
    const parentId = filters.parentId ?? null;
    const topLevelOnly = filters.topLevelOnly === true;
    const where = sql`
      (${filters.publicOnly} = false or d.lifecycle_status = 'published')
      and (${filters.country ?? null}::text is null or d.country_code = ${filters.country ?? null})
      and (${filters.featured ?? null}::boolean is null or d.is_featured = ${filters.featured ?? null})
      and (${lifecycle}::text is null or d.lifecycle_status = ${lifecycle}::catalog.lifecycle_status)
      and (${parentId}::uuid is null or d.parent_id = ${parentId}::uuid)
      and (${topLevelOnly} = false or d.parent_id is null)
      and (
        ${filters.q ?? null}::text is null
        or d.name_en ilike '%' || ${filters.q ?? null} || '%'
        or d.name_ar ilike '%' || ${filters.q ?? null} || '%'
        or d.slug ilike '%' || ${filters.q ?? null} || '%'
      )
    `;
    const rows = await db.execute(sql`
      select
        d.id, d.slug, d.name_en as "nameEn", d.name_ar as "nameAr",
        d.summary_en as "summaryEn", d.summary_ar as "summaryAr",
        d.country_code as "countryCode", d.city_id as "cityId",
        d.parent_id as "parentId",
        d.timezone, d.latitude, d.longitude, d.is_featured as "isFeatured",
        d.tags, d.lifecycle_status as "lifecycleStatus",
        d.published_at as "publishedAt", d.updated_at as "updatedAt"
      from catalog.destinations d
      where ${where}
      order by d.is_featured desc, d.slug asc
      limit ${limit} offset ${offset}
    `);
    const countRes = await db.execute(sql`
      select count(*)::int as c
      from catalog.destinations d
      where ${where}
    `);
    const total = Number((countRes as unknown as { c: number }[])[0]?.c ?? 0);
    return { items: rows as unknown as Record<string, unknown>[], total, limit, offset };
  }

  async getDestinationBySlug(slug: string, publicOnly: boolean) {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select
        d.id, d.slug, d.name_en as "nameEn", d.name_ar as "nameAr",
        d.summary_en as "summaryEn", d.summary_ar as "summaryAr",
        d.description_en as "descriptionEn", d.description_ar as "descriptionAr",
        d.country_code as "countryCode", d.city_id as "cityId",
        d.timezone, d.latitude, d.longitude, d.is_featured as "isFeatured",
        d.tags, d.lifecycle_status as "lifecycleStatus",
        d.verified_by as "verifiedBy", d.approved_by as "approvedBy",
        d.rejection_reason as "rejectionReason",
        d.published_at as "publishedAt", d.updated_at as "updatedAt"
      from catalog.destinations d
      where d.slug = ${slug}
        and (${publicOnly} = false or d.lifecycle_status = 'published')
      limit 1
    `);
    const list = rows as unknown as Record<string, unknown>[];
    return list[0] ?? null;
  }

  async listPlaces(filters: PlaceListFilters) {
    const db = this.requireDb();
    const limit = Math.min(Math.max(filters.limit, 1), 100);
    const offset = Math.max(filters.offset, 0);
    const tag = filters.tags?.[0] ?? null;

    const orderSql =
      filters.sort === 'rating'
        ? sql`p.rating_value desc nulls last, p.slug asc`
        : filters.sort === 'updated'
          ? sql`p.updated_at desc, p.slug asc`
          : sql`p.name_en asc, p.slug asc`;

    const rows = await db.execute(sql`
      select
        p.id, p.slug, p.name_en as "nameEn", p.name_ar as "nameAr",
        p.category, p.subcategory,
        p.short_description_en as "shortDescriptionEn",
        p.short_description_ar as "shortDescriptionAr",
        p.destination_id as "destinationId",
        p.city_id as "cityId", p.area_id as "areaId",
        p.latitude, p.longitude, p.address_text as "addressText",
        p.website_url as "websiteUrl",
        p.price_level as "priceLevel",
        p.rating_value as "ratingValue",
        p.rating_scale as "ratingScale",
        p.rating_source as "ratingSource",
        p.review_count as "reviewCount",
        p.rating_observed_at as "ratingObservedAt",
        p.is_featured as "isFeatured",
        p.lifecycle_status as "lifecycleStatus",
        p.updated_at as "updatedAt",
        d.slug as "destinationSlug",
        d.country_code as "countryCode"
      from catalog.places p
      join catalog.destinations d on d.id = p.destination_id
      left join geo.cities c on c.id = p.city_id
      left join geo.areas a on a.id = p.area_id
      where
        (${filters.publicOnly} = false or p.lifecycle_status = 'published')
        and (${filters.country ?? null}::text is null or d.country_code = ${filters.country ?? null})
        and (${filters.city ?? null}::text is null or c.slug = ${filters.city ?? null})
        and (${filters.area ?? null}::text is null or a.slug = ${filters.area ?? null})
        and (${filters.category ?? null}::text is null or p.category::text = ${filters.category ?? null})
        and (${filters.subcategory ?? null}::text is null or p.subcategory = ${filters.subcategory ?? null})
        and (${filters.minRating ?? null}::numeric is null or p.rating_value >= ${filters.minRating ?? null})
        and (${filters.priceLevel ?? null}::int is null or p.price_level = ${filters.priceLevel ?? null})
        and (${filters.featured ?? null}::boolean is null or p.is_featured = ${filters.featured ?? null})
        and (
          ${tag}::text is null
          or exists (
            select 1 from catalog.place_tags pt
            join catalog.tags t on t.id = pt.tag_id
            where pt.place_id = p.id and t.slug = ${tag}
          )
        )
        and (
          ${filters.q ?? null}::text is null
          or p.name_en ilike '%' || ${filters.q ?? null} || '%'
          or p.name_ar ilike '%' || ${filters.q ?? null} || '%'
          or p.slug ilike '%' || ${filters.q ?? null} || '%'
        )
      order by ${orderSql}
      limit ${limit} offset ${offset}
    `);

    const countRes = await db.execute(sql`
      select count(*)::int as c
      from catalog.places p
      join catalog.destinations d on d.id = p.destination_id
      left join geo.cities c on c.id = p.city_id
      left join geo.areas a on a.id = p.area_id
      where
        (${filters.publicOnly} = false or p.lifecycle_status = 'published')
        and (${filters.country ?? null}::text is null or d.country_code = ${filters.country ?? null})
        and (${filters.city ?? null}::text is null or c.slug = ${filters.city ?? null})
        and (${filters.area ?? null}::text is null or a.slug = ${filters.area ?? null})
        and (${filters.category ?? null}::text is null or p.category::text = ${filters.category ?? null})
        and (${filters.subcategory ?? null}::text is null or p.subcategory = ${filters.subcategory ?? null})
        and (${filters.minRating ?? null}::numeric is null or p.rating_value >= ${filters.minRating ?? null})
        and (${filters.priceLevel ?? null}::int is null or p.price_level = ${filters.priceLevel ?? null})
        and (${filters.featured ?? null}::boolean is null or p.is_featured = ${filters.featured ?? null})
        and (
          ${tag}::text is null
          or exists (
            select 1 from catalog.place_tags pt
            join catalog.tags t on t.id = pt.tag_id
            where pt.place_id = p.id and t.slug = ${tag}
          )
        )
        and (
          ${filters.q ?? null}::text is null
          or p.name_en ilike '%' || ${filters.q ?? null} || '%'
          or p.name_ar ilike '%' || ${filters.q ?? null} || '%'
          or p.slug ilike '%' || ${filters.q ?? null} || '%'
        )
    `);
    const total = Number((countRes as unknown as { c: number }[])[0]?.c ?? 0);
    return { items: rows as unknown as Record<string, unknown>[], total, limit, offset };
  }

  async getPlaceBySlug(slug: string, publicOnly: boolean) {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select
        p.id, p.slug, p.name_en as "nameEn", p.name_ar as "nameAr",
        p.category, p.subcategory,
        p.short_description_en as "shortDescriptionEn",
        p.short_description_ar as "shortDescriptionAr",
        p.description_en as "descriptionEn",
        p.description_ar as "descriptionAr",
        p.destination_id as "destinationId",
        p.city_id as "cityId", p.area_id as "areaId",
        p.latitude, p.longitude, p.address_text as "addressText",
        p.contact_phone as "contactPhone",
        p.contact_email as "contactEmail",
        p.website_url as "websiteUrl",
        p.price_level as "priceLevel",
        p.rating_value as "ratingValue",
        p.rating_scale as "ratingScale",
        p.rating_source as "ratingSource",
        p.review_count as "reviewCount",
        p.rating_observed_at as "ratingObservedAt",
        p.is_featured as "isFeatured",
        p.lifecycle_status as "lifecycleStatus",
        p.verified_by as "verifiedBy",
        p.approved_by as "approvedBy",
        p.rejection_reason as "rejectionReason",
        p.external_key as "externalKey",
        p.published_at as "publishedAt",
        p.updated_at as "updatedAt",
        d.slug as "destinationSlug",
        d.country_code as "countryCode"
      from catalog.places p
      join catalog.destinations d on d.id = p.destination_id
      where p.slug = ${slug}
        and (${publicOnly} = false or p.lifecycle_status = 'published')
      limit 1
    `);
    const list = rows as unknown as Record<string, unknown>[];
    return list[0] ?? null;
  }

  async listPublicMediaForPlace(placeId: string) {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select
        m.id, m.storage_bucket as "storageBucket", m.storage_path as "storagePath",
        m.alt_text_en as "altTextEn", m.alt_text_ar as "altTextAr",
        m.attribution, pm.sort_order as "sortOrder", pm.is_cover as "isCover"
      from catalog.place_media pm
      join catalog.media_assets m on m.id = pm.media_id
      where pm.place_id = ${placeId}::uuid
        and pm.is_active = true
        and m.is_active = true
        and m.is_public = true
      order by pm.is_cover desc, pm.sort_order asc, m.created_at asc
    `);
    return rows as unknown as Record<string, unknown>[];
  }

  async listPublicTagsForPlace(placeId: string): Promise<string[]> {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select t.slug
      from catalog.place_tags pt
      join catalog.tags t on t.id = pt.tag_id
      where pt.place_id = ${placeId}::uuid
        and t.is_active = true
      order by t.slug asc
    `);
    return (rows as unknown as { slug: string }[]).map((r) => r.slug);
  }

  /**
   * Public category-specific detail for a place. Returns null when no detail row exists.
   * Never includes staff-only / provenance fields.
   */
  async getPublicPlaceDetails(
    placeId: string,
    category: string,
  ): Promise<Record<string, unknown> | null> {
    const db = this.requireDb();
    const diningCategories = new Set(['restaurant', 'cafe', 'bar', 'beach_club']);

    if (category === 'accommodation') {
      const rows = await db.execute(sql`
        select
          'accommodation' as type,
          accommodation_type as "accommodationType",
          star_rating as "starRating",
          amenities,
          room_features as "roomFeatures",
          check_in_time as "checkInTime",
          check_out_time as "checkOutTime"
        from catalog.place_accommodation_details
        where place_id = ${placeId}::uuid
        limit 1
      `);
      return (rows as unknown as Record<string, unknown>[])[0] ?? null;
    }

    if (diningCategories.has(category)) {
      const rows = await db.execute(sql`
        select
          'dining' as type,
          cuisine_types as "cuisineTypes",
          meal_types as "mealTypes",
          dietary_options as "dietaryOptions",
          opening_hours as "openingHours"
        from catalog.place_dining_details
        where place_id = ${placeId}::uuid
        limit 1
      `);
      return (rows as unknown as Record<string, unknown>[])[0] ?? null;
    }

    if (category === 'attraction') {
      const rows = await db.execute(sql`
        select
          'attraction' as type,
          attraction_type as "attractionType",
          typical_duration_minutes as "typicalDurationMinutes",
          booking_required as "bookingRequired",
          suitable_for as "suitableFor",
          seasonal_notes as "seasonalNotes"
        from catalog.place_attraction_details
        where place_id = ${placeId}::uuid
        limit 1
      `);
      return (rows as unknown as Record<string, unknown>[])[0] ?? null;
    }

    if (category === 'activity') {
      const rows = await db.execute(sql`
        select
          'activity' as type,
          activity_type as "activityType",
          typical_duration_minutes as "typicalDurationMinutes",
          booking_required as "bookingRequired",
          suitable_for as "suitableFor",
          seasonal_availability as "seasonalAvailability"
        from catalog.place_activity_details
        where place_id = ${placeId}::uuid
        limit 1
      `);
      return (rows as unknown as Record<string, unknown>[])[0] ?? null;
    }

    if (category === 'nightlife') {
      const rows = await db.execute(sql`
        select
          'nightlife' as type,
          venue_type as "venueType",
          music_genres as "musicGenres",
          age_restriction as "ageRestriction",
          event_notes as "eventNotes"
        from catalog.place_nightlife_details
        where place_id = ${placeId}::uuid
        limit 1
      `);
      const row = (rows as unknown as Record<string, unknown>[])[0];
      if (!row) return null;
      // age_restriction_verified is staff-only — never selected
      return row;
    }

    if (category === 'transport') {
      const rows = await db.execute(sql`
        select
          'transport' as type,
          transport_type as "transportType",
          service_notes as "serviceNotes"
        from catalog.place_transport_details
        where place_id = ${placeId}::uuid
        limit 1
      `);
      return (rows as unknown as Record<string, unknown>[])[0] ?? null;
    }

    return null;
  }

  async listTags(activeOnly: boolean) {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select id, slug, name_en as "nameEn", name_ar as "nameAr",
             category::text as category, is_active as "isActive"
      from catalog.tags
      where (${activeOnly} = false or is_active = true)
      order by slug asc
    `);
    return rows as unknown as Record<string, unknown>[];
  }

  async createPlace(input: {
    destinationId: string;
    category: PlaceCategory;
    subcategory: string;
    slug: string;
    nameEn: string;
    nameAr: string;
    shortDescriptionEn?: string;
    descriptionEn?: string;
    externalKey?: string;
    actorId: string;
  }) {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      insert into catalog.places (
        destination_id, category, subcategory, slug, name_en, name_ar,
        short_description_en, description_en, external_key, lifecycle_status
      ) values (
        ${input.destinationId}::uuid,
        ${input.category}::catalog.place_category,
        ${input.subcategory},
        ${input.slug},
        ${input.nameEn},
        ${input.nameAr},
        ${input.shortDescriptionEn ?? null},
        ${input.descriptionEn ?? null},
        ${input.externalKey ?? null},
        'draft'
      )
      returning id, slug, lifecycle_status as "lifecycleStatus"
    `);
    return (rows as unknown as Record<string, unknown>[])[0];
  }

  async getPlaceLifecycle(id: string) {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select id, lifecycle_status as "lifecycleStatus", slug, name_en as "nameEn"
      from catalog.places where id = ${id}::uuid
    `);
    return (rows as unknown as Record<string, unknown>[])[0] ?? null;
  }

  async transitionPlace(input: {
    id: string;
    to: LifecycleStatus;
    actorId: string;
    rejectionReason?: string;
  }) {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      update catalog.places set
        lifecycle_status = ${input.to}::catalog.lifecycle_status,
        verified_by = case when ${input.to} = 'verified' then ${input.actorId}::uuid else verified_by end,
        verified_at = case when ${input.to} = 'verified' then now() else verified_at end,
        approved_by = case when ${input.to} = 'approved' then ${input.actorId}::uuid else approved_by end,
        approved_at = case when ${input.to} = 'approved' then now() else approved_at end,
        rejected_by = case when ${input.to} = 'rejected' then ${input.actorId}::uuid else rejected_by end,
        rejected_at = case when ${input.to} = 'rejected' then now() else rejected_at end,
        rejection_reason = case
          when ${input.to} = 'rejected' then ${input.rejectionReason ?? null}
          else rejection_reason
        end,
        archived_at = case when ${input.to} = 'archived' then now() else archived_at end,
        published_at = case
          when ${input.to} = 'published' then coalesce(published_at, now())
          else published_at
        end
      where id = ${input.id}::uuid
      returning id, slug, lifecycle_status as "lifecycleStatus"
    `);
    return (rows as unknown as Record<string, unknown>[])[0] ?? null;
  }

  async findPlaceByExternalKey(externalKey: string) {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select id, slug, lifecycle_status as "lifecycleStatus", external_key as "externalKey"
      from catalog.places where external_key = ${externalKey}
      limit 1
    `);
    return (rows as unknown as Record<string, unknown>[])[0] ?? null;
  }

  async findDestinationBySlug(slug: string) {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select id, slug, lifecycle_status as "lifecycleStatus"
      from catalog.destinations where slug = ${slug} limit 1
    `);
    return (rows as unknown as Record<string, unknown>[])[0] ?? null;
  }

  async insertImportRun(input: {
    actorUserId: string;
    dryRun: boolean;
    status: string;
    sourceLabel?: string;
    summary: Record<string, unknown>;
    errorReport: unknown[];
  }) {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      insert into catalog.import_runs (
        actor_user_id, dry_run, status, source_label, summary, error_report
      ) values (
        ${input.actorUserId}::uuid,
        ${input.dryRun},
        ${input.status},
        ${input.sourceLabel ?? null},
        ${JSON.stringify(input.summary)}::jsonb,
        ${JSON.stringify(input.errorReport)}::jsonb
      )
      returning id, created_at as "createdAt"
    `);
    return (rows as unknown as Record<string, unknown>[])[0];
  }

  async upsertImportedPlace(input: {
    externalKey: string;
    destinationId: string;
    category: string;
    subcategory: string;
    slug: string;
    nameEn: string;
    nameAr: string;
    shortDescriptionEn?: string;
    descriptionEn?: string;
    latitude?: number;
    longitude?: number;
    addressText?: string;
    websiteUrl?: string;
    contactPhone?: string;
    contactEmail?: string;
    priceLevel?: number;
    updateIfExists: boolean;
  }): Promise<{ id: string; action: 'created' | 'updated' | 'skipped' }> {
    const existing = await this.findPlaceByExternalKey(input.externalKey);
    const db = this.requireDb();
    if (existing) {
      if (!input.updateIfExists) {
        return { id: String(existing.id), action: 'skipped' };
      }
      await db.execute(sql`
        update catalog.places set
          name_en = ${input.nameEn},
          name_ar = ${input.nameAr},
          short_description_en = ${input.shortDescriptionEn ?? null},
          description_en = ${input.descriptionEn ?? null},
          subcategory = ${input.subcategory},
          latitude = ${input.latitude ?? null},
          longitude = ${input.longitude ?? null},
          address_text = ${input.addressText ?? null},
          website_url = ${input.websiteUrl ?? null},
          contact_phone = ${input.contactPhone ?? null},
          contact_email = ${input.contactEmail ?? null},
          price_level = ${input.priceLevel ?? null}
        where id = ${String(existing.id)}::uuid
      `);
      return { id: String(existing.id), action: 'updated' };
    }
    const rows = await db.execute(sql`
      insert into catalog.places (
        destination_id, category, subcategory, slug, name_en, name_ar,
        short_description_en, description_en, latitude, longitude,
        address_text, website_url, contact_phone, contact_email,
        price_level, external_key, lifecycle_status
      ) values (
        ${input.destinationId}::uuid,
        ${input.category}::catalog.place_category,
        ${input.subcategory},
        ${input.slug},
        ${input.nameEn},
        ${input.nameAr},
        ${input.shortDescriptionEn ?? null},
        ${input.descriptionEn ?? null},
        ${input.latitude ?? null},
        ${input.longitude ?? null},
        ${input.addressText ?? null},
        ${input.websiteUrl ?? null},
        ${input.contactPhone ?? null},
        ${input.contactEmail ?? null},
        ${input.priceLevel ?? null},
        ${input.externalKey},
        'draft'
      )
      returning id
    `);
    const createdRow = (rows as unknown as { id: string }[])[0];
    if (!createdRow?.id) {
      throw AppException.validation('Failed to insert imported place');
    }
    return { id: String(createdRow.id), action: 'created' };
  }

  async ensureSource(input: {
    sourceType: string;
    name: string;
    url?: string;
    notes?: string;
  }) {
    const db = this.requireDb();
    const existing = await db.execute(sql`
      select id from catalog.sources
      where name = ${input.name} and source_type = ${input.sourceType}::catalog.source_type
      limit 1
    `);
    const found = (existing as unknown as { id: string }[])[0];
    if (found) return found.id;
    const rows = await db.execute(sql`
      insert into catalog.sources (source_type, name, url, notes)
      values (
        ${input.sourceType}::catalog.source_type,
        ${input.name},
        ${input.url ?? null},
        ${input.notes ?? null}
      )
      returning id
    `);
    const inserted = (rows as unknown as { id: string }[])[0];
    if (!inserted?.id) {
      throw AppException.validation('Failed to insert catalog source');
    }
    return String(inserted.id);
  }

  async linkEntitySource(input: {
    entityType: string;
    entityId: string;
    sourceId: string;
    collectedAt?: string;
    notes?: string;
  }) {
    const db = this.requireDb();
    await db.execute(sql`
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

  async getDestinationById(id: string) {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select ${DESTINATION_ADMIN_COLUMNS}
      from catalog.destinations d
      where d.id = ${id}::uuid
      limit 1
    `);
    return (rows as unknown as Record<string, unknown>[])[0] ?? null;
  }

  async getDestinationLifecycle(id: string) {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select id, slug, lifecycle_status as "lifecycleStatus"
      from catalog.destinations
      where id = ${id}::uuid
      limit 1
    `);
    return (rows as unknown as Record<string, unknown>[])[0] ?? null;
  }

  async countryExists(code: string, activeOnly = true): Promise<boolean> {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select 1 as ok
      from geo.countries
      where code = ${code.toUpperCase()}
        and (${activeOnly} = false or is_active = true)
      limit 1
    `);
    return (rows as unknown as unknown[]).length > 0;
  }

  async getCity(id: string): Promise<{ id: string; countryCode: string } | null> {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select id, country_code as "countryCode"
      from geo.cities
      where id = ${id}::uuid
      limit 1
    `);
    const row = (rows as unknown as { id: string; countryCode: string }[])[0];
    return row ?? null;
  }

  /**
   * Transaction-scoped advisory lock for destination parent hierarchy mutations.
   * Call inside the same transaction, before any INSERT/UPDATE that takes
   * destination row locks when `parent_id` may change.
   */
  async lockDestinationParentHierarchy(executor: SqlExecutor): Promise<void> {
    await executor.execute(sql`
      select pg_advisory_xact_lock(hashtext(${DESTINATION_PARENT_HIERARCHY_LOCK_KEY}))
    `);
  }

  /**
   * Application-level parent-cycle check. Walking from `parentId` up the ancestor
   * chain: reject self-parent and any path that reaches `destinationId`.
   * Database trigger `catalog.enforce_destination_parent_acyclic` (Step 6.3)
   * remains the final integrity authority under concurrent writers.
   */
  async wouldCreateParentCycle(
    destinationId: string | null,
    parentId: string,
  ): Promise<boolean> {
    if (destinationId && destinationId === parentId) return true;
    const db = this.requireDb();
    const rows = await db.execute(sql`
      with recursive ancestors as (
        select id, parent_id, 1 as depth
        from catalog.destinations
        where id = ${parentId}::uuid
        union all
        select d.id, d.parent_id, a.depth + 1
        from catalog.destinations d
        join ancestors a on d.id = a.parent_id
        where a.depth < 64
      )
      select
        exists(select 1 from catalog.destinations where id = ${parentId}::uuid) as "parentExists",
        exists(
          select 1 from ancestors
          where ${destinationId ?? null}::uuid is not null
            and id = ${destinationId ?? null}::uuid
        ) as "hitsSelf",
        exists(
          select 1 from ancestors a
          join ancestors b on a.id = b.id and a.depth < b.depth
        ) as "hasLoop"
    `);
    const row = (rows as unknown as {
      parentExists: boolean;
      hitsSelf: boolean;
      hasLoop: boolean;
    }[])[0];
    if (!row?.parentExists) {
      throw AppException.validation('Parent destination not found');
    }
    return Boolean(row.hitsSelf || row.hasLoop);
  }

  async createDestination(
    input: {
      slug: string;
      nameEn: string;
      nameAr: string;
      countryCode: string;
      cityId?: string | null;
      parentId?: string | null;
      shortDescriptionEn?: string | null;
      shortDescriptionAr?: string | null;
      summaryEn?: string | null;
      summaryAr?: string | null;
      descriptionEn?: string | null;
      descriptionAr?: string | null;
      timezone?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      addressText?: string | null;
      websiteUrl?: string | null;
      isFeatured?: boolean;
      externalKey?: string | null;
    },
    tagSlugs?: string[],
  ) {
    const db = this.requireDb();
    const initialTags = tagSlugs ?? [];
    try {
      const id = await db.transaction(async (tx) => {
        // Parent set on create: lock before INSERT takes row/FK locks.
        if (input.parentId) {
          await this.lockDestinationParentHierarchy(tx);
        }
        const rows = await tx.execute(sql`
          insert into catalog.destinations (
            slug, name_en, name_ar, country_code, city_id, parent_id,
            short_description_en, short_description_ar,
            summary_en, summary_ar, description_en, description_ar,
            timezone, latitude, longitude, address_text, website_url,
            is_featured, external_key, lifecycle_status
          ) values (
            ${input.slug},
            ${input.nameEn},
            ${input.nameAr},
            ${input.countryCode.toUpperCase()},
            ${input.cityId ?? null}::uuid,
            ${input.parentId ?? null}::uuid,
            ${input.shortDescriptionEn ?? null},
            ${input.shortDescriptionAr ?? null},
            ${input.summaryEn ?? null},
            ${input.summaryAr ?? null},
            ${input.descriptionEn ?? null},
            ${input.descriptionAr ?? null},
            ${input.timezone ?? null},
            ${input.latitude ?? null},
            ${input.longitude ?? null},
            ${input.addressText ?? null},
            ${input.websiteUrl ?? null},
            ${input.isFeatured ?? false},
            ${input.externalKey ?? null},
            'draft'
          )
          returning id
        `);
        const created = (rows as unknown as { id: string }[])[0];
        if (!created?.id) throw AppException.validation('Failed to create destination');
        const destinationId = String(created.id);
        if (initialTags.length > 0) {
          await this.replaceDestinationTagsOn(tx, destinationId, initialTags);
        }
        return destinationId;
      });
      return this.getDestinationById(id);
    } catch (err) {
      if (err instanceof AppException) throw err;
      throw this.mapDestinationWriteError(err, input.slug);
    }
  }

  async updateDestination(
    id: string,
    patch: {
      slug?: string;
      nameEn?: string;
      nameAr?: string;
      shortDescriptionEn?: string | null;
      shortDescriptionAr?: string | null;
      summaryEn?: string | null;
      summaryAr?: string | null;
      descriptionEn?: string | null;
      descriptionAr?: string | null;
      countryCode?: string;
      cityId?: string | null;
      parentId?: string | null;
      timezone?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      addressText?: string | null;
      websiteUrl?: string | null;
      isFeatured?: boolean;
      externalKey?: string | null;
    },
  ) {
    const db = this.requireDb();
    const current = await this.getDestinationById(id);
    if (!current) return null;

    const next = {
      slug: patch.slug ?? String(current.slug),
      nameEn: patch.nameEn ?? String(current.nameEn),
      nameAr: patch.nameAr ?? String(current.nameAr),
      shortDescriptionEn:
        patch.shortDescriptionEn !== undefined
          ? patch.shortDescriptionEn
          : (current.shortDescriptionEn as string | null),
      shortDescriptionAr:
        patch.shortDescriptionAr !== undefined
          ? patch.shortDescriptionAr
          : (current.shortDescriptionAr as string | null),
      summaryEn:
        patch.summaryEn !== undefined ? patch.summaryEn : (current.summaryEn as string | null),
      summaryAr:
        patch.summaryAr !== undefined ? patch.summaryAr : (current.summaryAr as string | null),
      descriptionEn:
        patch.descriptionEn !== undefined
          ? patch.descriptionEn
          : (current.descriptionEn as string | null),
      descriptionAr:
        patch.descriptionAr !== undefined
          ? patch.descriptionAr
          : (current.descriptionAr as string | null),
      countryCode: (patch.countryCode ?? String(current.countryCode)).toUpperCase(),
      cityId: patch.cityId !== undefined ? patch.cityId : (current.cityId as string | null),
      parentId: patch.parentId !== undefined ? patch.parentId : (current.parentId as string | null),
      timezone: patch.timezone !== undefined ? patch.timezone : (current.timezone as string | null),
      latitude:
        patch.latitude !== undefined ? patch.latitude : (current.latitude as number | null),
      longitude:
        patch.longitude !== undefined ? patch.longitude : (current.longitude as number | null),
      addressText:
        patch.addressText !== undefined
          ? patch.addressText
          : (current.addressText as string | null),
      websiteUrl:
        patch.websiteUrl !== undefined ? patch.websiteUrl : (current.websiteUrl as string | null),
      isFeatured:
        patch.isFeatured !== undefined ? patch.isFeatured : Boolean(current.isFeatured),
      externalKey:
        patch.externalKey !== undefined
          ? patch.externalKey
          : (current.externalKey as string | null),
    };

    const parentChanging =
      patch.parentId !== undefined &&
      String(patch.parentId ?? '') !== String(current.parentId ?? '');

    const writeUpdate = async (executor: SqlExecutor) => {
      await executor.execute(sql`
        update catalog.destinations set
          slug = ${next.slug},
          name_en = ${next.nameEn},
          name_ar = ${next.nameAr},
          short_description_en = ${next.shortDescriptionEn},
          short_description_ar = ${next.shortDescriptionAr},
          summary_en = ${next.summaryEn},
          summary_ar = ${next.summaryAr},
          description_en = ${next.descriptionEn},
          description_ar = ${next.descriptionAr},
          country_code = ${next.countryCode},
          city_id = ${next.cityId}::uuid,
          parent_id = ${next.parentId}::uuid,
          timezone = ${next.timezone},
          latitude = ${next.latitude},
          longitude = ${next.longitude},
          address_text = ${next.addressText},
          website_url = ${next.websiteUrl},
          is_featured = ${next.isFeatured},
          external_key = ${next.externalKey}
        where id = ${id}::uuid
      `);
    };

    try {
      if (parentChanging) {
        // Lock before UPDATE acquires the target row lock (same key as DB trigger).
        await db.transaction(async (tx) => {
          await this.lockDestinationParentHierarchy(tx);
          await writeUpdate(tx);
        });
      } else {
        await writeUpdate(db);
      }
    } catch (err) {
      throw this.mapDestinationWriteError(err, next.slug);
    }
    return this.getDestinationById(id);
  }

  private mapDestinationWriteError(err: unknown, slug: string): Error {
    if (err instanceof AppException) return err;
    const blob = collectErrorText(err);
    const code = collectErrorCode(err);
    if (code === '40P01' || /deadlock detected/i.test(blob)) {
      return AppException.conflict(
        'Destination hierarchy update deadlocked; retry the parent change',
      );
    }
    if (
      /hierarchy cycle/i.test(blob) ||
      /cannot reference itself/i.test(blob) ||
      /parent_not_self/i.test(blob)
    ) {
      return AppException.validation('Parent destination would create a hierarchy cycle');
    }
    if (blob.includes('destinations_slug') || /unique/i.test(blob)) {
      return AppException.validation(`Destination slug already exists: ${slug}`);
    }
    return err instanceof Error ? err : new Error(blob);
  }

  /**
   * Optimistic lifecycle update: only succeeds when the row still has `from`.
   * Returns null when the destination is missing or the status changed concurrently.
   */
  async transitionDestination(input: {
    id: string;
    from: LifecycleStatus;
    to: LifecycleStatus;
    actorId: string;
    rejectionReason?: string;
  }) {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      update catalog.destinations set
        lifecycle_status = ${input.to}::catalog.lifecycle_status,
        verified_by = case when ${input.to} = 'verified' then ${input.actorId}::uuid else verified_by end,
        verified_at = case when ${input.to} = 'verified' then now() else verified_at end,
        approved_by = case when ${input.to} = 'approved' then ${input.actorId}::uuid else approved_by end,
        approved_at = case when ${input.to} = 'approved' then now() else approved_at end,
        rejected_by = case when ${input.to} = 'rejected' then ${input.actorId}::uuid else rejected_by end,
        rejected_at = case when ${input.to} = 'rejected' then now() else rejected_at end,
        rejection_reason = case
          when ${input.to} = 'rejected' then ${input.rejectionReason ?? null}
          else rejection_reason
        end,
        archived_at = case when ${input.to} = 'archived' then now() else archived_at end,
        published_at = case
          when ${input.to} = 'published' then coalesce(published_at, now())
          else published_at
        end
      where id = ${input.id}::uuid
        and lifecycle_status = ${input.from}::catalog.lifecycle_status
      returning id
    `);
    const updated = (rows as unknown as { id: string }[])[0];
    if (!updated?.id) return null;
    return this.getDestinationById(String(updated.id));
  }

  async listDestinationTags(destinationId: string) {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select t.id, t.slug, t.name_en as "nameEn", t.name_ar as "nameAr"
      from catalog.destination_tags dt
      join catalog.tags t on t.id = dt.tag_id
      where dt.destination_id = ${destinationId}::uuid
      order by t.slug asc
    `);
    return rows as unknown as { id: string; slug: string; nameEn: string; nameAr: string }[];
  }

  async listDestinationTagsForMany(destinationIds: string[]) {
    if (destinationIds.length === 0) {
      return new Map<string, { id: string; slug: string; nameEn: string; nameAr: string }[]>();
    }
    const db = this.requireDb();
    const idList = sql.join(
      destinationIds.map((id) => sql`${id}::uuid`),
      sql`,`,
    );
    const rows = await db.execute(sql`
      select
        dt.destination_id as "destinationId",
        t.id, t.slug, t.name_en as "nameEn", t.name_ar as "nameAr"
      from catalog.destination_tags dt
      join catalog.tags t on t.id = dt.tag_id
      where dt.destination_id in (${idList})
      order by t.slug asc
    `);
    const map = new Map<string, { id: string; slug: string; nameEn: string; nameAr: string }[]>();
    for (const row of rows as unknown as {
      destinationId: string;
      id: string;
      slug: string;
      nameEn: string;
      nameAr: string;
    }[]) {
      const key = String(row.destinationId);
      const list = map.get(key) ?? [];
      list.push({ id: row.id, slug: row.slug, nameEn: row.nameEn, nameAr: row.nameAr });
      map.set(key, list);
    }
    return map;
  }

  async listDestinationSources(destinationId: string) {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select
        s.id, s.source_type::text as "sourceType", s.name, s.url,
        s.reference_code as "referenceCode", s.notes,
        es.collected_at as "collectedAt",
        es.verification_status as "verificationStatus",
        es.confidence
      from catalog.entity_sources es
      join catalog.sources s on s.id = es.source_id
      where es.entity_type = 'destination'
        and es.entity_id = ${destinationId}::uuid
      order by s.name asc
    `);
    return rows as unknown as Record<string, unknown>[];
  }

  async listDestinationMedia(destinationId: string) {
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select
        m.id, m.storage_bucket as "storageBucket", m.storage_path as "storagePath",
        m.alt_text_en as "altTextEn", m.alt_text_ar as "altTextAr",
        m.attribution, dm.sort_order as "sortOrder", dm.is_cover as "isCover"
      from catalog.destination_media dm
      join catalog.media_assets m on m.id = dm.media_id
      where dm.destination_id = ${destinationId}::uuid
        and dm.is_active = true
        and m.is_active = true
      order by dm.is_cover desc, dm.sort_order asc, m.created_at asc
    `);
    return rows as unknown as Record<string, unknown>[];
  }

  /**
   * Explicit tag set replacement (D10). Empty array clears all tags.
   * Also syncs legacy destinations.tags text[] for consistency.
   */
  async replaceDestinationTags(destinationId: string, tagSlugs: string[]): Promise<void> {
    const db = this.requireDb();
    await db.transaction(async (tx) => {
      await this.replaceDestinationTagsOn(tx, destinationId, tagSlugs);
    });
  }

  private async replaceDestinationTagsOn(
    tx: Parameters<Parameters<DrizzleClient['transaction']>[0]>[0],
    destinationId: string,
    tagSlugs: string[],
  ): Promise<void> {
    const uniqueSlugs = [...new Set(tagSlugs.map((s) => s.trim()).filter(Boolean))];

    await tx.execute(sql`
      delete from catalog.destination_tags
      where destination_id = ${destinationId}::uuid
    `);

    for (const slug of uniqueSlugs) {
      const existing = await tx.execute(sql`
        select id, is_active as "isActive"
        from catalog.tags
        where slug = ${slug}
        limit 1
      `);
      const found = (existing as unknown as { id: string; isActive: boolean }[])[0];
      if (!found) {
        throw AppException.validation(`Unknown tag slug: ${slug}`);
      }
      if (!found.isActive) {
        throw AppException.validation(`Tag is inactive: ${slug}`);
      }
      await tx.execute(sql`
        insert into catalog.destination_tags (destination_id, tag_id)
        values (${destinationId}::uuid, ${String(found.id)}::uuid)
        on conflict do nothing
      `);
    }

    const tagsArray =
      uniqueSlugs.length === 0
        ? sql`'{}'::text[]`
        : sql`ARRAY[${sql.join(
            uniqueSlugs.map((v) => sql`${v}`),
            sql`,`,
          )}]::text[]`;
    await tx.execute(sql`
      update catalog.destinations
      set tags = ${tagsArray}
      where id = ${destinationId}::uuid
    `);
  }

  async listCountries(filters: {
    active?: boolean;
    q?: string;
    limit: number;
    offset: number;
  }) {
    const db = this.requireDb();
    const limit = Math.min(Math.max(filters.limit, 1), 100);
    const offset = Math.max(filters.offset, 0);
    const active = filters.active;
    const where = sql`
      (${active === undefined ? null : active}::boolean is null or is_active = ${active === undefined ? null : active})
      and (
        ${filters.q ?? null}::text is null
        or name_en ilike '%' || ${filters.q ?? null} || '%'
        or name_ar ilike '%' || ${filters.q ?? null} || '%'
        or code ilike '%' || ${filters.q ?? null} || '%'
      )
    `;
    const rows = await db.execute(sql`
      select
        code, name_en as "nameEn", name_ar as "nameAr",
        default_currency as "defaultCurrency", phone_code as "phoneCode",
        is_active as "isActive"
      from geo.countries
      where ${where}
      order by name_en asc, code asc
      limit ${limit} offset ${offset}
    `);
    const countRes = await db.execute(sql`
      select count(*)::int as c from geo.countries where ${where}
    `);
    const total = Number((countRes as unknown as { c: number }[])[0]?.c ?? 0);
    return { items: rows as unknown as Record<string, unknown>[], total, limit, offset };
  }

  async listCities(filters: {
    country?: string;
    q?: string;
    limit: number;
    offset: number;
  }) {
    const db = this.requireDb();
    const limit = Math.min(Math.max(filters.limit, 1), 100);
    const offset = Math.max(filters.offset, 0);
    const country = filters.country?.toUpperCase() ?? null;
    if (country) {
      const exists = await this.countryExists(country, false);
      if (!exists) {
        throw AppException.validation(`Unknown country code: ${country}`);
      }
    }
    const where = sql`
      (${country}::text is null or country_code = ${country})
      and (
        ${filters.q ?? null}::text is null
        or name_en ilike '%' || ${filters.q ?? null} || '%'
        or name_ar ilike '%' || ${filters.q ?? null} || '%'
        or slug ilike '%' || ${filters.q ?? null} || '%'
      )
    `;
    const rows = await db.execute(sql`
      select
        id, country_code as "countryCode", region_id as "regionId",
        slug, name_en as "nameEn", name_ar as "nameAr",
        timezone, latitude, longitude, is_active as "isActive"
      from geo.cities
      where ${where}
      order by name_en asc, slug asc
      limit ${limit} offset ${offset}
    `);
    const countRes = await db.execute(sql`
      select count(*)::int as c from geo.cities where ${where}
    `);
    const total = Number((countRes as unknown as { c: number }[])[0]?.c ?? 0);
    return { items: rows as unknown as Record<string, unknown>[], total, limit, offset };
  }
}

function collectErrorText(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 5; depth += 1) {
    if (cur instanceof Error) {
      parts.push(cur.message);
      cur = cur.cause;
      continue;
    }
    if (cur && typeof cur === 'object' && 'message' in cur) {
      parts.push(String((cur as { message: unknown }).message));
    }
    break;
  }
  return parts.join('\n');
}

function collectErrorCode(err: unknown): string {
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 5; depth += 1) {
    if (cur && typeof cur === 'object' && 'code' in cur && (cur as { code: unknown }).code) {
      return String((cur as { code: unknown }).code);
    }
    cur = cur instanceof Error ? cur.cause : undefined;
  }
  return '';
}
