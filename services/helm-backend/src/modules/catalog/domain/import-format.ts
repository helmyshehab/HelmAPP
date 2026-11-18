import { z } from 'zod';
import { PLACE_CATEGORIES, type PlaceCategory } from './categories';

const sourceSchema = z.object({
  sourceType: z.enum([
    'official_website',
    'hotel_website',
    'booking_platform',
    'maps_listing',
    'manual_research',
    'direct_confirmation',
    'partner_feed',
    'other',
  ]),
  name: z.string().min(1).max(200),
  url: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
  collectedAt: z.string().date().optional(),
});

/**
 * Canonical curated catalog JSON import format (Step 5).
 * Deterministic IDs via externalKey. Dry-run validates only.
 */
export const catalogImportSchema = z.object({
  formatVersion: z.literal('helm.catalog.import.v1'),
  sourceLabel: z.string().min(1).max(200).optional(),
  destinations: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        externalKey: z.string().min(1).max(200),
        slug: z.string().min(1).max(120),
        nameEn: z.string().min(1).max(200),
        nameAr: z.string().min(1).max(200),
        countryCode: z.string().length(2),
        citySlug: z.string().min(1).max(120).optional(),
        summaryEn: z.string().max(2000).optional(),
        summaryAr: z.string().max(2000).optional(),
        shortDescriptionEn: z.string().max(500).optional(),
        shortDescriptionAr: z.string().max(500).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        timezone: z.string().max(80).optional(),
        tags: z.array(z.string().min(1).max(64)).max(40).optional(),
        updateIfExists: z.boolean().default(false),
        sources: z.array(sourceSchema).max(20).optional(),
      }),
    )
    .max(500)
    .default([]),
  places: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        externalKey: z.string().min(1).max(200),
        destinationSlug: z.string().min(1).max(120),
        category: z.enum(PLACE_CATEGORIES),
        subcategory: z.string().min(1).max(80).default('general'),
        slug: z.string().min(1).max(120),
        nameEn: z.string().min(1).max(200),
        nameAr: z.string().min(1).max(200),
        shortDescriptionEn: z.string().max(500).optional(),
        shortDescriptionAr: z.string().max(500).optional(),
        descriptionEn: z.string().max(10000).optional(),
        descriptionAr: z.string().max(10000).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        addressText: z.string().max(500).optional(),
        websiteUrl: z.string().url().optional(),
        contactPhone: z.string().max(40).optional(),
        contactEmail: z.string().email().optional(),
        priceLevel: z.number().int().min(1).max(4).optional(),
        tags: z.array(z.string().min(1).max(64)).max(40).optional(),
        updateIfExists: z.boolean().default(false),
        accommodation: z
          .object({
            accommodationType: z
              .enum([
                'hotel',
                'resort',
                'villa',
                'apartment',
                'guesthouse',
                'boutique_hotel',
              ])
              .optional(),
            starRating: z.number().int().min(1).max(5).optional(),
            amenities: z.array(z.string()).max(100).optional(),
          })
          .optional(),
        dining: z
          .object({
            cuisineTypes: z.array(z.string()).max(40).optional(),
            mealTypes: z.array(z.string()).max(20).optional(),
            dietaryOptions: z.array(z.string()).max(40).optional(),
          })
          .optional(),
        attraction: z
          .object({
            attractionType: z
              .enum(['landmark', 'museum', 'cultural', 'natural', 'viewpoint', 'other'])
              .optional(),
            typicalDurationMinutes: z.number().int().positive().optional(),
            bookingRequired: z.boolean().optional(),
            suitableFor: z.array(z.string()).max(20).optional(),
          })
          .optional(),
        activity: z
          .object({
            activityType: z
              .enum(['adventure', 'water_sports', 'tour', 'outdoor', 'wellness', 'other'])
              .optional(),
            typicalDurationMinutes: z.number().int().positive().optional(),
            bookingRequired: z.boolean().optional(),
          })
          .optional(),
        nightlife: z
          .object({
            venueType: z
              .enum([
                'nightclub',
                'music_venue',
                'festival_venue',
                'bar_nightlife',
                'other',
              ])
              .optional(),
            musicGenres: z.array(z.string()).max(40).optional(),
          })
          .optional(),
        transport: z
          .object({
            transportType: z
              .enum(['airport_transfer', 'car_rental', 'local', 'intercity', 'other'])
              .optional(),
            serviceNotes: z.string().max(1000).optional(),
          })
          .optional(),
        sources: z.array(sourceSchema).max(20).optional(),
        rating: z
          .object({
            value: z.number().min(0).max(10),
            scale: z.number().positive().default(5),
            reviewCount: z.number().int().nonnegative().optional(),
            platform: z.string().min(1).max(80),
            observedAt: z.string().date(),
          })
          .optional(),
      }),
    )
    .max(5000)
    .default([]),
});

export type CatalogImportPayload = z.infer<typeof catalogImportSchema>;
export type CatalogImportPlace = CatalogImportPayload['places'][number];
export type CatalogImportDestination = CatalogImportPayload['destinations'][number];

export type ImportValidationIssue = {
  path: string;
  message: string;
};

const DINING_CATEGORIES: readonly PlaceCategory[] = [
  'restaurant',
  'cafe',
  'bar',
  'beach_club',
];

/** Reject incompatible category/detail combinations (never silent ignore). */
export function validatePlaceDetailCompatibility(
  place: CatalogImportPlace,
  pathPrefix: string,
): ImportValidationIssue[] {
  const errors: ImportValidationIssue[] = [];
  const cat = place.category;

  if (place.accommodation && cat !== 'accommodation') {
    errors.push({
      path: `${pathPrefix}.accommodation`,
      message: `accommodation details are only valid for category accommodation (got ${cat})`,
    });
  }
  if (place.dining && !DINING_CATEGORIES.includes(cat)) {
    errors.push({
      path: `${pathPrefix}.dining`,
      message: `dining details are only valid for food/drink categories (got ${cat})`,
    });
  }
  if (place.attraction && cat !== 'attraction') {
    errors.push({
      path: `${pathPrefix}.attraction`,
      message: `attraction details are only valid for category attraction (got ${cat})`,
    });
  }
  if (place.activity && cat !== 'activity') {
    errors.push({
      path: `${pathPrefix}.activity`,
      message: `activity details are only valid for category activity (got ${cat})`,
    });
  }
  if (place.nightlife && cat !== 'nightlife') {
    errors.push({
      path: `${pathPrefix}.nightlife`,
      message: `nightlife details are only valid for category nightlife (got ${cat})`,
    });
  }
  if (place.transport && cat !== 'transport') {
    errors.push({
      path: `${pathPrefix}.transport`,
      message: `transport details are only valid for category transport (got ${cat})`,
    });
  }
  return errors;
}

export function validateCatalogImport(input: unknown): {
  ok: boolean;
  data?: CatalogImportPayload;
  errors: ImportValidationIssue[];
} {
  const parsed = catalogImportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => ({
        path: i.path.join('.') || '(root)',
        message: i.message,
      })),
    };
  }

  const errors: ImportValidationIssue[] = [];
  const placeKeys = new Set<string>();
  const destKeys = new Set<string>();
  const destSlugs = new Set<string>();

  for (const [idx, dest] of parsed.data.destinations.entries()) {
    if (destKeys.has(dest.externalKey)) {
      errors.push({
        path: `destinations.${idx}.externalKey`,
        message: `Duplicate destination externalKey in payload: ${dest.externalKey}`,
      });
    }
    destKeys.add(dest.externalKey);
    if (destSlugs.has(dest.slug)) {
      errors.push({
        path: `destinations.${idx}.slug`,
        message: `Duplicate destination slug in payload: ${dest.slug}`,
      });
    }
    destSlugs.add(dest.slug);
  }

  for (const [idx, place] of parsed.data.places.entries()) {
    if (placeKeys.has(place.externalKey)) {
      errors.push({
        path: `places.${idx}.externalKey`,
        message: `Duplicate externalKey in payload: ${place.externalKey}`,
      });
    }
    placeKeys.add(place.externalKey);
    errors.push(...validatePlaceDetailCompatibility(place, `places.${idx}`));
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, data: parsed.data, errors: [] };
}
