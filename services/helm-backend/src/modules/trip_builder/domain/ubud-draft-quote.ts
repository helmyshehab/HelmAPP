import { z } from 'zod';
import { AppException } from '../../../common/errors/app.exception';

export const ubudQuoteRateVersion = 'ubud-demo-v1';

const flightRates = {
  'economy-example': 18500,
  'flexible-example': 26500,
};

const stayRates = {
  'ubud-swasti-eco-cottages': 4500,
  'ubud-village-hotel': 4500,
  'ubud-adiwana-jembawan': 4500,
  'ubud-komaneka-bisma': 9800,
  'ubud-alila-ubud': 9800,
  'ubud-capella-ubud': 9800,
};

const activityRates = {
  'ubud-mount-batur-sunrise-trek': 2200,
  'ubud-atv-quad-bike-adventure': 1800,
  'ubud-ayung-river-rafting': 1500,
  'ubud-balinese-cooking-class': 1200,
  'ubud-sacred-monkey-forest': 350,
  'ubud-campuhan-ridge-walk': 0,
  'ubud-tirta-empul': 400,
};

function pricedSlug<T extends Record<string, number>>(rates: T) {
  type Slug = Extract<keyof T, string>;
  return z.enum(Object.keys(rates) as [Slug, ...Slug[]]);
}

const draftQuoteInput = z.object({
  kind: z.literal('ubud_trip_preview'),
  version: z.literal(1),
  answers: z.object({
    destination: z.enum(['ubud', 'surprise']),
    travelerCount: z.number().int().min(1).max(20),
    nights: z.number().int().min(1).max(14),
  }),
  selections: z.object({
    flightId: pricedSlug(flightRates),
    hotelSlug: pricedSlug(stayRates),
    includedActivitySlugs: z.array(pricedSlug(activityRates)).max(Object.keys(activityRates).length),
  }),
  itinerary: z.object({
    days: z.array(z.object({
      dayNumber: z.number().int(),
      stopSlugs: z.array(z.string().min(1).max(128)).max(30),
    })).max(14),
  }),
});

export function calculateUbudDraftQuote(constraints: unknown) {
  const parsed = draftQuoteInput.safeParse(constraints);
  if (!parsed.success) {
    throw AppException.validation('The saved draft does not contain supported Ubud pricing selections');
  }

  const { answers, selections, itinerary } = parsed.data;
  const stops = itinerary.days.flatMap((day) => day.stopSlugs);
  const scheduledStops = new Set(stops);
  const included = selections.includedActivitySlugs;
  if (itinerary.days.length !== answers.nights ||
      itinerary.days.some((day, index) => day.dayNumber !== index + 1) ||
      scheduledStops.size !== stops.length ||
      new Set(included).size !== included.length ||
      included.some((slug) => !scheduledStops.has(slug))) {
    throw AppException.validation('The saved itinerary does not match the selected activities or number of nights');
  }

  const flightTotalEgp = flightRates[selections.flightId] * answers.travelerCount;
  const lodgingTotalEgp = stayRates[selections.hotelSlug] * answers.nights;
  const activitiesTotalEgp = included.reduce((sum, slug) => sum + activityRates[slug], 0) * answers.travelerCount;
  return {
    currency: 'EGP' as const,
    source: 'demo' as const,
    rateVersion: ubudQuoteRateVersion,
    travelerCount: answers.travelerCount,
    nights: answers.nights,
    flightTotalEgp,
    lodgingTotalEgp,
    activitiesTotalEgp,
    totalEgp: flightTotalEgp + lodgingTotalEgp + activitiesTotalEgp,
  };
}

export type UbudDraftQuotePrice = ReturnType<typeof calculateUbudDraftQuote>;
