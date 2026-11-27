import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception';
import { StructuredLogger } from '../../../common/logging/structured-logger';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';
import {
  CATALOG_MEDIA_BUCKET,
  STORAGE_PORT,
  type StoragePort,
} from '../../../infrastructure/ports/storage.port';
import { DRIZZLE, type DrizzleClient } from '../../../infrastructure/adapters/drizzle/drizzle.client';
import {
  buildDestinationCoverObjectPath,
  buildPlaceCoverObjectPath,
  validateCatalogCoverImage,
} from '../../../infrastructure/storage/catalog-media';
import { AuditService } from '../../audit/audit.service';
import {
  ADMIN_ONLY_TARGETS,
  assertTransition,
  isCreatableStatus,
  type LifecycleStatus,
} from '../domain/lifecycle';
import { isPlaceCategory, type PlaceCategory } from '../domain/categories';
import {
  validateCatalogImport,
  type CatalogImportPayload,
} from '../domain/import-format';
import {
  isImportRunStatus,
  resolveImportRunStatus,
  type ImportRunStatus,
} from '../domain/import-run-status';
import { CatalogRepository } from '../infrastructure/catalog.repository';
import { CatalogImportWriter } from '../infrastructure/catalog-import.writer';

export type DestinationCoverUploadFile = {
  buffer: Buffer | Uint8Array;
  mimetype?: string;
  size?: number;
};

export type PlaceCoverUploadFile = DestinationCoverUploadFile;

@Injectable()
export class CatalogAdminService {
  constructor(
    @Inject(CatalogRepository) private readonly repo: CatalogRepository,
    @Inject(AuditService) private readonly audit: AuditService,
    @Optional() @Inject(DRIZZLE) private readonly db?: DrizzleClient | null,
    @Optional() @Inject(STORAGE_PORT) private readonly storage?: StoragePort | null,
    @Optional() @Inject(StructuredLogger) private readonly logger?: StructuredLogger,
  ) {}

  private requireStorage(): StoragePort {
    if (!this.storage) {
      throw AppException.validation('Object storage is not configured');
    }
    return this.storage;
  }

  private importWriter(): CatalogImportWriter {
    if (!this.db) {
      throw AppException.validation('Catalog database is not configured (DATABASE_URL)');
    }
    return new CatalogImportWriter(this.db);
  }

  async createPlace(
    actor: AuthPrincipal,
    input: {
      destinationId: string;
      category: string;
      subcategory?: string;
      slug: string;
      nameEn: string;
      nameAr: string;
      shortDescriptionEn?: string;
      descriptionEn?: string;
      externalKey?: string;
    },
  ) {
    this.assertStaff(actor);
    if (!isPlaceCategory(input.category)) {
      throw AppException.validation(`Invalid category: ${input.category}`);
    }
    const created = await this.repo.createPlace({
      destinationId: input.destinationId,
      category: input.category as PlaceCategory,
      subcategory: input.subcategory ?? 'general',
      slug: input.slug,
      nameEn: input.nameEn,
      nameAr: input.nameAr,
      shortDescriptionEn: input.shortDescriptionEn,
      descriptionEn: input.descriptionEn,
      externalKey: input.externalKey,
      actorId: actor.userId,
    });
    if (!created?.id) {
      throw AppException.validation('Failed to create catalog place');
    }
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'catalog.place.create',
      entityType: 'place',
      entityId: String(created.id),
      after: { slug: created.slug, lifecycleStatus: created.lifecycleStatus },
    });
    return created;
  }

  async transitionPlace(
    actor: AuthPrincipal,
    placeId: string,
    to: LifecycleStatus,
    rejectionReason?: string,
  ) {
    this.assertStaff(actor);
    const current = await this.repo.getPlaceLifecycle(placeId);
    if (!current) throw AppException.notFound('Place not found');
    const from = current.lifecycleStatus as LifecycleStatus;
    try {
      assertTransition(from, to);
    } catch (err) {
      throw AppException.validation(err instanceof Error ? err.message : 'Invalid transition');
    }

    if (ADMIN_ONLY_TARGETS.includes(to)) {
      this.assertAdmin(actor);
    }
    if (!this.isAdmin(actor) && !isCreatableStatus(to) && to !== 'pending_verification') {
      throw AppException.forbidden('Operators cannot perform this lifecycle action');
    }
    if (to === 'rejected' && !rejectionReason?.trim()) {
      throw AppException.validation('rejectionReason is required when rejecting');
    }

    const updated = await this.repo.transitionPlace({
      id: placeId,
      to,
      actorId: actor.userId,
      rejectionReason,
    });
    if (!updated) throw AppException.notFound('Place not found');

    await this.audit.record({
      actorUserId: actor.userId,
      action: `catalog.place.${to}`,
      entityType: 'place',
      entityId: placeId,
      before: { lifecycleStatus: from },
      after: { lifecycleStatus: to },
      reason: rejectionReason,
    });
    return updated;
  }

  async listStaffPlaces(query: {
    category?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.repo.listPlaces({
      category: query.category,
      q: query.q,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
      publicOnly: false,
      sort: 'updated',
    });
  }

  async listStaffDestinations(query: {
    q?: string;
    country?: string;
    featured?: boolean;
    lifecycleStatus?: LifecycleStatus;
    parentId?: string;
    topLevelOnly?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const result = await this.repo.listDestinations({
      q: query.q,
      country: query.country?.toUpperCase(),
      featured: query.featured,
      lifecycleStatus: query.lifecycleStatus,
      parentId: query.parentId,
      topLevelOnly: query.topLevelOnly,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
      publicOnly: false,
    });
    const ids = result.items.map((row) => String(row.id));
    const tagsById = await this.repo.listDestinationTagsForMany(ids);
    const items = result.items.map((row) => ({
      ...row,
      tags: tagsById.get(String(row.id)) ?? [],
      sources: [],
      media: [],
    }));
    return { ...result, items };
  }

  async getStaffDestination(id: string) {
    return this.hydrateDestination(id);
  }

  /**
   * Upload or replace the destination cover.
   * Storage object is written first; DB replacement is atomic; failures compensate.
   * Does not change lifecycle_status or published_at.
   */
  async uploadDestinationCover(
    actor: AuthPrincipal,
    destinationId: string,
    file: DestinationCoverUploadFile | undefined,
    altTextEn: string | undefined,
    altTextAr?: string | null,
  ) {
    this.assertAdmin(actor);
    const destination = await this.repo.getDestinationById(destinationId);
    if (!destination) throw AppException.notFound('Destination not found');

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
    const storagePath = buildDestinationCoverObjectPath({
      destinationId,
      objectId: mediaId,
      extension: validated.extension,
    });
    const storage = this.requireStorage();

    await storage.uploadPublicObject({
      bucket: CATALOG_MEDIA_BUCKET,
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
      const result = await this.repo.replaceDestinationCover({
        destinationId,
        mediaId,
        storageBucket: CATALOG_MEDIA_BUCKET,
        storagePath,
        mimeType: validated.mimeType,
        byteSize: validated.byteSize,
        altTextEn: altEn,
        altTextAr: altAr,
      });
      replaced = result.replaced;
    } catch (err) {
      await this.safeRemoveStorageObject(
        CATALOG_MEDIA_BUCKET,
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
      action: 'catalog.destination.cover.upload',
      entityType: 'destination',
      entityId: destinationId,
      after: {
        mediaId,
        storagePath,
        replacedMediaIds: replaced.map((r) => r.mediaId),
      },
    });

    return this.hydrateDestination(destinationId);
  }

  async updateDestinationCoverAlt(
    actor: AuthPrincipal,
    destinationId: string,
    input: { altTextEn: string; altTextAr?: string | null },
  ) {
    this.assertAdmin(actor);
    const destination = await this.repo.getDestinationById(destinationId);
    if (!destination) throw AppException.notFound('Destination not found');

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

    const updated = await this.repo.updateDestinationCoverAltTexts(destinationId, {
      altTextEn: altEn,
      altTextAr: altAr,
    });
    if (!updated) {
      throw AppException.notFound('Destination cover not found');
    }

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'catalog.destination.cover.alt_update',
      entityType: 'destination',
      entityId: destinationId,
      after: { mediaId: updated.mediaId },
    });

    return this.hydrateDestination(destinationId);
  }

  async deleteDestinationCover(actor: AuthPrincipal, destinationId: string) {
    this.assertAdmin(actor);
    const destination = await this.repo.getDestinationById(destinationId);
    if (!destination) throw AppException.notFound('Destination not found');

    const deactivated = await this.repo.deactivateDestinationCover(destinationId);
    if (!deactivated) {
      throw AppException.notFound('Destination cover not found');
    }

    await this.retireUnreferencedMediaAsset(deactivated);

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'catalog.destination.cover.delete',
      entityType: 'destination',
      entityId: destinationId,
      after: { mediaId: deactivated.mediaId },
    });

    return this.hydrateDestination(destinationId);
  }

  async getStaffPlace(id: string) {
    return this.hydratePlace(id);
  }

  /**
   * Upload or replace the place cover.
   * Storage object is written first; DB replacement is atomic; failures compensate.
   * Does not change lifecycle_status or published_at.
   */
  async uploadPlaceCover(
    actor: AuthPrincipal,
    placeId: string,
    file: PlaceCoverUploadFile | undefined,
    altTextEn: string | undefined,
    altTextAr?: string | null,
  ) {
    this.assertAdmin(actor);
    const place = await this.repo.getPlaceById(placeId);
    if (!place) throw AppException.notFound('Place not found');

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
    const storagePath = buildPlaceCoverObjectPath({
      placeId,
      objectId: mediaId,
      extension: validated.extension,
    });
    const storage = this.requireStorage();

    await storage.uploadPublicObject({
      bucket: CATALOG_MEDIA_BUCKET,
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
      const result = await this.repo.replacePlaceCover({
        placeId,
        mediaId,
        storageBucket: CATALOG_MEDIA_BUCKET,
        storagePath,
        mimeType: validated.mimeType,
        byteSize: validated.byteSize,
        altTextEn: altEn,
        altTextAr: altAr,
      });
      replaced = result.replaced;
    } catch (err) {
      await this.safeRemoveStorageObject(
        CATALOG_MEDIA_BUCKET,
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
      action: 'catalog.place.cover.upload',
      entityType: 'place',
      entityId: placeId,
      after: {
        mediaId,
        storagePath,
        replacedMediaIds: replaced.map((r) => r.mediaId),
      },
    });

    return this.hydratePlace(placeId);
  }

  async updatePlaceCoverAlt(
    actor: AuthPrincipal,
    placeId: string,
    input: { altTextEn: string; altTextAr?: string | null },
  ) {
    this.assertAdmin(actor);
    const place = await this.repo.getPlaceById(placeId);
    if (!place) throw AppException.notFound('Place not found');

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

    const updated = await this.repo.updatePlaceCoverAltTexts(placeId, {
      altTextEn: altEn,
      altTextAr: altAr,
    });
    if (!updated) {
      throw AppException.notFound('Place cover not found');
    }

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'catalog.place.cover.alt_update',
      entityType: 'place',
      entityId: placeId,
      after: { mediaId: updated.mediaId },
    });

    return this.hydratePlace(placeId);
  }

  async deletePlaceCover(actor: AuthPrincipal, placeId: string) {
    this.assertAdmin(actor);
    const place = await this.repo.getPlaceById(placeId);
    if (!place) throw AppException.notFound('Place not found');

    const deactivated = await this.repo.deactivatePlaceCover(placeId);
    if (!deactivated) {
      throw AppException.notFound('Place cover not found');
    }

    await this.retireUnreferencedMediaAsset(deactivated);

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'catalog.place.cover.delete',
      entityType: 'place',
      entityId: placeId,
      after: { mediaId: deactivated.mediaId },
    });

    return this.hydratePlace(placeId);
  }

  private async hydratePlace(id: string) {
    const row = await this.repo.getPlaceById(id);
    if (!row) throw AppException.notFound('Place not found');
    const media = await this.repo.listPlaceMedia(id);
    return { ...row, media };
  }

  private async retireUnreferencedMediaAsset(asset: {
    mediaId: string;
    storageBucket: string;
    storagePath: string;
  }) {
    const refs = await this.repo.countActiveMediaReferences(asset.mediaId);
    if (refs > 0) return;
    await this.repo.deactivateMediaAsset(asset.mediaId);
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
          detail: err instanceof Error ? err.message : String(err),
        },
        'CatalogAdminService',
      );
    }
  }

  async createDestination(
    actor: AuthPrincipal,
    input: {
      slug: string;
      nameEn: string;
      nameAr: string;
      countryCode: string;
      cityId?: string | null;
      parentId?: string | null;
      shortDescriptionEn?: string;
      shortDescriptionAr?: string;
      summaryEn?: string;
      summaryAr?: string;
      descriptionEn?: string;
      descriptionAr?: string;
      timezone?: string;
      latitude?: number | null;
      longitude?: number | null;
      addressText?: string;
      websiteUrl?: string;
      isFeatured?: boolean;
      externalKey?: string;
      tagSlugs?: string[];
    },
  ) {
    this.assertStaff(actor);
    await this.validateGeoAndParent({
      countryCode: input.countryCode,
      cityId: input.cityId,
      parentId: input.parentId,
      destinationId: null,
    });

    // Insert + optional initial tags are one transaction (no partial destination on tag failure).
    const created = await this.repo.createDestination(
      {
        slug: input.slug,
        nameEn: input.nameEn,
        nameAr: input.nameAr,
        countryCode: input.countryCode,
        cityId: input.cityId,
        parentId: input.parentId,
        shortDescriptionEn: input.shortDescriptionEn,
        shortDescriptionAr: input.shortDescriptionAr,
        summaryEn: input.summaryEn,
        summaryAr: input.summaryAr,
        descriptionEn: input.descriptionEn,
        descriptionAr: input.descriptionAr,
        timezone: input.timezone,
        latitude: input.latitude,
        longitude: input.longitude,
        addressText: input.addressText,
        websiteUrl: input.websiteUrl,
        isFeatured: input.isFeatured,
        externalKey: input.externalKey,
      },
      input.tagSlugs,
    );
    if (!created?.id) {
      throw AppException.validation('Failed to create catalog destination');
    }
    const id = String(created.id);
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'catalog.destination.create',
      entityType: 'destination',
      entityId: id,
      after: {
        slug: created.slug,
        lifecycleStatus: created.lifecycleStatus ?? 'draft',
        tagSlugs: input.tagSlugs ?? [],
      },
    });
    return this.hydrateDestination(id);
  }

  async updateDestination(
    actor: AuthPrincipal,
    id: string,
    input: {
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
    this.assertStaff(actor);
    const current = await this.repo.getDestinationById(id);
    if (!current) throw AppException.notFound('Destination not found');
    const status = current.lifecycleStatus as LifecycleStatus;

    if (!this.isAdmin(actor) && !isCreatableStatus(status)) {
      throw AppException.forbidden(
        'Operators may update only draft, pending_verification, or rejected destinations',
      );
    }

    if (Object.prototype.hasOwnProperty.call(input, 'slug') && status === 'published') {
      throw AppException.validation(
        'Published destination slug cannot be changed via PATCH; use the audited redirect/alias operation',
      );
    }

    const nextCountry = input.countryCode ?? String(current.countryCode);
    const nextCityId =
      input.cityId !== undefined ? input.cityId : (current.cityId as string | null);
    const nextParentId =
      input.parentId !== undefined ? input.parentId : (current.parentId as string | null);

    if (
      input.countryCode !== undefined ||
      input.cityId !== undefined ||
      input.parentId !== undefined
    ) {
      await this.validateGeoAndParent({
        countryCode: nextCountry,
        cityId: nextCityId,
        parentId: nextParentId,
        destinationId: id,
      });
    }

    const updated = await this.repo.updateDestination(id, input);
    if (!updated) throw AppException.notFound('Destination not found');

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'catalog.destination.update',
      entityType: 'destination',
      entityId: id,
      before: { slug: current.slug, lifecycleStatus: current.lifecycleStatus },
      after: { slug: updated.slug, lifecycleStatus: updated.lifecycleStatus },
    });
    return this.hydrateDestination(id);
  }

  async transitionDestination(
    actor: AuthPrincipal,
    destinationId: string,
    to: LifecycleStatus,
    rejectionReason?: string,
  ) {
    this.assertStaff(actor);
    const current = await this.repo.getDestinationLifecycle(destinationId);
    if (!current) throw AppException.notFound('Destination not found');
    const from = current.lifecycleStatus as LifecycleStatus;
    try {
      assertTransition(from, to);
    } catch (err) {
      throw AppException.validation(err instanceof Error ? err.message : 'Invalid transition');
    }

    if (ADMIN_ONLY_TARGETS.includes(to)) {
      this.assertAdmin(actor);
    }
    if (!this.isAdmin(actor) && !isCreatableStatus(to) && to !== 'pending_verification') {
      throw AppException.forbidden('Operators cannot perform this lifecycle action');
    }
    if (to === 'rejected' && !rejectionReason?.trim()) {
      throw AppException.validation('rejectionReason is required when rejecting');
    }

    const updated = await this.repo.transitionDestination({
      id: destinationId,
      from,
      to,
      actorId: actor.userId,
      rejectionReason,
    });
    if (!updated) {
      const stillThere = await this.repo.getDestinationLifecycle(destinationId);
      if (!stillThere) throw AppException.notFound('Destination not found');
      throw AppException.conflict(
        `Destination lifecycle changed concurrently (expected ${from}, found ${String(stillThere.lifecycleStatus)})`,
      );
    }

    await this.audit.record({
      actorUserId: actor.userId,
      action: `catalog.destination.${to}`,
      entityType: 'destination',
      entityId: destinationId,
      before: { lifecycleStatus: from },
      after: { lifecycleStatus: to },
      reason: rejectionReason,
    });
    return this.hydrateDestination(destinationId);
  }

  async replaceDestinationTags(actor: AuthPrincipal, id: string, tagSlugs: string[]) {
    this.assertStaff(actor);
    const current = await this.repo.getDestinationById(id);
    if (!current) throw AppException.notFound('Destination not found');
    const status = current.lifecycleStatus as LifecycleStatus;
    if (!this.isAdmin(actor) && !isCreatableStatus(status)) {
      throw AppException.forbidden(
        'Operators may edit tags only on draft, pending_verification, or rejected destinations',
      );
    }

    await this.repo.replaceDestinationTags(id, tagSlugs);
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'catalog.destination.tags.replace',
      entityType: 'destination',
      entityId: id,
      after: { tagSlugs },
    });
    return this.hydrateDestination(id);
  }

  private async hydrateDestination(id: string) {
    const row = await this.repo.getDestinationById(id);
    if (!row) throw AppException.notFound('Destination not found');
    const [tags, sources, media] = await Promise.all([
      this.repo.listDestinationTags(id),
      this.repo.listDestinationSources(id),
      this.repo.listDestinationMedia(id),
    ]);
    return { ...row, tags, sources, media };
  }

  private async validateGeoAndParent(input: {
    countryCode: string;
    cityId?: string | null;
    parentId?: string | null;
    destinationId: string | null;
  }) {
    const countryOk = await this.repo.countryExists(input.countryCode, true);
    if (!countryOk) {
      throw AppException.validation(`Unknown or inactive country code: ${input.countryCode}`);
    }
    if (input.cityId) {
      const city = await this.repo.getCity(input.cityId);
      if (!city) throw AppException.validation('City not found');
      if (city.countryCode.toUpperCase() !== input.countryCode.toUpperCase()) {
        throw AppException.validation('City does not belong to the specified country');
      }
    }
    if (input.parentId) {
      if (input.destinationId && input.parentId === input.destinationId) {
        throw AppException.validation('Destination cannot be its own parent');
      }
      const cycle = await this.repo.wouldCreateParentCycle(input.destinationId, input.parentId);
      if (cycle) {
        throw AppException.validation('Parent destination would create a hierarchy cycle');
      }
    }
  }

  async importCatalog(
    actor: AuthPrincipal,
    payload: unknown,
    options: { dryRun: boolean },
  ) {
    this.assertStaff(actor);
    if (!options.dryRun) {
      this.assertAdmin(actor);
    }

    const validated = validateCatalogImport(payload);
    if (!validated.ok || !validated.data) {
      await this.audit.record({
        actorUserId: actor.userId,
        action: 'catalog.import.validate_failed',
        entityType: 'import_run',
        after: { dryRun: options.dryRun, errorCount: validated.errors.length },
      });
      throw AppException.validation(
        `Import validation failed: ${validated.errors
          .slice(0, 8)
          .map((e) => `${e.path}: ${e.message}`)
          .join('; ')}`,
      );
    }

    const data = validated.data;
    if (options.dryRun) {
      const preview = await this.previewImport(data);
      const status = resolveImportRunStatus({
        dryRun: true,
        errorCount: preview.errors.length,
        created: 0,
        updated: 0,
      });
      // Dry-run records only an import_run audit row — no destination/place mutations.
      const run = await this.repo.insertImportRun({
        actorUserId: actor.userId,
        dryRun: true,
        status,
        sourceLabel: data.sourceLabel,
        summary: preview,
        errorReport: preview.errors,
      });
      if (!run?.id) {
        throw AppException.validation('Failed to record import dry-run');
      }
      await this.audit.record({
        actorUserId: actor.userId,
        action: 'catalog.import.dry_run',
        entityType: 'import_run',
        entityId: String(run.id),
        after: { ...preview, status },
      });
      return { dryRun: true, importRunId: run.id, status, ...preview };
    }

    const applied = await this.applyImport(actor, data);
    const status = resolveImportRunStatus({
      dryRun: false,
      errorCount: applied.errors.length,
      created: applied.created,
      updated: applied.updated,
    });
    const run = await this.repo.insertImportRun({
      actorUserId: actor.userId,
      dryRun: false,
      status,
      sourceLabel: data.sourceLabel,
      summary: applied,
      errorReport: applied.errors,
    });
    if (!run?.id) {
      throw AppException.validation('Failed to record import run');
    }
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'catalog.import.apply',
      entityType: 'import_run',
      entityId: String(run.id),
      after: {
        status,
        destinationsCreated: applied.destinationsCreated,
        destinationsUpdated: applied.destinationsUpdated,
        destinationsSkipped: applied.destinationsSkipped,
        placesCreated: applied.placesCreated,
        placesUpdated: applied.placesUpdated,
        placesSkipped: applied.placesSkipped,
      },
    });
    return { dryRun: false, importRunId: run.id, status, ...applied };
  }

  async listImportRuns(
    actor: AuthPrincipal,
    query: {
      status?: string;
      dryRun?: boolean;
      sourceLabel?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    this.assertStaff(actor);
    if (query.status != null && !isImportRunStatus(query.status)) {
      throw AppException.validation('Invalid import run status filter');
    }
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const { items, total } = await this.repo.listImportRuns({
      status: query.status,
      dryRun: query.dryRun,
      sourceLabel: query.sourceLabel,
      limit,
      offset,
    });
    return {
      items: items.map((row) => this.mapImportRunListItem(row)),
      total,
      limit,
      offset,
    };
  }

  async getImportRun(actor: AuthPrincipal, id: string) {
    this.assertStaff(actor);
    const row = await this.repo.getImportRunById(id);
    if (!row) {
      throw AppException.notFound('Import run not found');
    }
    const base = this.mapImportRunListItem(row);
    const rawErrors = row.errorReport;
    const errors = Array.isArray(rawErrors)
      ? rawErrors.map((err) => {
          if (err && typeof err === 'object') {
            const rec = err as Record<string, unknown>;
            return {
              path: typeof rec.path === 'string' ? rec.path : undefined,
              message: typeof rec.message === 'string' ? rec.message : String(err),
            };
          }
          return { message: String(err) };
        })
      : [];
    return { ...base, errors };
  }

  private mapImportRunListItem(row: Record<string, unknown>) {
    const statusRaw = String(row.status ?? '');
    const status: ImportRunStatus = isImportRunStatus(statusRaw)
      ? statusRaw
      : 'completed';
    const summary =
      row.summary && typeof row.summary === 'object'
        ? (row.summary as Record<string, unknown>)
        : {};
    return {
      id: String(row.id),
      dryRun: Boolean(row.dryRun),
      status,
      sourceLabel:
        row.sourceLabel == null ? null : String(row.sourceLabel),
      actorUserId:
        row.actorUserId == null ? null : String(row.actorUserId),
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
      errorCount: Number(row.errorCount ?? 0),
      summary: this.pickSummaryCounts(summary),
    };
  }

  private pickSummaryCounts(summary: Record<string, unknown>) {
    const keys = [
      'destinationsInPayload',
      'placesInPayload',
      'destinationsWouldCreate',
      'destinationsWouldUpdate',
      'destinationsWouldSkip',
      'placesWouldCreate',
      'placesWouldUpdate',
      'placesWouldSkip',
      'destinationsCreated',
      'destinationsUpdated',
      'destinationsSkipped',
      'placesCreated',
      'placesUpdated',
      'placesSkipped',
      'wouldCreate',
      'wouldUpdate',
      'wouldSkip',
      'created',
      'updated',
      'skipped',
    ] as const;
    const out: Record<string, number> = {};
    for (const key of keys) {
      const value = summary[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        out[key] = value;
      }
    }
    return out;
  }

  private async previewImport(data: CatalogImportPayload) {
    const writer = this.importWriter();
    let destinationsWouldCreate = 0;
    let destinationsWouldUpdate = 0;
    let destinationsWouldSkip = 0;
    let placesWouldCreate = 0;
    let placesWouldUpdate = 0;
    let placesWouldSkip = 0;
    const errors: { path: string; message: string }[] = [];

    // Slugs that will exist after destination creates in this payload
    const pendingDestSlugs = new Set<string>();

    for (const [idx, dest] of data.destinations.entries()) {
      try {
        if (!(await writer.countryExists(dest.countryCode))) {
          errors.push({
            path: `destinations.${idx}.countryCode`,
            message: `Unknown country code: ${dest.countryCode}`,
          });
          continue;
        }
        if (dest.citySlug) {
          const cityId = await writer.findCityId(dest.countryCode, dest.citySlug);
          if (!cityId) {
            errors.push({
              path: `destinations.${idx}.citySlug`,
              message: `Unknown city slug '${dest.citySlug}' for country ${dest.countryCode}`,
            });
            continue;
          }
        }

        const byKey = await writer.findDestinationByExternalKey(dest.externalKey);
        const bySlug = await writer.findDestinationBySlug(dest.slug);

        if (bySlug && byKey && String(bySlug.id) !== String(byKey.id)) {
          errors.push({
            path: `destinations.${idx}.slug`,
            message: `Destination slug '${dest.slug}' conflicts with a different externalKey`,
          });
          continue;
        }
        if (
          bySlug &&
          !byKey &&
          bySlug.externalKey &&
          bySlug.externalKey !== dest.externalKey
        ) {
          errors.push({
            path: `destinations.${idx}.slug`,
            message: `Destination slug '${dest.slug}' already exists with a different externalKey`,
          });
          continue;
        }

        if (byKey) {
          if (dest.updateIfExists) destinationsWouldUpdate += 1;
          else destinationsWouldSkip += 1;
        } else if (bySlug && !bySlug.externalKey) {
          if (dest.updateIfExists) destinationsWouldUpdate += 1;
          else {
            errors.push({
              path: `destinations.${idx}.slug`,
              message: `Destination slug '${dest.slug}' already exists; set updateIfExists to adopt`,
            });
          }
        } else if (bySlug) {
          errors.push({
            path: `destinations.${idx}.slug`,
            message: `Destination slug '${dest.slug}' already exists with a different externalKey`,
          });
        } else {
          destinationsWouldCreate += 1;
          pendingDestSlugs.add(dest.slug);
        }
      } catch (err) {
        errors.push({
          path: `destinations.${idx}`,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    for (const [idx, place] of data.places.entries()) {
      try {
        const dest =
          (await writer.findDestinationBySlug(place.destinationSlug)) ??
          (pendingDestSlugs.has(place.destinationSlug)
            ? { id: 'pending', slug: place.destinationSlug }
            : null);
        if (!dest) {
          errors.push({
            path: `places.${idx}.destinationSlug`,
            message: `Unknown destination slug: ${place.destinationSlug}`,
          });
          continue;
        }
        const existing = await writer.findPlaceByExternalKey(place.externalKey);
        if (!existing) placesWouldCreate += 1;
        else if (place.updateIfExists) placesWouldUpdate += 1;
        else placesWouldSkip += 1;
      } catch (err) {
        errors.push({
          path: `places.${idx}`,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      destinationsInPayload: data.destinations.length,
      placesInPayload: data.places.length,
      destinationsWouldCreate,
      destinationsWouldUpdate,
      destinationsWouldSkip,
      placesWouldCreate,
      placesWouldUpdate,
      placesWouldSkip,
      // Aggregate aliases for prior client fields
      wouldCreate: destinationsWouldCreate + placesWouldCreate,
      wouldUpdate: destinationsWouldUpdate + placesWouldUpdate,
      wouldSkip: destinationsWouldSkip + placesWouldSkip,
      errors,
    };
  }

  private async applyImport(actor: AuthPrincipal, data: CatalogImportPayload) {
    const writer = this.importWriter();
    let destinationsCreated = 0;
    let destinationsUpdated = 0;
    let destinationsSkipped = 0;
    let placesCreated = 0;
    let placesUpdated = 0;
    let placesSkipped = 0;
    const errors: { path: string; message: string }[] = [];

    for (const [idx, dest] of data.destinations.entries()) {
      try {
        const result = await writer.importDestination(dest);
        if (result.action === 'created') destinationsCreated += 1;
        else if (result.action === 'updated') destinationsUpdated += 1;
        else destinationsSkipped += 1;
      } catch (err) {
        errors.push({
          path: `destinations.${idx}`,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    for (const [idx, place] of data.places.entries()) {
      try {
        const dest = await writer.findDestinationBySlug(place.destinationSlug);
        if (!dest) {
          errors.push({
            path: `places.${idx}.destinationSlug`,
            message: `Unknown destination slug: ${place.destinationSlug}`,
          });
          continue;
        }
        const result = await writer.importPlace(place, String(dest.id));
        if (result.action === 'created') placesCreated += 1;
        else if (result.action === 'updated') placesUpdated += 1;
        else placesSkipped += 1;
      } catch (err) {
        errors.push({
          path: `places.${idx}`,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      destinationsInPayload: data.destinations.length,
      placesInPayload: data.places.length,
      destinationsCreated,
      destinationsUpdated,
      destinationsSkipped,
      placesCreated,
      placesUpdated,
      placesSkipped,
      created: destinationsCreated + placesCreated,
      updated: destinationsUpdated + placesUpdated,
      skipped: destinationsSkipped + placesSkipped,
      errors,
      actorUserId: actor.userId,
    };
  }

  private assertStaff(actor: AuthPrincipal) {
    const staff = ['operator', 'administrator', 'super-administrator'] as const;
    if (actor.rolesSource !== 'database' || !actor.roles.some((r) => staff.includes(r as never))) {
      throw AppException.forbidden('Staff authorization required');
    }
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
}
