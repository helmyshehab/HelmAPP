import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:http/http.dart' as http;

import '../auth/traveler_session.dart';
import '../build/trip_gen/trip_demo_pricing.dart';
import '../build/trip_gen/trip_preview_draft.dart';
import '../config/api_config.dart';

class TripsTab extends StatefulWidget {
  const TripsTab(
      {super.key, required this.auth, this.apiClient, this.onOpenTrip});

  final TravelerAuth auth;
  final HelmApiClient? apiClient;
  final ValueChanged<TripPreviewDraftSnapshot>? onOpenTrip;

  @override
  State<TripsTab> createState() => _TripsTabState();
}

class _TripsTabState extends State<TripsTab> {
  http.Client? _ownedClient;
  late final HelmApiClient _api;
  List<DemoTripBooking> _bookings = const [];
  List<TripRequest> _requests = const [];
  bool _loading = false;
  bool _failed = false;
  late int _generation;

  @override
  void initState() {
    super.initState();
    _generation = widget.auth.authGeneration;
    _api = widget.apiClient ??
        HelmApiClient(
          baseUrl: ApiConfig.apiBaseUrl,
          httpClient: _ownedClient = http.Client(),
        );
    widget.auth.sessionListenable.addListener(_onSessionChanged);
    _load();
  }

  void _onSessionChanged() {
    if (_generation == widget.auth.authGeneration) return;
    _generation = widget.auth.authGeneration;
    _load();
  }

  Future<void> _load() async {
    final session = widget.auth.session;
    final generation = _generation;
    setState(() {
      _bookings = const [];
      _requests = const [];
      _loading = session != null;
      _failed = false;
    });
    if (session == null) return;
    try {
      final bookings =
          await _api.listDemoTripBookings(accessToken: session.accessToken);
      final requests =
          await _api.listTripRequests(accessToken: session.accessToken);
      if (!mounted || generation != _generation) return;
      setState(() {
        _bookings = bookings;
        _requests = requests;
        _loading = false;
      });
    } catch (_) {
      if (!mounted || generation != _generation) return;
      setState(() {
        _failed = true;
        _loading = false;
      });
    }
  }

  @override
  void dispose() {
    widget.auth.sessionListenable.removeListener(_onSessionChanged);
    _ownedClient?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.auth.session == null) {
      return const Center(child: Text('Sign in from Build to see your trips.'));
    }
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_failed) {
      return Center(
          child: OutlinedButton(
              onPressed: _load, child: const Text('Retry loading trips')));
    }
    if (_bookings.isEmpty && _requests.isEmpty) {
      return const Center(child: Text('No trips or requests yet'));
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
              onPressed: _load,
              icon: const Icon(Icons.refresh),
              label: const Text('Refresh trips')),
        ),
        for (final request in _requests) _requestCard(request),
        for (final booking in _bookings) _bookingCard(booking),
      ],
    );
  }

  Widget _requestCard(TripRequest request) {
    final snapshot = tryParseTripPreviewDraft(request.constraints);
    return Card(
      key: Key('trips-request-${request.id}'),
      child: ListTile(
        leading: const Icon(Icons.assignment_outlined),
        title: Text(request.title ?? 'Trip request'),
        subtitle: Text(
          '${_requestStatusLabel(request.status)} · ${request.destinationSlug}\n'
          'Submitted itinerary is fixed; edit continues in Build.',
        ),
        trailing: snapshot != null ? const Icon(Icons.chevron_right) : null,
        onTap: snapshot == null
            ? null
            : () => _openSubmittedItinerary(context, request, snapshot),
      ),
    );
  }

  Future<void> _openSubmittedItinerary(
    BuildContext context,
    TripRequest request,
    TripPreviewDraftSnapshot snapshot,
  ) async {
    final plan = planFromTripPreviewDraft(snapshot);
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          appBar: AppBar(title: Text(request.title ?? 'Submitted itinerary')),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                _requestStatusLabel(request.status),
                key: const Key('trips-request-status'),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text('Destination: ${request.destinationSlug}'),
              Text('Hotel: ${snapshot.hotelSlug}'),
              Text(
                'Included: ${snapshot.includedActivitySlugs.isEmpty ? '—' : snapshot.includedActivitySlugs.join(', ')}',
              ),
              const SizedBox(height: 16),
              for (final day in plan.days) ...[
                Text(day.title, style: Theme.of(context).textTheme.titleSmall),
                if (day.stops.isEmpty) const Text('Open time'),
                for (final stop in day.stops) Text(stop.place.nameEn),
                const SizedBox(height: 12),
              ],
              const Text(
                'This is the submitted copy. Keep editing your private draft in Build.',
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _bookingCard(DemoTripBooking booking) {
    final confirmed = booking.status == 'confirmed';
    final snapshot =
        confirmed ? tryParseUbudTripPreviewDraft(booking.constraints) : null;
    final count =
        booking.services.where((service) => service.confirmedAt != null).length;
    return Card(
      key: Key('trips-demo-booking-${booking.id}'),
      child: ListTile(
        key: confirmed ? const Key('trips-confirmed-demo') : null,
        leading: const Icon(Icons.map_outlined),
        title: Text(booking.title ?? 'Ubud demo trip'),
        subtitle: Text(
          '${confirmed ? 'Demo bookings confirmed' : 'Awaiting confirmation · $count of ${booking.services.length} services confirmed'}\n'
          '${formatDemoEgp(booking.quote.totalEgp)}',
        ),
        trailing: snapshot != null ? const Icon(Icons.chevron_right) : null,
        onTap:
            snapshot == null ? null : () => widget.onOpenTrip?.call(snapshot),
      ),
    );
  }
}

String _requestStatusLabel(String status) {
  switch (status) {
    case 'submitted':
      return 'Submitted';
    case 'under_review':
      return 'Under review';
    case 'declined':
      return 'Declined';
    default:
      return status;
  }
}
