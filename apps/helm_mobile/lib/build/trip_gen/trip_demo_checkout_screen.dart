import 'package:flutter/material.dart';

import 'trip_demo_mode_screen.dart';
import 'trip_demo_pricing.dart';
import 'trip_planner.dart';

class TripDemoCheckoutScreen extends StatefulWidget {
  const TripDemoCheckoutScreen({
    super.key,
    required this.tripLabel,
    required this.estimate,
    required this.destinationName,
    required this.days,
    this.onBookingsConfirmed,
  });

  final String tripLabel;
  final TripDemoEstimate estimate;
  final String destinationName;
  final List<TripPreviewDay> days;
  final VoidCallback? onBookingsConfirmed;

  @override
  State<TripDemoCheckoutScreen> createState() => _TripDemoCheckoutScreenState();
}

class _TripDemoCheckoutScreenState extends State<TripDemoCheckoutScreen> {
  bool _completed = false;
  bool _showTripMode = false;
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
    final estimate = widget.estimate;
    return Scaffold(
      appBar: AppBar(title: const Text('Demo checkout')),
      body: _completed
          ? _buildBookingProgress(context)
          : ListView(
              padding: const EdgeInsets.all(24),
              children: [
                Text(widget.tripLabel, style: textTheme.titleLarge),
                const SizedBox(height: 16),
                Text('Estimated group total', style: textTheme.labelLarge),
                Text(
                  formatDemoEgp(estimate.totalEgp),
                  key: const Key('trip-demo-checkout-total'),
                  style: textTheme.headlineSmall,
                ),
                const SizedBox(height: 12),
                Text('Flights · ${formatDemoEgp(estimate.flightTotalEgp)}'),
                Text('Stay · ${formatDemoEgp(estimate.lodgingTotalEgp)}'),
                Text(
                    'Activities · ${formatDemoEgp(estimate.activitiesTotalEgp)}'),
                const SizedBox(height: 16),
                const Text(
                  'You can try this checkout without payment details. This simulation creates no charge or booking.',
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () => setState(() => _completed = true),
                  child: const Text('Simulate payment'),
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
      if (widget.estimate.activitiesTotalEgp > 0)
        _DemoBookingService.activities,
    ];
    final tripReady = _confirmedServices.length == services.length;
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text('Demo payment complete', style: textTheme.headlineSmall),
        const SizedBox(height: 8),
        Text(widget.tripLabel),
        Text('Simulated total · ${formatDemoEgp(widget.estimate.totalEgp)}'),
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
