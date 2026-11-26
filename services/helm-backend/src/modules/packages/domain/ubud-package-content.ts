import { z } from 'zod';
import { AppException } from '../../../common/errors/app.exception';

/** Build demo flight ids (must stay aligned with mobile trip_demo_pricing). */
export const packageFlightIds = ['economy-example', 'flexible-example'] as const;

/** Build demo hotel slugs. */
export const packageHotelSlugs = [
  'ubud-swasti-eco-cottages',
  'ubud-village-hotel',
  'ubud-adiwana-jembawan',
  'ubud-komaneka-bisma',
  'ubud-alila-ubud',
  'ubud-capella-ubud',
] as const;

/** Priced / schedulable activity slugs supported by Build demo rates. */
export const packageActivitySlugs = [
  'ubud-mount-batur-sunrise-trek',
  'ubud-atv-quad-bike-adventure',
  'ubud-ayung-river-rafting',
  'ubud-balinese-cooking-class',
  'ubud-sacred-monkey-forest',
  'ubud-campuhan-ridge-walk',
  'ubud-tirta-empul',
] as const;

const amenityOptions = [
  'Pool',
  'Spa',
  'Breakfast included',
  'Family-friendly',
  'Quiet location',
] as const;

const ubudPackageContentSchema = z.object({
  kind: z.literal('ubud_trip_preview'),
  version: z.literal(1),
  answers: z.object({
    budgetEgp: z.number().int().min(5000).max(5_000_000),
    destination: z.enum(['ubud', 'surprise']),
    travelerCount: z.number().int().min(1).max(20),
    lifestyle: z.enum(['culture', 'adventure', 'food', 'relaxed']),
    nights: z.number().int().min(1).max(14),
    amenities: z.array(z.enum(amenityOptions)).max(amenityOptions.length),
  }),
  selections: z.object({
    flightId: z.enum(packageFlightIds),
    hotelSlug: z.enum(packageHotelSlugs),
    includedActivitySlugs: z.array(z.enum(packageActivitySlugs)).max(packageActivitySlugs.length),
  }),
  itinerary: z.object({
    days: z
      .array(
        z.object({
          dayNumber: z.number().int(),
          stopSlugs: z.array(z.string().min(1).max(128)).max(30),
        }),
      )
      .min(1)
      .max(14),
  }),
});

export type UbudPackageContent = z.infer<typeof ubudPackageContentSchema>;

/** Structural Build-compatible parse (no catalog publish checks). */
export function parseUbudPackageContent(raw: unknown): UbudPackageContent {
  const parsed = ubudPackageContentSchema.safeParse(raw);
  if (!parsed.success) {
    throw AppException.validation(
      'Package content must be Build-compatible ubud_trip_preview v1 JSON',
    );
  }

  const { answers, selections, itinerary } = parsed.data;
  const stops = itinerary.days.flatMap((day) => day.stopSlugs);
  const scheduled = new Set(stops);
  const included = selections.includedActivitySlugs;

  if (
    itinerary.days.length !== answers.nights ||
    itinerary.days.some((day, index) => day.dayNumber !== index + 1) ||
    itinerary.days.some(
      (day) => new Set(day.stopSlugs).size !== day.stopSlugs.length,
    ) ||
    new Set(included).size !== included.length ||
    included.some((slug) => !scheduled.has(slug))
  ) {
    throw AppException.validation(
      'Package itinerary must match nights, keep stops unique within each day, and include every selected activity',
    );
  }

  return parsed.data;
}

/** @deprecated Prefer isBuildCompatiblePackageContent from trip-preview-content (dual-read). */
export function isUbudPackageContent(raw: unknown): boolean {
  try {
    parseUbudPackageContent(raw);
    return true;
  } catch {
    return false;
  }
}
