import 'trip_gen/trip_answers.dart';
import 'trip_gen/trip_preview_draft.dart';

/// Destination or package a guest selected before Profile sign-in.
class PendingBuildHandoff {
  const PendingBuildHandoff.destination(this.destination)
      : packageSnapshot = null;

  const PendingBuildHandoff.package(this.packageSnapshot) : destination = null;

  final TripDestinationChoice? destination;
  final TripPreviewDraftSnapshot? packageSnapshot;
}
