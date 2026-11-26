import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:http/http.dart' as http;

import '../auth/traveler_session.dart';
import '../build/trip_gen/confirmed_demo_trip.dart';
import '../build/trip_gen/trip_demo_pricing.dart';
import '../config/api_config.dart';

class TripsTab extends StatefulWidget {
  const TripsTab(
      {super.key,
      required this.auth,
      this.apiClient,
      this.trip,
      this.onOpenTrip});

  final TravelerAuth auth;
  final HelmApiClient? apiClient;
  final ConfirmedDemoTrip? trip;
  final VoidCallback? onOpenTrip;

  @override
  State<TripsTab> createState() => _TripsTabState();
}

class _TripsTabState extends State<TripsTab> {
  http.Client? _ownedClient;
  late final HelmApiClient _api;
  List<DemoTripBooking> _bookings = const [];
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
      _loading = session != null;
      _failed = false;
    });
    if (session == null) return;
    try {
      final bookings =
          await _api.listDemoTripBookings(accessToken: session.accessToken);
      if (!mounted || generation != _generation) return;
      setState(() {
        _bookings = bookings;
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
    if (_bookings.isEmpty) {
      return const Center(child: Text('No confirmed trips yet'));
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        for (final booking in _bookings) _bookingCard(booking),
      ],
    );
  }

  Widget _bookingCard(DemoTripBooking booking) {
    final confirmed = widget.trip?.bookingId == booking.id;
    return Card(
      key: Key('trips-demo-booking-${booking.id}'),
      child: ListTile(
        key: confirmed ? const Key('trips-confirmed-demo') : null,
        leading: const Icon(Icons.map_outlined),
        title: Text(booking.title ?? 'Ubud demo trip'),
        subtitle: Text(
          '${confirmed ? 'Demo bookings confirmed' : 'Demo booking · Awaiting confirmation'}\n'
          '${formatDemoEgp(booking.quote.totalEgp)}',
        ),
        trailing: confirmed ? const Icon(Icons.chevron_right) : null,
        onTap: confirmed ? widget.onOpenTrip : null,
      ),
    );
  }
}
