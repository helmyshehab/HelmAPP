import { Inject, Injectable, Optional } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { AppException } from '../../../common/errors/app.exception';
import { DRIZZLE, type DrizzleClient } from '../../../infrastructure/adapters/drizzle/drizzle.client';

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
}
