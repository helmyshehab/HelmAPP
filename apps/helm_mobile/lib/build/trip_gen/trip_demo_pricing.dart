/// Demo-only price estimate for the local Ubud trip preview.
///
/// Amounts are integer EGP and are separate from catalog facts — not live
/// inventory, booking rates, or verified amenity pricing.
library;

import 'ubud_demo_catalog.dart';

/// Example flight options (rate is EGP per traveler for the whole trip).
class DemoFlightOption {
  const DemoFlightOption({
    required this.id,
    required this.label,
    required this.rateEgpPerTraveler,
    this.includesDomesticFlights = false,
  });

  final String id;
  final String label;
  final int rateEgpPerTraveler;
  final bool includesDomesticFlights;
}

const demoFlightOptions = <DemoFlightOption>[
  DemoFlightOption(
    id: 'economy-example',
    label: 'Example economy round-trip',
    rateEgpPerTraveler: 18500,
  ),
  DemoFlightOption(
    id: 'flexible-example',
    label: 'Example flexible round-trip',
    rateEgpPerTraveler: 26500,
  ),
];

DemoFlightOption? demoFlightById(String id) {
  for (final option in demoFlightOptions) {
    if (option.id == id) return option;
  }
  return null;
}

enum DemoHotelTier { base, upgrade }

/// Curated lodging choices — identities from `ubud-curated-v1`.
class DemoHotelOption {
  const DemoHotelOption({
    required this.slug,
    required this.tier,
  });

  final String slug;
  final DemoHotelTier tier;
}

/// Demo lodging rate per night for the whole group (not per traveler).
const demoHotelBaseRateEgpPerNight = 4500;
const demoHotelUpgradeRateEgpPerNight = 9800;

int demoHotelRateEgpPerNight(DemoHotelTier tier) {
  switch (tier) {
    case DemoHotelTier.base:
      return demoHotelBaseRateEgpPerNight;
    case DemoHotelTier.upgrade:
      return demoHotelUpgradeRateEgpPerNight;
  }
}

/// Upgrade premium for the full stay: (upgrade − base) × nights.
int demoHotelUpgradeCostForStay(int nights) {
  return (demoHotelUpgradeRateEgpPerNight - demoHotelBaseRateEgpPerNight) *
      nights;
}

const demoHotelOptions = <DemoHotelOption>[
  DemoHotelOption(slug: 'ubud-swasti-eco-cottages', tier: DemoHotelTier.base),
  DemoHotelOption(slug: 'ubud-village-hotel', tier: DemoHotelTier.base),
  DemoHotelOption(slug: 'ubud-adiwana-jembawan', tier: DemoHotelTier.base),
  DemoHotelOption(slug: 'ubud-komaneka-bisma', tier: DemoHotelTier.upgrade),
  DemoHotelOption(slug: 'ubud-alila-ubud', tier: DemoHotelTier.upgrade),
  DemoHotelOption(slug: 'ubud-capella-ubud', tier: DemoHotelTier.upgrade),
  // Istanbul local estimate only — server demo quote remains Ubud-only.
  DemoHotelOption(slug: 'istanbul-ajia-hotel', tier: DemoHotelTier.base),
];

DemoHotelOption? demoHotelBySlug(String slug) {
  for (final option in demoHotelOptions) {
    if (option.slug == slug) return option;
  }
  return null;
}

List<DemoHotelOption> demoHotelsInTier(DemoHotelTier tier) {
  return demoHotelOptions.where((h) => h.tier == tier).toList(growable: false);
}

/// Per-traveler demo rates for priced itinerary activities / attractions.
const demoActivityRateEgpPerTraveler = <String, int>{
  'ubud-mount-batur-sunrise-trek': 2200,
  'ubud-atv-quad-bike-adventure': 1800,
  'ubud-ayung-river-rafting': 1500,
  'ubud-balinese-cooking-class': 1200,
  'ubud-sacred-monkey-forest': 350,
  'ubud-campuhan-ridge-walk': 0,
  'ubud-tirta-empul': 400,
  // Istanbul local estimate only — not used for server quotes.
  'hagia-sophia-exterior': 0,
  'istanbul-grand-bazaar': 0,
  'istanbul-galata-tower': 250,
};

bool isPricedDemoActivity(UbudDemoPlace place) =>
    demoActivityRateEgpPerTraveler.containsKey(place.slug);

int? demoActivityRateForSlug(String slug) =>
    demoActivityRateEgpPerTraveler[slug];

class TripDemoEstimate {
  const TripDemoEstimate({
    required this.flightTotalEgp,
    required this.lodgingTotalEgp,
    required this.activitiesTotalEgp,
    this.airportTransfersTotalEgp,
    required this.totalEgp,
    required this.budgetEgp,
  });

  final int flightTotalEgp;
  final int lodgingTotalEgp;
  final int activitiesTotalEgp;
  final int? airportTransfersTotalEgp;
  final int totalEgp;
  final int budgetEgp;

  /// Positive when the estimate exceeds the questionnaire budget.
  int get amountOverBudgetEgp => totalEgp - budgetEgp;

  bool get isOverBudget => amountOverBudgetEgp > 0;
  bool get isUnderBudget => amountOverBudgetEgp < 0;
  bool get isOnBudget => amountOverBudgetEgp == 0;
}

/// Plain Dart estimate:
/// Flight and activities are per traveler, lodging is per night, and airport
/// transfers are a group total when a rate is available.
TripDemoEstimate calculateTripDemoEstimate({
  required int travelerCount,
  required int nights,
  required int budgetEgp,
  required DemoFlightOption flight,
  required DemoHotelTier hotelTier,
  required Iterable<int> selectedActivityRatesPerTraveler,
  int? airportTransfersTotalEgp,
}) {
  final flightTotal = flight.rateEgpPerTraveler * travelerCount;
  final lodgingTotal = demoHotelRateEgpPerNight(hotelTier) * nights;
  var activitiesTotal = 0;
  for (final rate in selectedActivityRatesPerTraveler) {
    activitiesTotal += rate * travelerCount;
  }
  final total = flightTotal +
      lodgingTotal +
      activitiesTotal +
      (airportTransfersTotalEgp ?? 0);
  return TripDemoEstimate(
    flightTotalEgp: flightTotal,
    lodgingTotalEgp: lodgingTotal,
    activitiesTotalEgp: activitiesTotal,
    airportTransfersTotalEgp: airportTransfersTotalEgp,
    totalEgp: total,
    budgetEgp: budgetEgp,
  );
}

String formatDemoEgp(int amount) => '$amount EGP';

String formatAirportTransfersEstimate(int? amount) =>
    amount == null ? 'City pricing pending' : formatDemoEgp(amount);
