import 'package:helm_api_client/helm_api_client.dart';

import 'istanbul_demo_catalog.dart';
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

/// Legacy Ubud marker stored in `TripDraft.constraints` / package content.
const ubudTripPreviewConstraintKind = 'ubud_trip_preview';

/// Shared destination-aware marker for new packages (e.g. Istanbul).
const tripPreviewConstraintKind = 'trip_preview';

const ubudTripPreviewConstraintVersion = 1;
const tripPreviewConstraintVersion = 1;

/// Serializable private-draft payload for an edited trip preview.
class TripPreviewDraftSnapshot {
  const TripPreviewDraftSnapshot({
    required this.answers,
    required this.flightId,
    required this.hotelSlug,
    required this.includedActivitySlugs,
    required this.dayStopSlugs,
    this.constraintKind = ubudTripPreviewConstraintKind,
  });

  final TripAnswers answers;
  final String flightId;
  final String hotelSlug;
  final Set<String> includedActivitySlugs;

  /// Per-day stop order (catalog slugs) for reopen fidelity.
  final List<List<String>> dayStopSlugs;

  /// Preserved on save: legacy Ubud drafts keep [ubudTripPreviewConstraintKind].
  final String constraintKind;

  bool get supportsDemoQuote =>
      constraintKind == ubudTripPreviewConstraintKind &&
      (answers.destination == TripDestinationChoice.ubud ||
          answers.destination == TripDestinationChoice.surprise);

  Map<String, dynamic> toConstraints() {
    final amenities = answers.amenities.toList()..sort();
    final included = includedActivitySlugs.toList()..sort();
    return {
      'kind': constraintKind,
      'version': constraintKind == tripPreviewConstraintKind
          ? tripPreviewConstraintVersion
          : ubudTripPreviewConstraintVersion,
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
    String? constraintKind,
  }) {
    final kind = constraintKind ??
        (plan.destinationSlug == 'istanbul'
            ? tripPreviewConstraintKind
            : ubudTripPreviewConstraintKind);
    return TripPreviewDraftSnapshot(
      answers: plan.answers,
      flightId: flightId,
      hotelSlug: hotelSlug,
      includedActivitySlugs: {...includedActivitySlugs},
      dayStopSlugs: [
        for (final day in plan.days)
          [for (final stop in day.stops) stop.place.slug],
      ],
      constraintKind: kind,
    );
  }
}

bool isUbudTripPreviewDraft(TripDraft draft) {
  return tryParseUbudTripPreviewDraft(draft.constraints) != null;
}

bool isTripPreviewDraft(TripDraft draft) {
  return tryParseTripPreviewDraft(draft.constraints) != null;
}

/// Dual-read: shared [tripPreviewConstraintKind] or legacy [ubudTripPreviewConstraintKind].
TripPreviewDraftSnapshot? tryParseTripPreviewDraft(
  Map<String, dynamic> constraints,
) {
  final kind = constraints['kind'];
  if (kind != ubudTripPreviewConstraintKind &&
      kind != tripPreviewConstraintKind) {
    return null;
  }
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

  // Legacy kind must stay Ubud/surprise; shared kind may be Istanbul.
  if (kind == ubudTripPreviewConstraintKind &&
      destination == TripDestinationChoice.istanbul) {
    return null;
  }
  if (kind == tripPreviewConstraintKind &&
      destination != TripDestinationChoice.istanbul &&
      destination != TripDestinationChoice.ubud &&
      destination != TripDestinationChoice.surprise) {
    return null;
  }

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

  if (dayStopSlugs.isEmpty && destination != TripDestinationChoice.istanbul) {
    final planned = planDemoTrip(answers);
    for (final day in planned.days) {
      dayStopSlugs.add([
        for (final stop in day.stops) stop.place.slug,
      ]);
    }
  }

  if (dayStopSlugs.isEmpty) return null;

  return TripPreviewDraftSnapshot(
    answers: answers,
    flightId: flightId,
    hotelSlug: hotelSlug,
    includedActivitySlugs: included,
    dayStopSlugs: List.unmodifiable(dayStopSlugs),
    constraintKind: kind as String,
  );
}

/// Backward-compatible alias — dual-reads both kinds.
TripPreviewDraftSnapshot? tryParseUbudTripPreviewDraft(
  Map<String, dynamic> constraints,
) =>
    tryParseTripPreviewDraft(constraints);

String tripPreviewDraftTitle(TripAnswers answers) {
  final nights = answers.nights;
  final place = switch (answers.destination) {
    TripDestinationChoice.istanbul => 'Istanbul',
    TripDestinationChoice.ubud || TripDestinationChoice.surprise => 'Ubud',
  };
  if (nights == null) return '$place trip preview';
  return '$place trip · $nights night${nights == 1 ? '' : 's'}';
}

String ubudTripPreviewDraftTitle(TripAnswers answers) =>
    tripPreviewDraftTitle(answers);

/// Rebuild a preview plan from a saved snapshot (answers + stored day order).
TripPreviewPlan planFromUbudTripPreviewDraft(
    TripPreviewDraftSnapshot snapshot) {
  return planFromTripPreviewDraft(snapshot);
}

TripPreviewPlan planFromTripPreviewDraft(TripPreviewDraftSnapshot snapshot) {
  if (snapshot.answers.destination == TripDestinationChoice.istanbul) {
    return _planFromIstanbulSnapshot(snapshot);
  }

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

TripPreviewPlan _planFromIstanbulSnapshot(TripPreviewDraftSnapshot snapshot) {
  final stay = istanbulPlaceBySlug(snapshot.hotelSlug) ??
      istanbulPlaceBySlug('istanbul-ajia-hotel')!;
  final rebuiltDays = <TripPreviewDay>[];
  for (var i = 0; i < snapshot.dayStopSlugs.length; i++) {
    final stops = <TripPreviewStop>[];
    for (final slug in snapshot.dayStopSlugs[i]) {
      final place = istanbulPlaceBySlug(slug);
      if (place == null) continue;
      stops.add(
        TripPreviewStop(
          place: place,
          roleLabel: TripPreviewStop.unscheduledRole,
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

  return TripPreviewPlan(
    destinationName: 'Istanbul',
    destinationSlug: 'istanbul',
    surpriseResolvedToUbud: false,
    answers: snapshot.answers,
    staySuggestion: stay,
    days: List.unmodifiable(rebuiltDays),
    requestedPreferences: [
      'Total budget: ${snapshot.answers.budgetEgp} EGP (matching not verified yet)',
      'Travelers: ${snapshot.answers.travelerCount} (group size noted for planning)',
      'Demo quote and checkout are available for Ubud only right now.',
    ],
  );
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
