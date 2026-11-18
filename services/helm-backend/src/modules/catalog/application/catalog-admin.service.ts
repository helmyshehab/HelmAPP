import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';
import { DRIZZLE, type DrizzleClient } from '../../../infrastructure/adapters/drizzle/drizzle.client';
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
import { CatalogImportWriter } from '../infrastructure/catalog-import.writer';

@Injectable()
export class CatalogAdminService {
  constructor(
    @Inject(CatalogRepository) private readonly repo: CatalogRepository,
    @Inject(AuditService) private readonly audit: AuditService,
    @Optional() @Inject(DRIZZLE) private readonly db?: DrizzleClient | null,
  ) {}

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
      // Dry-run records only an import_run audit row — no destination/place mutations.
      const run = await this.repo.insertImportRun({
        actorUserId: actor.userId,
        dryRun: true,
        status: preview.errors.length ? 'partial' : 'completed',
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
        destinationsCreated: applied.destinationsCreated,
        destinationsUpdated: applied.destinationsUpdated,
        destinationsSkipped: applied.destinationsSkipped,
        placesCreated: applied.placesCreated,
        placesUpdated: applied.placesUpdated,
        placesSkipped: applied.placesSkipped,
      },
    });
    return { dryRun: false, importRunId: run.id, ...applied };
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
