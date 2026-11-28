import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception';
import { StructuredLogger } from '../../../common/logging/structured-logger';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';
import {
  CATALOG_COVER_URL_TTL_SECONDS,
  PACKAGE_COVER_BUCKET,
  STORAGE_PORT,
  type StoragePort,
} from '../../../infrastructure/ports/storage.port';
import {
  buildPackageCoverObjectPath,
  validateCatalogCoverImage,
} from '../../../infrastructure/storage/catalog-media';
import { AuditService } from '../../audit/audit.service';
import {
  toPublicCatalogCover,
  type CatalogCoverPublic,
} from '../../catalog/application/destination-cover.mapper';
import {
  expectedDestinationSlugForContent,
  isBuildCompatiblePackageContent,
  parseBuildCompatiblePackageContent,
  requiredPublishedSlugs,
} from '../domain/trip-preview-content';
import { PackagesRepository, type PackageRow } from '../infrastructure/packages.repository';

export type PackageCoverUploadFile = {
  buffer: Buffer | Uint8Array;
  mimetype?: string;
  size?: number;
};

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
  cover?: CatalogCoverPublic;
};

export type PackageAdmin = PackageRow & {
  media?: Record<string, unknown>[];
  coverPreviewUrl?: string;
};

function toPublic(
  row: PackageRow,
  cover?: CatalogCoverPublic,
): PackagePublic {
  if (!row.content || !isBuildCompatiblePackageContent(row.content)) {
    throw AppException.notFound('Package not found');
  }
  const base: PackagePublic = {
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
  if (cover) base.cover = cover;
  return base;
}

@Injectable()
export class PackagesService {
  constructor(
    @Inject(PackagesRepository) private readonly packages: PackagesRepository,
    @Inject(AuditService) private readonly audit: AuditService,
    @Optional() @Inject(STORAGE_PORT) private readonly storage?: StoragePort | null,
    @Optional() @Inject(StructuredLogger) private readonly logger?: StructuredLogger,
  ) {}

  private requireStorage(): StoragePort {
    if (!this.storage) {
      throw AppException.validation('Object storage is not configured');
    }
    return this.storage;
  }

  private assertAdmin(actor: AuthPrincipal) {
    if (!this.isAdmin(actor)) {
      throw AppException.forbidden('Administrator authorization required');
    }
  }

  private isAdmin(actor: AuthPrincipal) {
    return (
      actor.rolesSource === 'database' &&
      (actor.roles.includes('administrator') || actor.roles.includes('super-administrator'))
    );
  }

  async listPublic(): Promise<{ items: PackagePublic[] }> {
    const rows = await this.packages.list({
      publishedOnly: true,
      buildCompatibleOnly: true,
    });
    const compatible = rows.filter(
      (row) => row.content && isBuildCompatiblePackageContent(row.content),
    );
    const coverById = await this.packages.listPublicPackageCovers(
      compatible.map((row) => row.id),
    );
    const items = await Promise.all(
      compatible.map(async (row) => {
        const coverRow = coverById.get(row.id);
        const cover = await this.resolvePublicCover(coverRow);
        return toPublic(row, cover);
      }),
    );
    return { items };
  }

  async getPublicBySlug(slug: string): Promise<PackagePublic> {
    const row = await this.packages.getBySlug(slug, true);
    if (!row) throw AppException.notFound('Package not found');
    const coverRow = await this.packages.getActivePackageCover(row.id);
    const cover = await this.resolvePublicCover(coverRow);
    return toPublic(row, cover);
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
    return this.hydratePackageAdmin(row);
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
      const parsed = parseBuildCompatiblePackageContent(content);
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
      const parsed = parseBuildCompatiblePackageContent(content);
      content = parsed as unknown as Record<string, unknown>;
      durationDays = parsed.answers.nights;
    } else if (content === null) {
      durationDays = existing.durationDays;
    }

    const row = await this.packages.updateUnpublished(id, {
      titleEn: input.titleEn,
      titleAr: input.titleAr,
      summaryEn: input.summaryEn,
      summaryAr: input.summaryAr,
      durationDays,
      content,
    });
    return this.hydratePackageAdmin(row);
  }

  async unpublish(id: string): Promise<PackageAdmin> {
    await this.getAdmin(id);
    const row = await this.packages.setPublishStatus(id, 'published', 'unpublished');
    return this.hydratePackageAdmin(row);
  }

  async publish(id: string): Promise<PackageAdmin> {
    const existing = await this.getAdmin(id);
    if (existing.publishStatus === 'published') {
      return existing;
    }
    if (!existing.content) {
      throw AppException.validation('Add Build-compatible package content before publishing');
    }

    const parsed = parseBuildCompatiblePackageContent(existing.content);
    const expectedDestination = expectedDestinationSlugForContent(parsed);
    if (existing.destinationSlug !== expectedDestination) {
      throw AppException.validation(
        `Package destination must be ${expectedDestination} for this content`,
      );
    }

    if (expectedDestination === 'ubud') {
      const dest = parsed.answers.destination;
      if (dest !== 'ubud' && dest !== 'surprise') {
        throw AppException.validation('Package trip destination must be Ubud or surprise→Ubud');
      }
    } else if (parsed.answers.destination !== 'istanbul') {
      throw AppException.validation('Istanbul packages require answers.destination = istanbul');
    }

    const needed = requiredPublishedSlugs(parsed);
    const published = await this.packages.listPublishedPlaceSlugs(
      existing.destinationId,
      needed,
    );
    const missing = needed.filter((slug) => !published.includes(slug));
    if (missing.length > 0) {
      throw AppException.validation(
        `Hotel and itinerary stops must be published ${expectedDestination} places (missing: ${missing.join(', ')})`,
      );
    }

    const row = await this.packages.setPublishStatus(id, 'unpublished', 'published');
    return this.hydratePackageAdmin(row);
  }

  async uploadPackageCover(
    actor: AuthPrincipal,
    packageId: string,
    file: PackageCoverUploadFile | undefined,
    altTextEn: string | undefined,
    altTextAr?: string | null,
  ): Promise<PackageAdmin> {
    this.assertAdmin(actor);
    const row = await this.packages.getById(packageId);
    if (!row) throw AppException.notFound('Package not found');

    const altEn = altTextEn?.trim() ?? '';
    if (!altEn) {
      throw AppException.validation('altTextEn is required');
    }
    if (altEn.length > 500) {
      throw AppException.validation('altTextEn must be at most 500 characters');
    }
    const altArRaw = altTextAr?.trim() ?? '';
    if (altArRaw.length > 500) {
      throw AppException.validation('altTextAr must be at most 500 characters');
    }
    const altAr = altArRaw.length > 0 ? altArRaw : null;

    if (!file?.buffer || file.buffer.byteLength === 0) {
      throw AppException.validation('Cover image file is required');
    }
    const body =
      file.buffer instanceof Uint8Array
        ? file.buffer
        : Uint8Array.from(file.buffer);
    const validated = validateCatalogCoverImage(body, file.mimetype);

    const mediaId = randomUUID();
    const storagePath = buildPackageCoverObjectPath({
      packageId,
      objectId: mediaId,
      extension: validated.extension,
    });
    const storage = this.requireStorage();

    await storage.uploadPrivateObject({
      bucket: PACKAGE_COVER_BUCKET,
      path: storagePath,
      body: validated.body,
      contentType: validated.mimeType,
      upsert: false,
    });

    let replaced: Array<{
      mediaId: string;
      storageBucket: string;
      storagePath: string;
    }> = [];
    try {
      const result = await this.packages.replacePackageCover({
        packageId,
        mediaId,
        storageBucket: PACKAGE_COVER_BUCKET,
        storagePath,
        mimeType: validated.mimeType,
        byteSize: validated.byteSize,
        altTextEn: altEn,
        altTextAr: altAr,
      });
      replaced = result.replaced;
    } catch (err) {
      await this.safeRemoveStorageObject(
        PACKAGE_COVER_BUCKET,
        storagePath,
        'compensating_cleanup_after_db_failure',
      );
      throw err;
    }

    for (const old of replaced) {
      await this.retireUnreferencedMediaAsset(old);
    }

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'packages.package.cover.upload',
      entityType: 'package',
      entityId: packageId,
      after: {
        mediaId,
        storagePath,
        replacedMediaIds: replaced.map((r) => r.mediaId),
      },
    });

    return this.hydratePackageAdmin(row);
  }

  async updatePackageCoverAlt(
    actor: AuthPrincipal,
    packageId: string,
    input: { altTextEn: string; altTextAr?: string | null },
  ): Promise<PackageAdmin> {
    this.assertAdmin(actor);
    const row = await this.packages.getById(packageId);
    if (!row) throw AppException.notFound('Package not found');

    const altEn = input.altTextEn?.trim() ?? '';
    if (!altEn) {
      throw AppException.validation('altTextEn is required');
    }
    if (altEn.length > 500) {
      throw AppException.validation('altTextEn must be at most 500 characters');
    }
    const altArRaw = input.altTextAr?.trim() ?? '';
    if (altArRaw.length > 500) {
      throw AppException.validation('altTextAr must be at most 500 characters');
    }
    const altAr = altArRaw.length > 0 ? altArRaw : null;

    const updated = await this.packages.updatePackageCoverAltTexts(packageId, {
      altTextEn: altEn,
      altTextAr: altAr,
    });
    if (!updated) {
      throw AppException.notFound('Package cover not found');
    }

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'packages.package.cover.alt_update',
      entityType: 'package',
      entityId: packageId,
      after: { mediaId: updated.mediaId },
    });

    return this.hydratePackageAdmin(row);
  }

  async deletePackageCover(actor: AuthPrincipal, packageId: string): Promise<PackageAdmin> {
    this.assertAdmin(actor);
    const row = await this.packages.getById(packageId);
    if (!row) throw AppException.notFound('Package not found');

    const deactivated = await this.packages.deactivatePackageCover(packageId);
    if (!deactivated) {
      throw AppException.notFound('Package cover not found');
    }

    await this.retireUnreferencedMediaAsset(deactivated);

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'packages.package.cover.delete',
      entityType: 'package',
      entityId: packageId,
      after: { mediaId: deactivated.mediaId },
    });

    return this.hydratePackageAdmin(row);
  }

  private async hydratePackageAdmin(row: PackageRow): Promise<PackageAdmin> {
    const media = await this.packages.listPackageMedia(row.id);
    const coverPreviewUrl = await this.resolveStaffCoverPreview(media);
    return { ...row, media, coverPreviewUrl };
  }

  private async resolveStaffCoverPreview(media: Record<string, unknown>[]) {
    const cover = media.find(
      (item) => item.isCover && item.storageBucket === PACKAGE_COVER_BUCKET,
    );
    if (cover && typeof cover.storagePath === 'string' && this.storage) {
      try {
        return await this.storage.createSignedDownloadUrl(
          cover.storagePath,
          CATALOG_COVER_URL_TTL_SECONDS,
          PACKAGE_COVER_BUCKET,
        );
      } catch {
        // Keep staff metadata and cover controls available during storage outages.
      }
    }
  }

  private async resolvePublicCover(
    row:
      | {
          storageBucket: string;
          storagePath: string;
          altTextEn: string | null;
          altTextAr: string | null;
        }
      | null
      | undefined,
  ): Promise<CatalogCoverPublic | undefined> {
    if (!row || !this.storage || row.storageBucket !== PACKAGE_COVER_BUCKET) {
      return undefined;
    }
    try {
      const url = await this.storage.createSignedDownloadUrl(
        row.storagePath,
        CATALOG_COVER_URL_TTL_SECONDS,
        PACKAGE_COVER_BUCKET,
      );
      return toPublicCatalogCover(row, url);
    } catch {
      return undefined;
    }
  }

  private async retireUnreferencedMediaAsset(asset: {
    mediaId: string;
    storageBucket: string;
    storagePath: string;
  }) {
    const refs = await this.packages.countActiveMediaReferences(asset.mediaId);
    if (refs > 0) return;
    await this.packages.deactivateMediaAsset(asset.mediaId);
    await this.safeRemoveStorageObject(
      asset.storageBucket,
      asset.storagePath,
      'retire_unreferenced_cover_asset',
    );
  }

  private async safeRemoveStorageObject(
    bucket: string,
    path: string,
    reason: string,
  ) {
    try {
      await this.requireStorage().removeObject(bucket, path);
    } catch (err) {
      this.logger?.warn(
        {
          msg: 'storage_cleanup_failed',
          reason,
          bucket,
          path,
          error: err instanceof Error ? err.message : String(err),
        },
        PackagesService.name,
      );
    }
  }
}