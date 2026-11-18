import { Inject, Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception';
import { CATEGORY_GROUPS, isPlaceCategory } from '../domain/categories';
import { CatalogRepository } from '../infrastructure/catalog.repository';
import {
  assertNoInternalLeak,
  toPublicDestination,
  toPublicPlace,
} from './public-catalog.mapper';

@Injectable()
export class CatalogQueryService {
  constructor(@Inject(CatalogRepository) private readonly repo: CatalogRepository) {}

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
    const items = result.items.map((row) => toPublicDestination(row));
    const body = { ...result, items };
    assertNoInternalLeak(body);
    return body;
  }

  async getPublicDestination(slug: string) {
    const row = await this.repo.getDestinationBySlug(slug, true);
    if (!row) throw AppException.notFound(`Destination not found: ${slug}`);
    const body = toPublicDestination(row);
    assertNoInternalLeak(body);
    return body;
  }

  async listPublicPlaces(query: {
    country?: string;
    city?: string;
    area?: string;
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
    const items = result.items.map((row) => toPublicPlace(row));
    const body = { ...result, items };
    assertNoInternalLeak(body);
    return body;
  }

  async getPublicPlace(slug: string) {
    const row = await this.repo.getPlaceBySlug(slug, true);
    if (!row) throw AppException.notFound(`Place not found: ${slug}`);
    const placeId = String(row.id);
    const category = String(row.category);
    const [media, tags, details] = await Promise.all([
      this.repo.listPublicMediaForPlace(placeId),
      this.repo.listPublicTagsForPlace(placeId),
      this.repo.getPublicPlaceDetails(placeId, category),
    ]);
    // List endpoints stay lean — category details only on the detail route.
    const body = {
      ...toPublicPlace(row),
      tags,
      media,
      details: details ?? null,
    };
    assertNoInternalLeak(body);
    return body;
  }

  listCategories() {
    return { items: CATEGORY_GROUPS };
  }

  async listTags() {
    const items = await this.repo.listTags(true);
    return { items };
  }
}
