import 'trip_answers.dart';
import 'ubud_demo_catalog.dart';

/// One stop in a preview day — catalog place only (no invented rates).
class TripPreviewStop {
  static const unscheduledRole = 'Stop';

  const TripPreviewStop({
    required this.place,
    required this.roleLabel,
  });

  final UbudDemoPlace place;
  final String roleLabel;
}

class TripPreviewDay {
  const TripPreviewDay({
    required this.dayNumber,
    required this.title,
    required this.stops,
  });

  final int dayNumber;
  final String title;
  final List<TripPreviewStop> stops;
}

/// In-memory trip preview produced by [planDemoTrip].
class TripPreviewPlan {
  const TripPreviewPlan({
    required this.destinationName,
    required this.destinationSlug,
    required this.surpriseResolvedToUbud,
    required this.answers,
    required this.staySuggestion,
    required this.days,
    required this.requestedPreferences,
  });

  final String destinationName;
  final String destinationSlug;
  final bool surpriseResolvedToUbud;
  final TripAnswers answers;
  final UbudDemoPlace staySuggestion;
  final List<TripPreviewDay> days;

  /// Inputs retained as preferences when catalog matching is not verified yet.
  final List<String> requestedPreferences;

  TripPreviewPlan withDays(List<TripPreviewDay> days) {
    return TripPreviewPlan(
      destinationName: destinationName,
      destinationSlug: destinationSlug,
      surpriseResolvedToUbud: surpriseResolvedToUbud,
      answers: answers,
      staySuggestion: staySuggestion,
      days: List.unmodifiable(days),
      requestedPreferences: requestedPreferences,
    );
  }
}

int _stopTimeOrder(TripPreviewStop stop) => switch (stop.roleLabel) {
      'Morning' => 0,
      'Afternoon' => 1,
      'Evening' => 2,
      _ => 3,
    };

/// Move a stop after any stops in the same time slot on the target day.
TripPreviewPlan movePreviewStop(
  TripPreviewPlan plan, {
  required TripPreviewStop stop,
  required int fromDay,
  required int toDay,
}) {
  final source = plan.days.indexWhere((day) => day.dayNumber == fromDay);
  final target = plan.days.indexWhere((day) => day.dayNumber == toDay);
  if (source < 0 ||
      target < 0 ||
      source == target ||
      !plan.days[source].stops.contains(stop)) {
    return plan;
  }

  final days = [...plan.days];
  final sourceDay = days[source];
  final targetDay = days[target];
  final targetStops = [...targetDay.stops];
  final insertionIndex = targetStops.indexWhere(
    (existing) => _stopTimeOrder(existing) > _stopTimeOrder(stop),
  );
  targetStops.insert(
    insertionIndex < 0 ? targetStops.length : insertionIndex,
    stop,
  );
  days[source] = TripPreviewDay(
    dayNumber: sourceDay.dayNumber,
    title: sourceDay.title,
    stops: List.unmodifiable([...sourceDay.stops]..remove(stop)),
  );
  days[target] = TripPreviewDay(
    dayNumber: targetDay.dayNumber,
    title: targetDay.title,
    stops: List.unmodifiable(targetStops),
  );
  return plan.withDays(days);
}

const _baturSlug = 'ubud-mount-batur-sunrise-trek';

/// Local deterministic planner — no network / AI provider.
TripPreviewPlan planDemoTrip(TripAnswers answers) {
  final validation = validateTripAnswers(answers);
  if (!validation.isValid) {
    throw ArgumentError('Trip answers failed validation');
  }

  final nights = answers.nights!;
  final lifestyle = answers.lifestyle;
  final surprise = answers.destination == TripDestinationChoice.surprise;

  final stay = _pickStay(lifestyle, answers.budgetEgp!);
  final daytime = _daytimePool(lifestyle);
  final evening = _eveningPool(lifestyle);
  final used = <String>{};
  final days = <TripPreviewDay>[];

  for (var day = 1; day <= nights; day++) {
    final stops = <TripPreviewStop>[];

    final morning = _takeUnused(
      _morningCandidates(lifestyle, daytime),
      used,
    );
    if (morning != null) {
      stops.add(TripPreviewStop(place: morning, roleLabel: 'Morning'));
    }

    final afternoon = _takeUnused(daytime, used);
    if (afternoon != null) {
      stops.add(TripPreviewStop(place: afternoon, roleLabel: 'Afternoon'));
    }

    final eveningStop = _takeUnused(evening, used);
    if (eveningStop != null) {
      stops.add(TripPreviewStop(place: eveningStop, roleLabel: 'Evening'));
    }

    days.add(
      TripPreviewDay(
        dayNumber: day,
        title: 'Day $day',
        stops: List.unmodifiable(stops),
      ),
    );
  }

  return TripPreviewPlan(
    destinationName: 'Ubud',
    destinationSlug: 'ubud',
    surpriseResolvedToUbud: surprise,
    answers: answers,
    staySuggestion: stay,
    days: List.unmodifiable(days),
    requestedPreferences: _requestedPreferences(answers),
  );
}

List<String> _requestedPreferences(TripAnswers answers) {
  final lines = <String>[
    'Total budget: ${answers.budgetEgp} EGP (matching not verified yet)',
    'Travelers: ${answers.travelerCount} (group size noted for planning)',
  ];
  if (answers.amenities.isNotEmpty) {
    final joined = answers.amenities.toList()..sort();
    lines.add(
      'Requested amenities: ${joined.join(', ')} '
      '(not confirmed against catalog inventory)',
    );
  } else {
    lines.add('No accommodation amenities requested');
  }
  return List.unmodifiable(lines);
}

UbudDemoPlace _pickStay(TripLifestyle lifestyle, int budgetEgp) {
  // Budget bands only steer which catalog stay is suggested — no invented rates.
  if (budgetEgp < 40000) {
    return ubudPlaceBySlug('ubud-swasti-eco-cottages')!;
  }
  if (lifestyle == TripLifestyle.relaxed || budgetEgp >= 120000) {
    return ubudPlaceBySlug('ubud-alila-ubud')!;
  }
  return ubudPlaceBySlug('ubud-komaneka-bisma')!;
}

/// Daytime activities/attractions/dining — Mount Batur stays morning-only when used.
List<UbudDemoPlace> _daytimePool(TripLifestyle lifestyle) {
  switch (lifestyle) {
    case TripLifestyle.culture:
      return [
        ubudPlaceBySlug('ubud-sacred-monkey-forest')!,
        ubudPlaceBySlug('ubud-tirta-empul')!,
        ubudPlaceBySlug('ubud-balinese-cooking-class')!,
        ubudPlaceBySlug('ubud-campuhan-ridge-walk')!,
        ubudPlaceBySlug('ubud-murnis-warung')!,
        ubudPlaceBySlug('ubud-suka-ubud')!,
      ];
    case TripLifestyle.adventure:
      return [
        ubudPlaceBySlug(_baturSlug)!,
        ubudPlaceBySlug('ubud-atv-quad-bike-adventure')!,
        ubudPlaceBySlug('ubud-ayung-river-rafting')!,
        ubudPlaceBySlug('ubud-campuhan-ridge-walk')!,
        ubudPlaceBySlug('ubud-sacred-monkey-forest')!,
        ubudPlaceBySlug('ubud-ivy-cafe')!,
      ];
    case TripLifestyle.food:
      return [
        ubudPlaceBySlug('ubud-hujan-locale')!,
        ubudPlaceBySlug('ubud-moksa')!,
        ubudPlaceBySlug('ubud-balinese-cooking-class')!,
        ubudPlaceBySlug('ubud-suka-ubud')!,
        ubudPlaceBySlug('ubud-watercress')!,
        ubudPlaceBySlug('ubud-murnis-warung')!,
      ];
    case TripLifestyle.relaxed:
      return [
        ubudPlaceBySlug('ubud-campuhan-ridge-walk')!,
        ubudPlaceBySlug('ubud-ivy-cafe')!,
        ubudPlaceBySlug('ubud-suka-ubud')!,
        ubudPlaceBySlug('ubud-moksa')!,
        ubudPlaceBySlug('ubud-sacred-monkey-forest')!,
      ];
  }
}

List<UbudDemoPlace> _eveningPool(TripLifestyle lifestyle) {
  switch (lifestyle) {
    case TripLifestyle.food:
      return [
        ubudPlaceBySlug('ubud-donna')!,
        ubudPlaceBySlug('ubud-hujan-locale')!,
      ];
    case TripLifestyle.relaxed:
      return [
        ubudPlaceBySlug('ubud-donna')!,
        ubudPlaceBySlug('ubud-moksa')!,
      ];
    case TripLifestyle.adventure:
      return [
        ubudPlaceBySlug('ubud-donna')!,
        ubudPlaceBySlug('ubud-ivy-cafe')!,
      ];
    case TripLifestyle.culture:
      return [
        ubudPlaceBySlug('ubud-donna')!,
        ubudPlaceBySlug('ubud-murnis-warung')!,
      ];
  }
}

/// Prefer Mount Batur as the first morning candidate for adventure trips.
List<UbudDemoPlace> _morningCandidates(
  TripLifestyle lifestyle,
  List<UbudDemoPlace> daytime,
) {
  if (lifestyle != TripLifestyle.adventure) {
    return daytime;
  }
  final batur = ubudPlaceBySlug(_baturSlug);
  if (batur == null) return daytime;
  final rest = daytime.where((p) => p.slug != _baturSlug);
  return [batur, ...rest];
}

/// Next unused catalog place, or null when the pool is exhausted (leave open).
UbudDemoPlace? _takeUnused(
  List<UbudDemoPlace> candidates,
  Set<String> used,
) {
  for (final place in candidates) {
    if (used.contains(place.slug)) continue;
    used.add(place.slug);
    return place;
  }
  return null;
}

/// Exposed for tests — every recommended place must exist in the demo catalog.
Set<String> previewPlaceSlugs(TripPreviewPlan plan) {
  final slugs = <String>{plan.staySuggestion.slug};
  for (final day in plan.days) {
    for (final stop in day.stops) {
      slugs.add(stop.place.slug);
    }
  }
  return slugs;
}

/// Day-stop slugs only (excludes stay suggestion).
List<String> previewDayStopSlugs(TripPreviewPlan plan) {
  final slugs = <String>[];
  for (final day in plan.days) {
    for (final stop in day.stops) {
      slugs.add(stop.place.slug);
    }
  }
  return slugs;
}
