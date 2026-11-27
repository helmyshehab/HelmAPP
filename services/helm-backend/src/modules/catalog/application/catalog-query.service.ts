import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception';
import {
  STORAGE_PORT,
  PLACE_COVER_BUCKET,
  PLACE_COVER_URL_TTL_SECONDS,
  type StoragePort,
} from '../../../infrastructure/ports/storage.port';
import { CATEGORY_GROUPS, isPlaceCategory } from '../domain/categories';
import { CatalogRepository } from '../infrastructure/catalog.repository';
import { toPublicDestinationCover, type PlaceCoverRow } from './destination-cover.mapper';
import {
  assertNoInternalLeak,
  toPublicDestination,
  toPublicPlace,
} from './public-catalog.mapper';

@Injectable()
export class CatalogQueryService {
  constructor(
    @Inject(CatalogRepository) private readonly repo: CatalogRepository,
    @Optional() @Inject(STORAGE_PORT) private readonly storage?: StoragePort | null,
  ) {}

  async listPublicDestinations(query: {
    country?: string;
    featured?: boolean;
    q?: string;
    limit?: number;
    offset?: number;
  }) {
    const result = await this.repo.listDestinations({
      country: query.country?.toUpperCase(),
      featured: query.featured,
      q: query.q,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
      publicOnly: true,
    });
    const coverById = await this.repo.listPublicDestinationCovers(
      result.items.map((row) => String(row.id)),
    );
    const items = result.items.map((row) => {
      const body = toPublicDestination(row) as Record<string, unknown>;
      const coverRow = coverById.get(String(row.id));
      if (coverRow && this.storage) {
        body.cover = toPublicDestinationCover(coverRow, this.storage);
      }
      return body;
    });
    const response = { ...result, items };
    assertNoInternalLeak(response);
    return response;
  }

  async getPublicDestination(slug: string) {
    const row = await this.repo.getDestinationBySlug(slug, true);
    if (!row) throw AppException.notFound(`Destination not found: ${slug}`);
    const body = toPublicDestination(row) as Record<string, unknown>;
    const coverRow = await this.repo.getActiveDestinationCover(String(row.id));
    if (coverRow && this.storage) {
      body.cover = toPublicDestinationCover(coverRow, this.storage);
    }
    assertNoInternalLeak(body);
    return body;
  }

  async listPublicPlaces(query: {
    country?: string;
    city?: string;
    area?: string;
    destinationSlug?: string;
    category?: string;
    subcategory?: string;
    minRating?: number;
    priceLevel?: number;
    tag?: string;
    featured?: boolean;
    q?: string;
    sort?: 'name' | 'rating' | 'updated';
    limit?: number;
    offset?: number;
  }) {
    if (query.category && !isPlaceCategory(query.category)) {
      throw AppException.validation(`Invalid category: ${query.category}`);
    }
    if (query.priceLevel != null && (query.priceLevel < 1 || query.priceLevel > 4)) {
      throw AppException.validation('priceLevel must be 1–4');
    }
    if (query.minRating != null && (query.minRating < 0 || query.minRating > 10)) {
      throw AppException.validation('minRating out of range');
    }
    if (query.country && !/^[A-Za-z]{2}$/.test(query.country)) {
      throw AppException.validation('country must be ISO-3166 alpha-2');
    }
    if (query.destinationSlug != null && query.destinationSlug.trim().length === 0) {
      throw AppException.validation('destinationSlug must be non-empty when provided');
    }
    if (query.limit != null && (query.limit < 1 || query.limit > 100)) {
      throw AppException.validation('limit must be 1–100');
    }
    if (query.offset != null && query.offset < 0) {
      throw AppException.validation('offset must be >= 0');
    }

    const result = await this.repo.listPlaces({
      country: query.country?.toUpperCase(),
      city: query.city,
      area: query.area,
      destinationSlug: query.destinationSlug?.trim(),
      category: query.category,
      subcategory: query.subcategory,
      minRating: query.minRating,
      priceLevel: query.priceLevel,
      tags: query.tag ? [query.tag] : undefined,
      featured: query.featured,
      q: query.q,
      sort: query.sort ?? 'name',
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
      publicOnly: true,
    });
    const coverById = await this.repo.listPublicPlaceCovers(
      result.items.map((row) => String(row.id)),
    );
    const items = await Promise.all(result.items.map(async (row) => {
      const place = toPublicPlace(row) as Record<string, unknown>;
      const coverRow = coverById.get(String(row.id));
      const cover = await this.resolvePlaceCover(coverRow);
      if (cover) place.cover = cover;
      return place;
    }));
    const body = { ...result, items };
    assertNoInternalLeak(body);
    return body;
  }

  async getPublicPlace(slug: string) {
    const row = await this.repo.getPlaceBySlug(slug, true);
    if (!row) throw AppException.notFound(`Place not found: ${slug}`);
    const placeId = String(row.id);
    const category = String(row.category);
    const [media, tags, details, coverRow] = await Promise.all([
      this.repo.listPublicMediaForPlace(placeId),
      this.repo.listPublicTagsForPlace(placeId),
      this.repo.getPublicPlaceDetails(placeId, category),
      this.repo.getActivePlaceCover(placeId),
    ]);
    // List endpoints stay lean — category details only on the detail route.
    // Keep legacy media[] (PublicMediaRef) for detail; traveler-safe cover is separate.
    const body: Record<string, unknown> = {
      ...toPublicPlace(row),
      tags,
      media,
      details: details ?? null,
    };
    const cover = await this.resolvePlaceCover(coverRow);
    if (cover) body.cover = cover;
    assertNoInternalLeak(body);
    return body;
  }

  private async resolvePlaceCover(row?: PlaceCoverRow | null) {
    if (!row || !this.storage || row.storageBucket !== PLACE_COVER_BUCKET) return;
    try {
      const url = await this.storage.createSignedDownloadUrl(
        row.storagePath, PLACE_COVER_URL_TTL_SECONDS, PLACE_COVER_BUCKET,
      );
      const altTextEn = row.altTextEn?.trim();
      const altTextAr = row.altTextAr?.trim();
      return { url, ...(altTextEn && { altTextEn }), ...(altTextAr && { altTextAr }) };
    } catch {
      // Place discovery remains available when storage signing is unavailable.
      return undefined;
    }
  }

  listCategories() {
    return { items: CATEGORY_GROUPS };
  }

  async listTags() {
    const items = await this.repo.listTags(true);
    return { items };
  }

  async listCountries(query: {
    active?: boolean;
    q?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.repo.listCountries({
      active: query.active,
      q: query.q,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    });
  }

  async listCities(query: {
    country?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.repo.listCities({
      country: query.country,
      q: query.q,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    });
  }
}
