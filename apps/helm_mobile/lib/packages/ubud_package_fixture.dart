import '../build/trip_gen/trip_answers.dart';
import '../build/trip_gen/trip_preview_draft.dart';

/// Curated Ubud package idea shaped as [ubud_trip_preview] v1.
///
/// Used by the offline demo mock and focused tests. Production Packages loads
/// published packages from the API; this fixture stays the demo payload.
class UbudPackageFixture {
  const UbudPackageFixture({
    required this.id,
    required this.title,
    required this.summary,
    required this.demoDefaultsLabel,
    required this.snapshot,
  });

  final String id;
  final String title;
  final String summary;

  /// Shown on the Packages card so demo budget/party/nights are explicit.
  final String demoDefaultsLabel;

  /// Immutable curated defaults. Customize always starts from this snapshot.
  final TripPreviewDraftSnapshot snapshot;
}

/// Staging-compatible Ubud culture package (published places only; no cooking class).
const ubudCulturePackageFixture = UbudPackageFixture(
  id: 'demo-ubud-culture-3n',
  title: 'Ubud culture escape',
  summary:
      'Three nights in central Ubud with Sacred Monkey Forest and Moksa — '
      'customize lodging and stops in Build.',
  demoDefaultsLabel:
      'Demo defaults: 85,000 EGP · 2 travelers · 3 nights · Village Hotel',
  snapshot: TripPreviewDraftSnapshot(
    answers: TripAnswers(
      budgetEgp: 85000,
      destination: TripDestinationChoice.ubud,
      travelerCount: 2,
      lifestyle: TripLifestyle.culture,
      nights: 3,
      amenities: {'Pool', 'Breakfast included'},
    ),
    flightId: 'economy-example',
    hotelSlug: 'ubud-village-hotel',
    includedActivitySlugs: {'ubud-sacred-monkey-forest'},
    dayStopSlugs: [
      ['ubud-sacred-monkey-forest', 'ubud-moksa'],
      ['ubud-moksa'],
      ['ubud-sacred-monkey-forest'],
    ],
  ),
);

/// Packages currently ships a single curated demo idea.
const packagesDemoIdeas = <UbudPackageFixture>[
  ubudCulturePackageFixture,
];
