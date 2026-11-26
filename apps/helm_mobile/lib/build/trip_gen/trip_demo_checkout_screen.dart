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
    required this.validateQuote,
    this.onBookingsConfirmed,
  });

  final String tripLabel;
  final TripDraftQuote quote;
  final String destinationName;
  final List<TripPreviewDay> days;
  final Future<bool> Function() validateQuote;
  final VoidCallback? onBookingsConfirmed;

  @override
  State<TripDemoCheckoutScreen> createState() => _TripDemoCheckoutScreenState();
}

class _TripDemoCheckoutScreenState extends State<TripDemoCheckoutScreen> {
  bool _completed = false;
  bool _showTripMode = false;
  bool _checkingQuote = false;
  String? _quoteError;

  Future<void> _simulatePayment() async {
    if (_checkingQuote || _completed) return;
    setState(() {
      _checkingQuote = true;
      _quoteError = null;
    });
    var current = false;
    try {
      current = await widget.validateQuote();
    } catch (_) {
      // The traveler can retry verification or return to request a new quote.
    }
    if (!mounted) return;
    setState(() {
      _checkingQuote = false;
      _completed = current;
      if (!current) {
        _quoteError =
            'Could not verify this quote. Try again or go back for a new quote.';
      }
    });
  }

  final _confirmedServices = <_DemoBookingService>{};

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
    return Scaffold(
      appBar: AppBar(title: const Text('Demo checkout')),
      body: _completed
          ? _buildBookingProgress(context)
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
                  'You can try this checkout without payment details. This simulation creates no charge or booking.',
                ),
                const SizedBox(height: 24),
                if (_quoteError != null)
                  Text(_quoteError!,
                      key: const Key('trip-checkout-quote-error')),
                FilledButton(
                  onPressed: _checkingQuote ? null : _simulatePayment,
                  child: Text(
                      _checkingQuote ? 'Checking quote…' : 'Simulate payment'),
                ),
              ],
            ),
    );
  }

  Widget _buildBookingProgress(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final services = [
      _DemoBookingService.flights,
      _DemoBookingService.stay,
      if (widget.quote.activitiesTotalEgp > 0) _DemoBookingService.activities,
    ];
    final tripReady = _confirmedServices.length == services.length;
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text('Demo payment complete', style: textTheme.headlineSmall),
        const SizedBox(height: 8),
        Text(widget.tripLabel),
        Text('Simulated total · ${formatDemoEgp(widget.quote.totalEgp)}'),
        const SizedBox(height: 20),
        Text('Booking progress', style: textTheme.titleLarge),
        Text(
            '${_confirmedServices.length} of ${services.length} services confirmed'),
        const SizedBox(height: 8),
        const Text(
            'Simulate staff confirming each service. No actual bookings are made.'),
        const SizedBox(height: 8),
        for (final service in services)
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(service.label),
            subtitle: Text(_confirmedServices.contains(service)
                ? 'Confirmed'
                : 'Awaiting confirmation'),
            trailing: TextButton(
              key: Key('trip-demo-confirm-${service.name}'),
              onPressed: _confirmedServices.contains(service)
                  ? null
                  : () {
                      if (_confirmedServices.contains(service)) return;
                      setState(() => _confirmedServices.add(service));
                      if (_confirmedServices.length == services.length) {
                        widget.onBookingsConfirmed?.call();
                      }
                    },
              child: Text('Confirm ${service.label.toLowerCase()}'),
            ),
          ),
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

enum _DemoBookingService {
  flights('Flights'),
  stay('Stay'),
  activities('Activities');

  const _DemoBookingService(this.label);

  final String label;
}
