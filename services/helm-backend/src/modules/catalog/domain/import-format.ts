import { z } from 'zod';
import { PLACE_CATEGORIES } from './categories';

/**
 * Canonical curated catalog JSON import format (Step 5).
 * Deterministic IDs via externalKey / optional uuid. Dry-run validates only.
 */
export const catalogImportSchema = z.object({
  formatVersion: z.literal('helm.catalog.import.v1'),
  sourceLabel: z.string().min(1).max(200).optional(),
  destinations: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        externalKey: z.string().min(1).max(200).optional(),
        slug: z.string().min(1).max(120),
        nameEn: z.string().min(1).max(200),
        nameAr: z.string().min(1).max(200),
        countryCode: z.string().length(2),
        citySlug: z.string().min(1).max(120).optional(),
        summaryEn: z.string().max(2000).optional(),
        summaryAr: z.string().max(2000).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        timezone: z.string().max(80).optional(),
        tags: z.array(z.string().min(1).max(64)).max(40).optional(),
        sources: z
          .array(
            z.object({
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
            }),
          )
          .max(20)
          .optional(),
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
        sources: z
          .array(
            z.object({
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
            }),
          )
          .max(20)
          .optional(),
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

export type ImportValidationIssue = {
  path: string;
  message: string;
};

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
  const externalKeys = new Set<string>();
  for (const [idx, place] of parsed.data.places.entries()) {
    if (externalKeys.has(place.externalKey)) {
      errors.push({
        path: `places.${idx}.externalKey`,
        message: `Duplicate externalKey in payload: ${place.externalKey}`,
      });
    }
    externalKeys.add(place.externalKey);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, data: parsed.data, errors: [] };
}
