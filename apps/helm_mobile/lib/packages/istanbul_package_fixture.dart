import '../build/trip_gen/trip_answers.dart';
import '../build/trip_gen/trip_preview_draft.dart';

/// Curated Istanbul package idea shaped as shared [tripPreviewConstraintKind] v1.
class IstanbulPackageFixture {
  const IstanbulPackageFixture({
    required this.id,
    required this.title,
    required this.summary,
    required this.demoDefaultsLabel,
    required this.snapshot,
  });

  final String id;
  final String title;
  final String summary;
  final String demoDefaultsLabel;
  final TripPreviewDraftSnapshot snapshot;
}

const istanbulBosphorusPackageFixture = IstanbulPackageFixture(
  id: 'demo-istanbul-bosphorus-3n',
  title: 'Istanbul Bosphorus escape',
  summary:
      'Three nights with Hagia Sophia and the Grand Bazaar — customize lodging '
      'and stops in Build. Demo quote is Ubud-only for now.',
  demoDefaultsLabel:
      'Demo defaults: 90,000 EGP · 2 travelers · 3 nights · Ajia Hotel',
  snapshot: TripPreviewDraftSnapshot(
    answers: TripAnswers(
      budgetEgp: 90000,
      destination: TripDestinationChoice.istanbul,
      travelerCount: 2,
      lifestyle: TripLifestyle.culture,
      nights: 3,
      amenities: {'Breakfast included'},
    ),
    flightId: 'economy-example',
    hotelSlug: 'istanbul-ajia-hotel',
    includedActivitySlugs: {'hagia-sophia-exterior'},
    dayStopSlugs: [
      ['hagia-sophia-exterior', 'istanbul-grand-bazaar'],
      ['istanbul-galata-tower'],
      ['hagia-sophia-exterior'],
    ],
    constraintKind: tripPreviewConstraintKind,
  ),
);
