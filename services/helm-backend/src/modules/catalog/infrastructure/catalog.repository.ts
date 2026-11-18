import { Inject, Injectable, Optional } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleClient } from '../../../infrastructure/adapters/drizzle/drizzle.client';
import { AppException } from '../../../common/errors/app.exception';
import type { LifecycleStatus } from '../domain/lifecycle';
import type { PlaceCategory } from '../domain/categories';

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
  limit: number;
  offset: number;
  publicOnly: boolean;
};

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
    const rows = await db.execute(sql`
      select
        d.id, d.slug, d.name_en as "nameEn", d.name_ar as "nameAr",
        d.summary_en as "summaryEn", d.summary_ar as "summaryAr",
        d.country_code as "countryCode", d.city_id as "cityId",
        d.timezone, d.latitude, d.longitude, d.is_featured as "isFeatured",
        d.tags, d.lifecycle_status as "lifecycleStatus",
        d.published_at as "publishedAt", d.updated_at as "updatedAt"
      from catalog.destinations d
      where
        (${filters.publicOnly} = false or d.lifecycle_status = 'published')
        and (${filters.country ?? null}::text is null or d.country_code = ${filters.country ?? null})
        and (${filters.featured ?? null}::boolean is null or d.is_featured = ${filters.featured ?? null})
        and (
          ${filters.q ?? null}::text is null
          or d.name_en ilike '%' || ${filters.q ?? null} || '%'
          or d.name_ar ilike '%' || ${filters.q ?? null} || '%'
          or d.slug ilike '%' || ${filters.q ?? null} || '%'
        )
      order by d.is_featured desc, d.slug asc
      limit ${limit} offset ${offset}
    `);
    const countRes = await db.execute(sql`
      select count(*)::int as c
      from catalog.destinations d
      where
        (${filters.publicOnly} = false or d.lifecycle_status = 'published')
        and (${filters.country ?? null}::text is null or d.country_code = ${filters.country ?? null})
        and (${filters.featured ?? null}::boolean is null or d.is_featured = ${filters.featured ?? null})
        and (
          ${filters.q ?? null}::text is null
          or d.name_en ilike '%' || ${filters.q ?? null} || '%'
          or d.name_ar ilike '%' || ${filters.q ?? null} || '%'
          or d.slug ilike '%' || ${filters.q ?? null} || '%'
        )
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
}
