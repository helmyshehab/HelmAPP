import 'package:helm_api_client/helm_api_client.dart';

import 'trip_answers.dart';
import 'trip_demo_pricing.dart';
import 'trip_planner.dart';
import 'ubud_demo_catalog.dart';

List<TripPreviewDay> demoBookingDays(
  TripPreviewPlan plan,
  Set<String> includedActivitySlugs,
) =>
    [
      for (final day in plan.days)
        TripPreviewDay(
          dayNumber: day.dayNumber,
          title: day.title,
          stops: [
            for (final stop in day.stops)
              if (!isPricedDemoActivity(stop.place) ||
                  includedActivitySlugs.contains(stop.place.slug))
                stop,
          ],
        ),
    ];

/// Marker stored in `TripDraft.constraints` for the local Ubud preview flow.
const ubudTripPreviewConstraintKind = 'ubud_trip_preview';
const ubudTripPreviewConstraintVersion = 1;

/// Serializable private-draft payload for an edited Ubud trip preview.
class TripPreviewDraftSnapshot {
  const TripPreviewDraftSnapshot({
    required this.answers,
    required this.flightId,
    required this.hotelSlug,
    required this.includedActivitySlugs,
    required this.dayStopSlugs,
  });

  final TripAnswers answers;
  final String flightId;
  final String hotelSlug;
  final Set<String> includedActivitySlugs;

  /// Per-day stop order (catalog slugs) for reopen fidelity.
  final List<List<String>> dayStopSlugs;

  Map<String, dynamic> toConstraints() {
    final amenities = answers.amenities.toList()..sort();
    final included = includedActivitySlugs.toList()..sort();
    return {
      'kind': ubudTripPreviewConstraintKind,
      'version': ubudTripPreviewConstraintVersion,
      'answers': {
        'budgetEgp': answers.budgetEgp,
        'destination': answers.destination.name,
        'travelerCount': answers.travelerCount,
        'lifestyle': answers.lifestyle.name,
        'nights': answers.nights,
        'amenities': amenities,
      },
      'selections': {
        'flightId': flightId,
        'hotelSlug': hotelSlug,
        'includedActivitySlugs': included,
      },
      'itinerary': {
        'days': [
          for (var i = 0; i < dayStopSlugs.length; i++)
            {
              'dayNumber': i + 1,
              'stopSlugs': dayStopSlugs[i],
            },
        ],
      },
    };
  }

  static TripPreviewDraftSnapshot fromPlan({
    required TripPreviewPlan plan,
    required String flightId,
    required String hotelSlug,
    required Set<String> includedActivitySlugs,
  }) {
    return TripPreviewDraftSnapshot(
      answers: plan.answers,
      flightId: flightId,
      hotelSlug: hotelSlug,
      includedActivitySlugs: {...includedActivitySlugs},
      dayStopSlugs: [
        for (final day in plan.days)
          [for (final stop in day.stops) stop.place.slug],
      ],
    );
  }
}

bool isUbudTripPreviewDraft(TripDraft draft) {
  return tryParseUbudTripPreviewDraft(draft.constraints) != null;
}

TripPreviewDraftSnapshot? tryParseUbudTripPreviewDraft(
  Map<String, dynamic> constraints,
) {
  if (constraints['kind'] != ubudTripPreviewConstraintKind) return null;
  final version = constraints['version'];
  if (version is! int || version < 1) return null;

  final answersRaw = constraints['answers'];
  if (answersRaw is! Map) return null;
  final answersMap = Map<String, dynamic>.from(answersRaw);

  final budget = answersMap['budgetEgp'];
  final travelers = answersMap['travelerCount'];
  final nights = answersMap['nights'];
  if (budget is! int || travelers is! int || nights is! int) return null;

  final destination = _parseDestination(answersMap['destination']);
  final lifestyle = _parseLifestyle(answersMap['lifestyle']);
  if (destination == null || lifestyle == null) return null;

  final amenitiesRaw = answersMap['amenities'];
  final amenities = <String>{};
  if (amenitiesRaw is List) {
    for (final item in amenitiesRaw) {
      if (item is String && tripAmenityOptions.contains(item)) {
        amenities.add(item);
      }
    }
  }

  final answers = TripAnswers(
    budgetEgp: budget,
    destination: destination,
    travelerCount: travelers,
    lifestyle: lifestyle,
    nights: nights,
    amenities: amenities,
  );
  if (!validateTripAnswers(answers).isValid) return null;

  final selectionsRaw = constraints['selections'];
  if (selectionsRaw is! Map) return null;
  final selections = Map<String, dynamic>.from(selectionsRaw);
  final flightId = selections['flightId'];
  final hotelSlug = selections['hotelSlug'];
  if (flightId is! String || flightId.isEmpty) return null;
  if (hotelSlug is! String || hotelSlug.isEmpty) return null;

  final includedRaw = selections['includedActivitySlugs'];
  final included = <String>{};
  if (includedRaw is List) {
    for (final item in includedRaw) {
      if (item is String && item.isNotEmpty) included.add(item);
    }
  }

  final dayStopSlugs = <List<String>>[];
  final itineraryRaw = constraints['itinerary'];
  if (itineraryRaw is Map) {
    final daysRaw = itineraryRaw['days'];
    if (daysRaw is List) {
      for (final dayRaw in daysRaw) {
        if (dayRaw is! Map) continue;
        final stopSlugsRaw = dayRaw['stopSlugs'];
        final stops = <String>[];
        if (stopSlugsRaw is List) {
          for (final slug in stopSlugsRaw) {
            if (slug is String && slug.isNotEmpty) stops.add(slug);
          }
        }
        dayStopSlugs.add(List.unmodifiable(stops));
      }
    }
  }

  if (dayStopSlugs.isEmpty) {
    // Fallback: derive order from the deterministic planner.
    final planned = planDemoTrip(answers);
    for (final day in planned.days) {
      dayStopSlugs.add([
        for (final stop in day.stops) stop.place.slug,
      ]);
    }
  }

  return TripPreviewDraftSnapshot(
    answers: answers,
    flightId: flightId,
    hotelSlug: hotelSlug,
    includedActivitySlugs: included,
    dayStopSlugs: List.unmodifiable(dayStopSlugs),
  );
}

String ubudTripPreviewDraftTitle(TripAnswers answers) {
  final nights = answers.nights;
  if (nights == null) return 'Ubud trip preview';
  return 'Ubud trip · $nights night${nights == 1 ? '' : 's'}';
}

/// Rebuild a preview plan from a saved snapshot (answers + stored day order).
TripPreviewPlan planFromUbudTripPreviewDraft(
    TripPreviewDraftSnapshot snapshot) {
  final planned = planDemoTrip(snapshot.answers);
  if (snapshot.dayStopSlugs.isEmpty) return planned;

  final roleBySlug = <String, String>{};
  for (final day in planned.days) {
    for (final stop in day.stops) {
      roleBySlug.putIfAbsent(stop.place.slug, () => stop.roleLabel);
    }
  }

  final rebuiltDays = <TripPreviewDay>[];
  for (var i = 0; i < snapshot.dayStopSlugs.length; i++) {
    final stops = <TripPreviewStop>[];
    for (final slug in snapshot.dayStopSlugs[i]) {
      final place = ubudPlaceBySlug(slug);
      if (place == null) continue;
      stops.add(
        TripPreviewStop(
          place: place,
          roleLabel: roleBySlug[slug] ?? TripPreviewStop.unscheduledRole,
        ),
      );
    }
    rebuiltDays.add(
      TripPreviewDay(
        dayNumber: i + 1,
        title: 'Day ${i + 1}',
        stops: List.unmodifiable(stops),
      ),
    );
  }

  return planned.withDays(rebuiltDays);
}

TripDestinationChoice? _parseDestination(Object? raw) {
  if (raw is! String) return null;
  for (final value in TripDestinationChoice.values) {
    if (value.name == raw) return value;
  }
  return null;
}

TripLifestyle? _parseLifestyle(Object? raw) {
  if (raw is! String) return null;
  for (final value in TripLifestyle.values) {
    if (value.name == raw) return value;
  }
  return null;
}
