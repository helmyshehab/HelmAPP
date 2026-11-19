import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { Public } from '../../../common/auth/public.decorator';
import { ZodValidationPipe } from '../../../common/http/zod-validation.pipe';
import { z } from 'zod';
import { CatalogQueryService } from '../application/catalog-query.service';

const listDestinationsQuery = z.object({
  country: z.string().length(2).optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const listPlacesQuery = z.object({
  country: z.string().length(2).optional(),
  city: z.string().max(120).optional(),
  area: z.string().max(120).optional(),
  destinationSlug: z.string().min(1).max(120).optional(),
  category: z.string().max(40).optional(),
  subcategory: z.string().max(80).optional(),
  minRating: z.coerce.number().min(0).max(10).optional(),
  priceLevel: z.coerce.number().int().min(1).max(4).optional(),
  tag: z.string().max(64).optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  q: z.string().max(120).optional(),
  sort: z.enum(['name', 'rating', 'updated']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const listCountriesQuery = z.object({
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const listCitiesQuery = z.object({
  country: z.string().length(2).optional(),
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

@Public()
@Controller()
export class CatalogPublicController {
  constructor(@Inject(CatalogQueryService) private readonly queries: CatalogQueryService) {}

  @Get('destinations')
  listDestinations(
    @Query(new ZodValidationPipe(listDestinationsQuery))
    query: z.infer<typeof listDestinationsQuery>,
  ) {
    return this.queries.listPublicDestinations(query);
  }

  @Get('destinations/:slug')
  getDestination(@Param('slug') slug: string) {
    return this.queries.getPublicDestination(slug);
  }

  @Get('catalog/places')
  listPlaces(
    @Query(new ZodValidationPipe(listPlacesQuery)) query: z.infer<typeof listPlacesQuery>,
  ) {
    return this.queries.listPublicPlaces(query);
  }

  @Get('catalog/places/:slug')
  getPlace(@Param('slug') slug: string) {
    return this.queries.getPublicPlace(slug);
  }

  @Get('catalog/categories')
  listCategories() {
    return this.queries.listCategories();
  }

  @Get('catalog/tags')
  listTags() {
    return this.queries.listTags();
  }

  @Get('geo/countries')
  listCountries(
    @Query(new ZodValidationPipe(listCountriesQuery))
    query: z.infer<typeof listCountriesQuery>,
  ) {
    return this.queries.listCountries(query);
  }

  @Get('geo/cities')
  listCities(
    @Query(new ZodValidationPipe(listCitiesQuery)) query: z.infer<typeof listCitiesQuery>,
  ) {
    return this.queries.listCities(query);
  }
}
