import { Inject, Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';
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
import { CatalogRepository } from '../infrastructure/catalog.repository';

@Injectable()
export class CatalogAdminService {
  constructor(
    @Inject(CatalogRepository) private readonly repo: CatalogRepository,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

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
    // Operators may only move among curation states
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
          .slice(0, 5)
          .map((e) => `${e.path}: ${e.message}`)
          .join('; ')}`,
      );
    }

    const data = validated.data;
    if (options.dryRun) {
      const preview = await this.previewImport(data);
      const run = await this.repo.insertImportRun({
        actorUserId: actor.userId,
        dryRun: true,
        status: 'completed',
        sourceLabel: data.sourceLabel,
        summary: preview,
        errorReport: [],
      });
      if (!run?.id) {
        throw AppException.validation('Failed to record import dry-run');
      }
      await this.audit.record({
        actorUserId: actor.userId,
        action: 'catalog.import.dry_run',
        entityType: 'import_run',
        entityId: String(run.id),
        after: preview,
      });
      return { dryRun: true, importRunId: run.id, ...preview };
    }

    const applied = await this.applyImport(actor, data);
    const run = await this.repo.insertImportRun({
      actorUserId: actor.userId,
      dryRun: false,
      status: applied.errors.length ? 'partial' : 'completed',
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
        created: applied.created,
        updated: applied.updated,
        skipped: applied.skipped,
      },
    });
    return { dryRun: false, importRunId: run.id, ...applied };
  }

  private async previewImport(data: CatalogImportPayload) {
    let wouldCreate = 0;
    let wouldUpdate = 0;
    let wouldSkip = 0;
    const errors: { path: string; message: string }[] = [];

    for (const [idx, place] of data.places.entries()) {
      const dest = await this.repo.findDestinationBySlug(place.destinationSlug);
      if (!dest) {
        errors.push({
          path: `places.${idx}.destinationSlug`,
          message: `Unknown destination slug: ${place.destinationSlug}`,
        });
        continue;
      }
      const existing = await this.repo.findPlaceByExternalKey(place.externalKey);
      if (!existing) wouldCreate += 1;
      else if (place.updateIfExists) wouldUpdate += 1;
      else wouldSkip += 1;
    }

    return {
      destinationsInPayload: data.destinations.length,
      placesInPayload: data.places.length,
      wouldCreate,
      wouldUpdate,
      wouldSkip,
      errors,
    };
  }

  private async applyImport(actor: AuthPrincipal, data: CatalogImportPayload) {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: { path: string; message: string }[] = [];

    for (const [idx, place] of data.places.entries()) {
      try {
        const dest = await this.repo.findDestinationBySlug(place.destinationSlug);
        if (!dest) {
          errors.push({
            path: `places.${idx}.destinationSlug`,
            message: `Unknown destination slug: ${place.destinationSlug}`,
          });
          continue;
        }
        const result = await this.repo.upsertImportedPlace({
          externalKey: place.externalKey,
          destinationId: String(dest.id),
          category: place.category,
          subcategory: place.subcategory,
          slug: place.slug,
          nameEn: place.nameEn,
          nameAr: place.nameAr,
          shortDescriptionEn: place.shortDescriptionEn,
          descriptionEn: place.descriptionEn,
          latitude: place.latitude,
          longitude: place.longitude,
          addressText: place.addressText,
          websiteUrl: place.websiteUrl,
          contactPhone: place.contactPhone,
          contactEmail: place.contactEmail,
          priceLevel: place.priceLevel,
          updateIfExists: place.updateIfExists,
        });
        if (result.action === 'created') created += 1;
        else if (result.action === 'updated') updated += 1;
        else skipped += 1;

        for (const source of place.sources ?? []) {
          const sourceId = await this.repo.ensureSource({
            sourceType: source.sourceType,
            name: source.name,
            url: source.url,
            notes: source.notes,
          });
          await this.repo.linkEntitySource({
            entityType: 'place',
            entityId: result.id,
            sourceId,
            collectedAt: source.collectedAt,
            notes: source.notes,
          });
        }
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
      created,
      updated,
      skipped,
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
