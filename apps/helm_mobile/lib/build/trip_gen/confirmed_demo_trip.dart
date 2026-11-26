import 'trip_planner.dart';

/// A confirmed demo itinerary for the current signed-in app session.
class ConfirmedDemoTrip {
  ConfirmedDemoTrip({
    required this.label,
    required this.destinationName,
    required List<TripPreviewDay> days,
  }) : days = List.unmodifiable(days);

  final String label;
  final String destinationName;
  final List<TripPreviewDay> days;
}
