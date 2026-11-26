import { z } from 'zod';
import { AppException } from '../../../common/errors/app.exception';
import {
  packageActivitySlugs,
  packageFlightIds,
  packageHotelSlugs,
  parseUbudPackageContent,
  type UbudPackageContent,
} from './ubud-package-content';

/** Shared Build-compatible package / draft content kind (new destinations). */
export const tripPreviewConstraintKind = 'trip_preview' as const;
export const tripPreviewConstraintVersion = 1 as const;

/** Istanbul demo hotel slugs (must stay aligned with mobile + Admin defaults). */
export const istanbulPackageHotelSlugs = [
  'istanbul-ajia-hotel',
] as const;

/** Istanbul demo activity / stop slugs used in included activities allowlist. */
export const istanbulPackageActivitySlugs = [
  'hagia-sophia-exterior',
  'istanbul-grand-bazaar',
  'istanbul-galata-tower',
] as const;

const amenityOptions = [
  'Pool',
  'Spa',
  'Breakfast included',
  'Family-friendly',
  'Quiet location',
] as const;

const tripPreviewContentSchema = z.object({
  kind: z.literal(tripPreviewConstraintKind),
  version: z.literal(tripPreviewConstraintVersion),
  answers: z.object({
    budgetEgp: z.number().int().min(5000).max(5_000_000),
    destination: z.enum(['ubud', 'surprise', 'istanbul']),
    travelerCount: z.number().int().min(1).max(20),
    lifestyle: z.enum(['culture', 'adventure', 'food', 'relaxed']),
    nights: z.number().int().min(1).max(14),
    amenities: z.array(z.enum(amenityOptions)).max(amenityOptions.length),
  }),
  selections: z.object({
    flightId: z.enum(packageFlightIds),
    hotelSlug: z.string().min(1).max(128),
    includedActivitySlugs: z.array(z.string().min(1).max(128)).max(30),
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

export type TripPreviewContent = z.infer<typeof tripPreviewContentSchema>;

/** Normalized shape used by publish / public gates (legacy or shared). */
export type BuildCompatiblePackageContent = UbudPackageContent | TripPreviewContent;

function assertItineraryRules(content: {
  answers: { nights: number };
  selections: { includedActivitySlugs: string[] };
  itinerary: { days: { dayNumber: number; stopSlugs: string[] }[] };
}): void {
  const { answers, selections, itinerary } = content;
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
}

function assertDestinationAllowlists(content: TripPreviewContent): void {
  const destination = content.answers.destination;
  const hotel = content.selections.hotelSlug;
  const included = content.selections.includedActivitySlugs;

  if (destination === 'istanbul') {
    if (!(istanbulPackageHotelSlugs as readonly string[]).includes(hotel)) {
      throw AppException.validation(
        `Istanbul package hotel must be one of: ${istanbulPackageHotelSlugs.join(', ')}`,
      );
    }
    if (
      included.some(
        (slug) => !(istanbulPackageActivitySlugs as readonly string[]).includes(slug),
      )
    ) {
      throw AppException.validation(
        `Istanbul included activities must be from: ${istanbulPackageActivitySlugs.join(', ')}`,
      );
    }
    return;
  }

  // Forward-compatible trip_preview for Ubud / surprise (still Build allowlists).
  if (!(packageHotelSlugs as readonly string[]).includes(hotel)) {
    throw AppException.validation(
      `Ubud package hotel must be one of: ${packageHotelSlugs.join(', ')}`,
    );
  }
  if (
    included.some((slug) => !(packageActivitySlugs as readonly string[]).includes(slug))
  ) {
    throw AppException.validation(
      `Ubud included activities must be from: ${packageActivitySlugs.join(', ')}`,
    );
  }
}

/** Structural parse for shared trip_preview v1 (no catalog publish checks). */
export function parseTripPreviewContent(raw: unknown): TripPreviewContent {
  const parsed = tripPreviewContentSchema.safeParse(raw);
  if (!parsed.success) {
    throw AppException.validation(
      'Package content must be Build-compatible trip_preview v1 JSON',
    );
  }
  assertItineraryRules(parsed.data);
  assertDestinationAllowlists(parsed.data);
  return parsed.data;
}

/**
 * Dual-read: legacy `ubud_trip_preview` v1 or shared `trip_preview` v1.
 * Does not migrate or rewrite stored content.
 */
export function parseBuildCompatiblePackageContent(
  raw: unknown,
): BuildCompatiblePackageContent {
  if (raw && typeof raw === 'object' && 'kind' in raw) {
    const kind = (raw as { kind?: unknown }).kind;
    if (kind === tripPreviewConstraintKind) {
      return parseTripPreviewContent(raw);
    }
    if (kind === 'ubud_trip_preview') {
      return parseUbudPackageContent(raw);
    }
  }
  throw AppException.validation(
    'Package content must be Build-compatible trip_preview v1 or ubud_trip_preview v1 JSON',
  );
}

export function isBuildCompatiblePackageContent(raw: unknown): boolean {
  try {
    parseBuildCompatiblePackageContent(raw);
    return true;
  } catch {
    return false;
  }
}

export function requiredPublishedSlugs(
  content: BuildCompatiblePackageContent,
): string[] {
  const stops = content.itinerary.days.flatMap((day) => day.stopSlugs);
  return [...new Set([content.selections.hotelSlug, ...stops])];
}

/** Destination slug that must own published hotel/stops for this content. */
export function expectedDestinationSlugForContent(
  content: BuildCompatiblePackageContent,
): 'ubud' | 'istanbul' {
  if (content.kind === 'ubud_trip_preview') return 'ubud';
  if (content.answers.destination === 'istanbul') return 'istanbul';
  return 'ubud';
}
