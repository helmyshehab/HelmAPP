import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';

import 'trip_demo_mode_screen.dart';
import 'trip_demo_pricing.dart';
import 'trip_planner.dart';

class TripDemoCheckoutScreen extends StatefulWidget {
  const TripDemoCheckoutScreen({
    super.key,
    required this.tripLabel,
    required this.quote,
    required this.destinationName,
    required this.days,
    required this.createBooking,
    this.confirmDemoService,
  });

  final String tripLabel;
  final TripDraftQuote quote;
  final String destinationName;
  final List<TripPreviewDay> days;
  final Future<DemoTripBooking?> Function() createBooking;
  final Future<DemoTripBooking> Function(String id, String kind)?
      confirmDemoService;

  @override
  State<TripDemoCheckoutScreen> createState() => _TripDemoCheckoutScreenState();
}

class _TripDemoCheckoutScreenState extends State<TripDemoCheckoutScreen> {
  DemoTripBooking? _booking;
  bool _showTripMode = false;
  bool _checkingQuote = false;
  String? _quoteError;

  Future<void> _simulatePayment() async {
    if (_checkingQuote || _booking != null) return;
    setState(() {
      _checkingQuote = true;
      _quoteError = null;
    });
    DemoTripBooking? booking;
    try {
      booking = await widget.createBooking();
    } catch (_) {
      // The traveler can retry verification or return to request a new quote.
    }
    if (!mounted) return;
    setState(() {
      _checkingQuote = false;
      _booking = booking;
      if (booking == null) {
        _quoteError =
            'Could not save this demo booking. Try again or go back for a new quote.';
      }
    });
  }

  bool _confirming = false;
  String? _confirmationError;

  Future<void> _confirm(String id, String kind) async {
    final confirm = widget.confirmDemoService;
    if (confirm == null || _confirming) return;
    setState(() {
      _confirming = true;
      _confirmationError = null;
    });
    try {
      final booking = await confirm(id, kind);
      if (mounted) setState(() => _booking = booking);
    } catch (_) {
      if (mounted) {
        setState(() =>
            _confirmationError = 'Could not confirm this service. Try again.');
      }
    } finally {
      if (mounted) setState(() => _confirming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_showTripMode) {
      return TripDemoModeScreen(
        destinationName: widget.destinationName,
        days: widget.days,
        onBack: () => setState(() => _showTripMode = false),
      );
    }
    final textTheme = Theme.of(context).textTheme;
    final quote = widget.quote;
    final booking = _booking;
    return Scaffold(
      appBar: AppBar(title: const Text('Demo checkout')),
      body: booking != null
          ? _buildBookingProgress(context, booking)
          : ListView(
              padding: const EdgeInsets.all(24),
              children: [
                Text(widget.tripLabel, style: textTheme.titleLarge),
                const SizedBox(height: 16),
                Text('Quoted group total', style: textTheme.labelLarge),
                Text(
                  formatDemoEgp(quote.totalEgp),
                  key: const Key('trip-demo-checkout-total'),
                  style: textTheme.headlineSmall,
                ),
                const SizedBox(height: 12),
                Text('Flights · ${formatDemoEgp(quote.flightTotalEgp)}'),
                Text('Stay · ${formatDemoEgp(quote.lodgingTotalEgp)}'),
                Text('Activities · ${formatDemoEgp(quote.activitiesTotalEgp)}'),
                const SizedBox(height: 16),
                const Text(
                  'This saves a demo booking. No payment details or charge are involved.',
                ),
                const SizedBox(height: 24),
                if (_quoteError != null)
                  Text(_quoteError!,
                      key: const Key('trip-checkout-quote-error')),
                FilledButton(
                  onPressed: _checkingQuote ? null : _simulatePayment,
                  child: Text(
                      _checkingQuote ? 'Saving booking…' : 'Simulate payment'),
                ),
              ],
            ),
    );
  }

  Widget _buildBookingProgress(BuildContext context, DemoTripBooking booking) {
    final textTheme = Theme.of(context).textTheme;
    final services = booking.services;
    final confirmedCount =
        services.where((service) => service.confirmedAt != null).length;
    final tripReady = booking.status == 'confirmed';
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text('Demo payment complete', style: textTheme.headlineSmall),
        const SizedBox(height: 8),
        Text(widget.tripLabel),
        Text('Simulated total · ${formatDemoEgp(booking.quote.totalEgp)}'),
        const SizedBox(height: 20),
        Text('Booking progress', style: textTheme.titleLarge),
        Text('$confirmedCount of ${services.length} services confirmed'),
        const SizedBox(height: 8),
        Text(widget.confirmDemoService == null
            ? 'Trip Mode opens in Trips after staff have confirmed every service.'
            : 'Simulate staff confirming each service in this demo.'),
        const SizedBox(height: 8),
        for (final service in services)
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(_serviceLabel(service.kind)),
            subtitle: Text(service.confirmedAt != null
                ? 'Confirmed'
                : 'Awaiting confirmation'),
            trailing: widget.confirmDemoService == null
                ? null
                : TextButton(
                    key: Key('trip-demo-confirm-${service.kind}'),
                    onPressed: _confirming || service.confirmedAt != null
                        ? null
                        : () => _confirm(booking.id, service.kind),
                    child: Text(
                        'Confirm ${_serviceLabel(service.kind).toLowerCase()}'),
                  ),
          ),
        if (_confirmationError != null) Text(_confirmationError!),
        const SizedBox(height: 16),
        FilledButton(
          onPressed:
              tripReady ? () => setState(() => _showTripMode = true) : null,
          child: const Text('Preview Trip Mode'),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Back to trip'),
        ),
      ],
    );
  }
}

String _serviceLabel(String kind) => switch (kind) {
      'flights' => 'Flights',
      'stay' => 'Stay',
      'activities' => 'Activities',
      _ => kind,
    };
