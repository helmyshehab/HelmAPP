import 'package:flutter_test/flutter_test.dart';
import 'package:helm_mobile/build/trip_gen/trip_answers.dart';
import 'package:helm_mobile/build/trip_gen/trip_planner.dart';
import 'package:helm_mobile/build/trip_gen/ubud_demo_catalog.dart';

TripAnswers _valid({
  int nights = 3,
  TripLifestyle lifestyle = TripLifestyle.culture,
  TripDestinationChoice destination = TripDestinationChoice.ubud,
}) {
  return TripAnswers(
    budgetEgp: 75000,
    destination: destination,
    travelerCount: 2,
    lifestyle: lifestyle,
    nights: nights,
    amenities: const {'Pool'},
  );
}

void main() {
  test('nights shapes preview day count', () {
    final two = planDemoTrip(_valid(nights: 2));
    final five = planDemoTrip(_valid(nights: 5));
    expect(two.days.length, 2);
    expect(five.days.length, 5);
    expect(five.days.map((d) => d.dayNumber).toList(), [1, 2, 3, 4, 5]);
  });

  test('lifestyle changes recommended places', () {
    final culture = planDemoTrip(_valid(lifestyle: TripLifestyle.culture));
    final adventure = planDemoTrip(_valid(lifestyle: TripLifestyle.adventure));
    final cultureSlugs = previewPlaceSlugs(culture);
    final adventureSlugs = previewPlaceSlugs(adventure);
    expect(cultureSlugs.contains('ubud-tirta-empul'), isTrue);
    expect(adventureSlugs.contains('ubud-mount-batur-sunrise-trek'), isTrue);
    expect(cultureSlugs, isNot(equals(adventureSlugs)));
  });

  test('does not repeat day stops while unused options remain', () {
    final plan = planDemoTrip(_valid(nights: 3, lifestyle: TripLifestyle.food));
    final stopSlugs = previewDayStopSlugs(plan);
    expect(stopSlugs.toSet().length, stopSlugs.length);
  });

  test('Mount Batur sunrise trek is scheduled in a morning slot', () {
    final plan = planDemoTrip(
      _valid(nights: 2, lifestyle: TripLifestyle.adventure),
    );
    final baturStops = plan.days
        .expand((day) => day.stops)
        .where((stop) => stop.place.slug == 'ubud-mount-batur-sunrise-trek')
        .toList();
    expect(baturStops, isNotEmpty);
    expect(baturStops.every((stop) => stop.roleLabel == 'Morning'), isTrue);
  });

  test('longer itineraries leave open time instead of repeating stops', () {
    final plan = planDemoTrip(
      _valid(nights: 10, lifestyle: TripLifestyle.adventure),
    );
    final stopSlugs = previewDayStopSlugs(plan);
    expect(stopSlugs.toSet().length, stopSlugs.length);
    expect(plan.days.any((day) => day.stops.isEmpty), isTrue);
  });

  test('every recommended place exists in the demo catalog', () {
    for (final lifestyle in TripLifestyle.values) {
      final plan = planDemoTrip(_valid(lifestyle: lifestyle, nights: 4));
      for (final slug in previewPlaceSlugs(plan)) {
        expect(ubudPlaceBySlug(slug), isNotNull, reason: slug);
      }
    }
  });

  test('surprise destination still previews Ubud', () {
    final plan = planDemoTrip(
      _valid(destination: TripDestinationChoice.surprise),
    );
    expect(plan.destinationSlug, 'ubud');
    expect(plan.surpriseResolvedToUbud, isTrue);
  });

  test('requested preferences retain budget travelers and amenities', () {
    final plan = planDemoTrip(_valid());
    expect(
      plan.requestedPreferences.any((line) => line.contains('75000 EGP')),
      isTrue,
    );
    expect(
      plan.requestedPreferences.any((line) => line.contains('Travelers: 2')),
      isTrue,
    );
    expect(
      plan.requestedPreferences.any((line) => line.contains('Pool')),
      isTrue,
    );
  });

  test('validateTripAnswers rejects incomplete inputs', () {
    final invalid = validateTripAnswers(const TripAnswers());
    expect(invalid.isValid, isFalse);
    expect(invalid.budgetError, isNotNull);
    expect(invalid.travelersError, isNotNull);
    expect(invalid.nightsError, isNotNull);
  });
}
