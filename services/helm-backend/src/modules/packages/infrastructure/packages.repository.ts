import { Inject, Injectable, Optional } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { AppException } from '../../../common/errors/app.exception';
import { DRIZZLE, type DrizzleClient } from '../../../infrastructure/adapters/drizzle/drizzle.client';
import { PACKAGE_COVER_BUCKET } from '../../../infrastructure/ports/storage.port';

export type PackageRow = {
  id: string;
  destinationId: string;
  destinationSlug: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  summaryEn: string | null;
  summaryAr: string | null;
  durationDays: number;
  publishStatus: 'unpublished' | 'published';
  marketCode: string;
  content: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

const packageProjection = sql`
  p.id::text as id,
  p.destination_id::text as "destinationId",
  d.slug as "destinationSlug",
  p.slug,
  p.title_en as "titleEn",
  p.title_ar as "titleAr",
  p.summary_en as "summaryEn",
  p.summary_ar as "summaryAr",
  p.duration_days as "durationDays",
  p.publish_status as "publishStatus",
  p.market_code as "marketCode",
  p.content,
  to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "createdAt",
  to_char(p.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "updatedAt"
`;

@Injectable()
export class PackagesRepository {
  constructor(@Optional() @Inject(DRIZZLE) private readonly db?: DrizzleClient) {}

  private requireDb(): DrizzleClient {
    if (!this.db) {
      throw AppException.validation('Packages database is not configured (DATABASE_URL)');
    }
    return this.db;
  }

  async list(opts: { publishedOnly: boolean; buildCompatibleOnly: boolean }): Promise<PackageRow[]> {
    const rows = await this.requireDb().execute<PackageRow>(sql`
      select ${packageProjection}
      from packages.packages p
      join catalog.destinations d on d.id = p.destination_id
      where (${opts.publishedOnly} = false or p.publish_status = 'published')
        and (
          ${opts.buildCompatibleOnly} = false
          or (
            p.content is not null
            and (p.content ->> 'version')::int = 1
            and p.content ->> 'kind' in ('ubud_trip_preview', 'trip_preview')
          )
        )
      order by p.updated_at desc, p.slug asc
      limit 100
    `);
    return [...rows];
  }

  async getById(id: string): Promise<PackageRow | null> {
    const rows = await this.requireDb().execute<PackageRow>(sql`
      select ${packageProjection}
      from packages.packages p
      join catalog.destinations d on d.id = p.destination_id
      where p.id = ${id}::uuid
      limit 1
    `);
    return rows[0] ?? null;
  }

  async getBySlug(slug: string, publishedOnly: boolean): Promise<PackageRow | null> {
    const rows = await this.requireDb().execute<PackageRow>(sql`
      select ${packageProjection}
      from packages.packages p
      join catalog.destinations d on d.id = p.destination_id
      where p.slug = ${slug}
        and (${publishedOnly} = false or p.publish_status = 'published')
      limit 1
    `);
    return rows[0] ?? null;
  }

  async create(input: {
    destinationId: string;
    slug: string;
    titleEn: string;
    titleAr: string;
    summaryEn: string | null;
    summaryAr: string | null;
    durationDays: number;
    marketCode: string;
    content: Record<string, unknown> | null;
  }): Promise<PackageRow> {
    const rows = await this.requireDb().execute<PackageRow>(sql`
      with inserted as (
        insert into packages.packages (
          destination_id, slug, title_en, title_ar, summary_en, summary_ar,
          duration_days, publish_status, market_code, content
        ) values (
          ${input.destinationId}::uuid,
          ${input.slug},
          ${input.titleEn},
          ${input.titleAr},
          ${input.summaryEn},
          ${input.summaryAr},
          ${input.durationDays},
          'unpublished',
          ${input.marketCode},
          ${input.content === null ? sql`null` : sql`${JSON.stringify(input.content)}::jsonb`}
        )
        returning *
      )
      select ${packageProjection}
      from inserted p
      join catalog.destinations d on d.id = p.destination_id
    `);
    if (!rows[0]) throw AppException.validation('Could not create package');
    return rows[0];
  }

  async updateUnpublished(
    id: string,
    input: {
      titleEn?: string;
      titleAr?: string;
      summaryEn?: string | null;
      summaryAr?: string | null;
      durationDays?: number;
      content?: Record<string, unknown> | null;
    },
  ): Promise<PackageRow> {
    const sets = [sql`updated_at = now()`];
    if (input.titleEn !== undefined) sets.push(sql`title_en = ${input.titleEn}`);
    if (input.titleAr !== undefined) sets.push(sql`title_ar = ${input.titleAr}`);
    if (input.summaryEn !== undefined) {
      sets.push(sql`summary_en = ${input.summaryEn}`);
    }
    if (input.summaryAr !== undefined) {
      sets.push(sql`summary_ar = ${input.summaryAr}`);
    }
    if (input.durationDays !== undefined) {
      sets.push(sql`duration_days = ${input.durationDays}`);
    }
    if (input.content !== undefined) {
      sets.push(
        input.content === null
          ? sql`content = null`
          : sql`content = ${JSON.stringify(input.content)}::jsonb`,
      );
    }

    const rows = await this.requireDb().execute<PackageRow>(sql`
      with updated as (
        update packages.packages
        set ${sql.join(sets, sql`, `)}
        where id = ${id}::uuid and publish_status = 'unpublished'
        returning *
      )
      select ${packageProjection}
      from updated p
      join catalog.destinations d on d.id = p.destination_id
    `);
    if (!rows[0]) {
      throw AppException.conflict('Unpublish the package before editing');
    }
    return rows[0];
  }

  async setPublishStatus(
    id: string,
    from: 'unpublished' | 'published',
    to: 'unpublished' | 'published',
  ): Promise<PackageRow> {
    const rows = await this.requireDb().execute<PackageRow>(sql`
      with updated as (
        update packages.packages
        set publish_status = ${to}, updated_at = now()
        where id = ${id}::uuid and publish_status = ${from}
        returning *
      )
      select ${packageProjection}
      from updated p
      join catalog.destinations d on d.id = p.destination_id
    `);
    if (!rows[0]) {
      throw AppException.conflict(
        to === 'published'
          ? 'Package could not be published from its current status'
          : 'Package could not be unpublished from its current status',
      );
    }
    return rows[0];
  }

  async listPublishedPlaceSlugs(destinationId: string, slugs: string[]): Promise<string[]> {
    if (slugs.length === 0) return [];
    const slugArray = sql`ARRAY[${sql.join(
      slugs.map((slug) => sql`${slug}`),
      sql`,`,
    )}]::text[]`;
    const rows = await this.requireDb().execute<{ slug: string }>(sql`
      select p.slug
      from catalog.places p
      where p.destination_id = ${destinationId}::uuid
        and p.lifecycle_status = 'published'
        and p.slug = any(${slugArray})
    `);
    return rows.map((row) => row.slug);
  }

  async listPackageMedia(packageId: string) {
    const rows = await this.requireDb().execute(sql`
      select
        m.id, m.storage_bucket as "storageBucket", m.storage_path as "storagePath",
        m.alt_text_en as "altTextEn", m.alt_text_ar as "altTextAr",
        m.attribution, pm.sort_order as "sortOrder", pm.is_cover as "isCover"
      from packages.package_media pm
      join catalog.media_assets m on m.id = pm.media_id
      where pm.package_id = ${packageId}::uuid
        and pm.is_active = true
        and m.is_active = true
      order by pm.is_cover desc, pm.sort_order asc, m.created_at asc
    `);
    return rows as unknown as Record<string, unknown>[];
  }

  async listPublicPackageCovers(packageIds: string[]) {
    if (packageIds.length === 0) {
      return new Map<
        string,
        {
          packageId: string;
          storageBucket: string;
          storagePath: string;
          altTextEn: string | null;
          altTextAr: string | null;
        }
      >();
    }
    const db = this.requireDb();
    const rows = await db.execute(sql`
      select
        pm.package_id as "packageId",
        m.storage_bucket as "storageBucket",
        m.storage_path as "storagePath",
        m.alt_text_en as "altTextEn",
        m.alt_text_ar as "altTextAr"
      from packages.package_media pm
      join packages.packages p on p.id = pm.package_id and p.publish_status = 'published'
      join catalog.media_assets m on m.id = pm.media_id
      where pm.package_id in (${sql.join(
        packageIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})
        and pm.is_active = true
        and pm.is_cover = true
        and m.is_active = true
        and m.is_public = true
        and m.storage_bucket = ${PACKAGE_COVER_BUCKET}
    `);
    const map = new Map<
      string,
      {
        packageId: string;
        storageBucket: string;
        storagePath: string;
        altTextEn: string | null;
        altTextAr: string | null;
      }
    >();
    for (const row of rows as unknown as {
      packageId: string;
      storageBucket: string;
      storagePath: string;
      altTextEn: string | null;
      altTextAr: string | null;
    }[]) {
      map.set(String(row.packageId), row);
    }
    return map;
  }

  async getActivePackageCover(packageId: string) {
    const map = await this.listPublicPackageCovers([packageId]);
    return map.get(packageId) ?? null;
  }

  async countActiveMediaReferences(mediaId: string): Promise<number> {
    const rows = await this.requireDb().execute(sql`
      select (
        (select count(*)::int from catalog.destination_media
          where media_id = ${mediaId}::uuid and is_active = true)
        +
        (select count(*)::int from catalog.place_media
          where media_id = ${mediaId}::uuid and is_active = true)
        +
        (select count(*)::int from packages.package_media
          where media_id = ${mediaId}::uuid and is_active = true)
      ) as c
    `);
    return Number((rows as unknown as { c: number }[])[0]?.c ?? 0);
  }

  async deactivateMediaAsset(mediaId: string): Promise<void> {
    await this.requireDb().execute(sql`
      update catalog.media_assets
      set is_active = false, is_public = false, updated_at = now()
      where id = ${mediaId}::uuid
    `);
  }

  async replacePackageCover(input: {
    packageId: string;
    mediaId: string;
    storageBucket: string;
    storagePath: string;
    mimeType: string;
    byteSize: number;
    altTextEn: string;
    altTextAr: string | null;
  }): Promise<{
    mediaId: string;
    replaced: Array<{
      mediaId: string;
      storageBucket: string;
      storagePath: string;
    }>;
  }> {
    const db = this.requireDb();
    try {
      return await db.transaction(async (tx) => {
        const locked = await tx.execute(sql`
          select id
          from packages.packages
          where id = ${input.packageId}::uuid
          for update
        `);
        if ((locked as unknown as unknown[]).length === 0) {
          throw AppException.notFound('Package not found');
        }

        await tx.execute(sql`
          insert into catalog.media_assets (
            id, storage_bucket, storage_path, mime_type, byte_size,
            alt_text_en, alt_text_ar, is_public, is_active
          ) values (
            ${input.mediaId}::uuid,
            ${input.storageBucket},
            ${input.storagePath},
            ${input.mimeType},
            ${input.byteSize},
            ${input.altTextEn},
            ${input.altTextAr},
            true,
            true
          )
        `);

        const deactivated = await tx.execute(sql`
          update packages.package_media pm
          set is_active = false, is_cover = false
          where pm.package_id = ${input.packageId}::uuid
            and pm.is_active = true
            and pm.is_cover = true
          returning pm.media_id as "mediaId"
        `);

        const replacedIds = (deactivated as unknown as { mediaId: string }[]).map((r) =>
          String(r.mediaId),
        );

        await tx.execute(sql`
          insert into packages.package_media (
            package_id, media_id, sort_order, is_cover, is_active
          ) values (
            ${input.packageId}::uuid,
            ${input.mediaId}::uuid,
            0,
            true,
            true
          )
        `);

        const replaced: Array<{
          mediaId: string;
          storageBucket: string;
          storagePath: string;
        }> = [];
        for (const mediaId of replacedIds) {
          if (mediaId === input.mediaId) continue;
          const assetRows = await tx.execute(sql`
            select
              id as "mediaId",
              storage_bucket as "storageBucket",
              storage_path as "storagePath"
            from catalog.media_assets
            where id = ${mediaId}::uuid
            limit 1
          `);
          const asset = (assetRows as unknown as {
            mediaId: string;
            storageBucket: string;
            storagePath: string;
          }[])[0];
          if (asset) replaced.push(asset);
        }

        return { mediaId: input.mediaId, replaced };
      });
    } catch (err) {
      if (err instanceof AppException) throw err;
      const blob = collectPackageRepoErrorText(err);
      const code = collectPackageRepoErrorCode(err);
      if (code === '23505' || /uq_package_media_cover|unique/i.test(blob)) {
        throw AppException.conflict(
          'Another cover update is in progress; retry the upload',
        );
      }
      throw err instanceof Error ? err : new Error(blob);
    }
  }

  async updatePackageCoverAltTexts(
    packageId: string,
    input: { altTextEn: string; altTextAr: string | null },
  ): Promise<{ mediaId: string } | null> {
    return this.requireDb().transaction(async (tx) => {
      const rows = await tx.execute(sql`
        select pm.media_id as "mediaId"
        from packages.package_media pm
        join catalog.media_assets m on m.id = pm.media_id
        where pm.package_id = ${packageId}::uuid
          and pm.is_active = true
          and pm.is_cover = true
          and m.is_active = true
        for update of pm
        limit 1
      `);
      const current = (rows as unknown as { mediaId: string }[])[0];
      if (!current) return null;

      await tx.execute(sql`
        update catalog.media_assets
        set
          alt_text_en = ${input.altTextEn},
          alt_text_ar = ${input.altTextAr},
          updated_at = now()
        where id = ${current.mediaId}::uuid
      `);
      return { mediaId: String(current.mediaId) };
    });
  }

  async deactivatePackageCover(packageId: string): Promise<{
    mediaId: string;
    storageBucket: string;
    storagePath: string;
  } | null> {
    return this.requireDb().transaction(async (tx) => {
      await tx.execute(sql`
        select id from packages.packages
        where id = ${packageId}::uuid
        for update
      `);

      const rows = await tx.execute(sql`
        update packages.package_media pm
        set is_active = false, is_cover = false
        where pm.package_id = ${packageId}::uuid
          and pm.is_active = true
          and pm.is_cover = true
        returning pm.media_id as "mediaId"
      `);
      const deactivated = (rows as unknown as { mediaId: string }[])[0];
      if (!deactivated) return null;

      const assetRows = await tx.execute(sql`
        select
          id as "mediaId",
          storage_bucket as "storageBucket",
          storage_path as "storagePath"
        from catalog.media_assets
        where id = ${deactivated.mediaId}::uuid
        limit 1
      `);
      const asset = (assetRows as unknown as {
        mediaId: string;
        storageBucket: string;
        storagePath: string;
      }[])[0];
      return asset ?? null;
    });
  }
}

function collectPackageRepoErrorText(err: unknown): string {
  if (err instanceof Error) return `${err.message} ${err.cause ?? ''}`;
  return String(err);
}

function collectPackageRepoErrorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    return String((err as { code: unknown }).code);
  }
  return undefined;
}
