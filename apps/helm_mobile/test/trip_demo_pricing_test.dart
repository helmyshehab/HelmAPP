import 'package:flutter_test/flutter_test.dart';
import 'package:helm_mobile/build/trip_gen/trip_demo_pricing.dart';

void main() {
  final economy = demoFlightById('economy-example')!;
  final flexible = demoFlightById('flexible-example')!;

  test('estimate uses flight×travelers + lodging×nights + activities×travelers',
      () {
    final estimate = calculateTripDemoEstimate(
      travelerCount: 3,
      nights: 4,
      budgetEgp: 120000,
      flight: economy,
      hotelTier: DemoHotelTier.base,
      selectedActivityRatesPerTraveler: const [2200, 350],
    );

    expect(estimate.flightTotalEgp, 18500 * 3);
    expect(estimate.lodgingTotalEgp, demoHotelBaseRateEgpPerNight * 4);
    expect(estimate.activitiesTotalEgp, (2200 + 350) * 3);
    expect(
      estimate.totalEgp,
      estimate.flightTotalEgp +
          estimate.lodgingTotalEgp +
          estimate.activitiesTotalEgp,
    );
    expect(estimate.totalEgp, 55500 + 18000 + 7650);
  });

  test('removing then restoring an activity changes the total correctly', () {
    const travelers = 2;
    const nights = 3;
    const rates = [1800, 1200, 400];

    final withAll = calculateTripDemoEstimate(
      travelerCount: travelers,
      nights: nights,
      budgetEgp: 90000,
      flight: flexible,
      hotelTier: DemoHotelTier.upgrade,
      selectedActivityRatesPerTraveler: rates,
    );
    final withoutMiddle = calculateTripDemoEstimate(
      travelerCount: travelers,
      nights: nights,
      budgetEgp: 90000,
      flight: flexible,
      hotelTier: DemoHotelTier.upgrade,
      selectedActivityRatesPerTraveler: const [1800, 400],
    );
    final restored = calculateTripDemoEstimate(
      travelerCount: travelers,
      nights: nights,
      budgetEgp: 90000,
      flight: flexible,
      hotelTier: DemoHotelTier.upgrade,
      selectedActivityRatesPerTraveler: rates,
    );

    expect(withAll.activitiesTotalEgp - withoutMiddle.activitiesTotalEgp,
        1200 * travelers);
    expect(withAll.totalEgp - withoutMiddle.totalEgp, 1200 * travelers);
    expect(restored.totalEgp, withAll.totalEgp);
    expect(withoutMiddle.lodgingTotalEgp,
        demoHotelUpgradeRateEgpPerNight * nights);
  });

  test('upgrade cost for stay is the per-night delta times nights', () {
    expect(demoHotelUpgradeCostForStay(2), (9800 - 4500) * 2);
    expect(demoHotelUpgradeCostForStay(5), (9800 - 4500) * 5);
  });

  test('budget comparison signs', () {
    final under = calculateTripDemoEstimate(
      travelerCount: 1,
      nights: 1,
      budgetEgp: 100000,
      flight: economy,
      hotelTier: DemoHotelTier.base,
      selectedActivityRatesPerTraveler: const [],
    );
    expect(under.isUnderBudget, isTrue);
    expect(under.amountOverBudgetEgp, under.totalEgp - 100000);

    final over = calculateTripDemoEstimate(
      travelerCount: 2,
      nights: 5,
      budgetEgp: 10000,
      flight: flexible,
      hotelTier: DemoHotelTier.upgrade,
      selectedActivityRatesPerTraveler: const [2200],
    );
    expect(over.isOverBudget, isTrue);
  });

  test('demo hotels expose Ubud curated tiers plus Istanbul base lodging', () {
    expect(demoHotelsInTier(DemoHotelTier.base), hasLength(4));
    expect(demoHotelsInTier(DemoHotelTier.upgrade), hasLength(3));
    expect(
      demoHotelOptions.map((h) => h.slug).toSet(),
      {
        'ubud-swasti-eco-cottages',
        'ubud-village-hotel',
        'ubud-adiwana-jembawan',
        'ubud-komaneka-bisma',
        'ubud-alila-ubud',
        'ubud-capella-ubud',
        'istanbul-ajia-hotel',
      },
    );
  });
}
