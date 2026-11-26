import { Inject, Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception';
import {
  isBuildCompatiblePackageContent,
  parseUbudPackageContent,
  requiredPublishedSlugs,
} from '../domain/ubud-package-content';
import { PackagesRepository, type PackageRow } from '../infrastructure/packages.repository';

export type PackagePublic = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  summaryEn: string | null;
  summaryAr: string | null;
  durationDays: number;
  destinationSlug: string;
  content: Record<string, unknown>;
};

export type PackageAdmin = PackageRow;

function toPublic(row: PackageRow): PackagePublic {
  if (!row.content || !isBuildCompatiblePackageContent(row.content)) {
    throw AppException.notFound('Package not found');
  }
  return {
    id: row.id,
    slug: row.slug,
    titleEn: row.titleEn,
    titleAr: row.titleAr,
    summaryEn: row.summaryEn,
    summaryAr: row.summaryAr,
    durationDays: row.durationDays,
    destinationSlug: row.destinationSlug,
    content: row.content,
  };
}

@Injectable()
export class PackagesService {
  constructor(@Inject(PackagesRepository) private readonly packages: PackagesRepository) {}

  async listPublic(): Promise<{ items: PackagePublic[] }> {
    const rows = await this.packages.list({
      publishedOnly: true,
      buildCompatibleOnly: true,
    });
    return {
      items: rows
        .filter((row) => row.content && isBuildCompatiblePackageContent(row.content))
        .map((row) => toPublic(row)),
    };
  }

  async getPublicBySlug(slug: string): Promise<PackagePublic> {
    const row = await this.packages.getBySlug(slug, true);
    if (!row) throw AppException.notFound('Package not found');
    return toPublic(row);
  }

  async listAdmin(): Promise<{ items: PackageAdmin[] }> {
    const items = await this.packages.list({
      publishedOnly: false,
      buildCompatibleOnly: false,
    });
    return { items };
  }

  async getAdmin(id: string): Promise<PackageAdmin> {
    const row = await this.packages.getById(id);
    if (!row) throw AppException.notFound('Package not found');
    return row;
  }

  async create(input: {
    destinationId: string;
    slug: string;
    titleEn: string;
    titleAr: string;
    summaryEn?: string | null;
    summaryAr?: string | null;
    marketCode?: string;
    content?: Record<string, unknown> | null;
  }): Promise<PackageAdmin> {
    let content: Record<string, unknown> | null = input.content ?? null;
    let durationDays = 5;
    if (content !== null) {
      const parsed = parseUbudPackageContent(content);
      content = parsed as unknown as Record<string, unknown>;
      durationDays = parsed.answers.nights;
    }
    try {
      return await this.packages.create({
        destinationId: input.destinationId,
        slug: input.slug,
        titleEn: input.titleEn,
        titleAr: input.titleAr,
        summaryEn: input.summaryEn ?? null,
        summaryAr: input.summaryAr ?? null,
        durationDays,
        marketCode: input.marketCode ?? 'EG_OUTBOUND',
        content,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('packages_slug') || message.includes('unique')) {
        throw AppException.conflict('A package with this slug already exists');
      }
      throw error;
    }
  }

  async update(
    id: string,
    input: {
      titleEn?: string;
      titleAr?: string;
      summaryEn?: string | null;
      summaryAr?: string | null;
      content?: Record<string, unknown> | null;
    },
  ): Promise<PackageAdmin> {
    const existing = await this.getAdmin(id);
    if (existing.publishStatus === 'published') {
      throw AppException.conflict('Unpublish the package before editing');
    }

    let durationDays: number | undefined;
    let content = input.content;
    if (content !== undefined && content !== null) {
      const parsed = parseUbudPackageContent(content);
      content = parsed as unknown as Record<string, unknown>;
      durationDays = parsed.answers.nights;
    } else if (content === null) {
      durationDays = existing.durationDays;
    }

    return this.packages.updateUnpublished(id, {
      titleEn: input.titleEn,
      titleAr: input.titleAr,
      summaryEn: input.summaryEn,
      summaryAr: input.summaryAr,
      durationDays,
      content,
    });
  }

  async unpublish(id: string): Promise<PackageAdmin> {
    await this.getAdmin(id);
    return this.packages.setPublishStatus(id, 'published', 'unpublished');
  }

  async publish(id: string): Promise<PackageAdmin> {
    const existing = await this.getAdmin(id);
    if (existing.publishStatus === 'published') {
      return existing;
    }
    if (!existing.content) {
      throw AppException.validation('Add Build-compatible package content before publishing');
    }
    if (existing.destinationSlug !== 'ubud') {
      throw AppException.validation('v1 package publishing supports the Ubud destination only');
    }

    const parsed = parseUbudPackageContent(existing.content);
    if (parsed.answers.destination !== 'ubud' && parsed.answers.destination !== 'surprise') {
      throw AppException.validation('Package trip destination must be Ubud or surprise→Ubud');
    }

    const needed = requiredPublishedSlugs(parsed);
    const published = await this.packages.listPublishedPlaceSlugs(
      existing.destinationId,
      needed,
    );
    const missing = needed.filter((slug) => !published.includes(slug));
    if (missing.length > 0) {
      throw AppException.validation(
        `Hotel and itinerary stops must be published Ubud places (missing: ${missing.join(', ')})`,
      );
    }

    return this.packages.setPublishStatus(id, 'unpublished', 'published');
  }
}
