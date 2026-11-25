import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/build/trip_gen/trip_answers.dart';
import 'package:helm_mobile/build/trip_gen/trip_planner.dart';
import 'package:helm_mobile/build/trip_gen/trip_preview_draft.dart';

void main() {
  test('round-trips Ubud preview snapshot through constraints', () {
    final answers = const TripAnswers(
      budgetEgp: 85000,
      destination: TripDestinationChoice.ubud,
      travelerCount: 2,
      lifestyle: TripLifestyle.culture,
      nights: 2,
      amenities: {'Pool'},
    );
    final plan = planDemoTrip(answers);
    final snapshot = TripPreviewDraftSnapshot.fromPlan(
      plan: plan,
      flightId: 'flexible-example',
      hotelSlug: 'ubud-swasti-eco-cottages',
      includedActivitySlugs: {'ubud-sacred-monkey-forest'},
    );

    final parsed = tryParseUbudTripPreviewDraft(snapshot.toConstraints());
    expect(parsed, isNotNull);
    expect(parsed!.answers.budgetEgp, 85000);
    expect(parsed.answers.amenities, {'Pool'});
    expect(parsed.flightId, 'flexible-example');
    expect(parsed.hotelSlug, 'ubud-swasti-eco-cottages');
    expect(parsed.includedActivitySlugs, {'ubud-sacred-monkey-forest'});
    expect(parsed.dayStopSlugs.length, 2);
    expect(
      parsed.dayStopSlugs.first,
      [for (final stop in plan.days.first.stops) stop.place.slug],
    );

    final restored = planFromUbudTripPreviewDraft(parsed);
    expect(previewDayStopSlugs(restored), previewDayStopSlugs(plan));
    expect(ubudTripPreviewDraftTitle(answers), 'Ubud trip · 2 nights');
  });

  test('ignores non-preview drafts and invalid payloads', () {
    expect(tryParseUbudTripPreviewDraft({'party': 2}), isNull);
    expect(
      tryParseUbudTripPreviewDraft({
        'kind': ubudTripPreviewConstraintKind,
        'version': 1,
        'answers': {'budgetEgp': 100},
      }),
      isNull,
    );

    final draft = TripDraft(
      id: '11111111-1111-1111-1111-111111111111',
      destinationId: null,
      title: 'Untitled',
      constraints: const {'party': 2},
      status: 'draft',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    );
    expect(isUbudTripPreviewDraft(draft), isFalse);
  });
}
