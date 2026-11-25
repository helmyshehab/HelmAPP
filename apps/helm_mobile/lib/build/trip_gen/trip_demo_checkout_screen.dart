import 'package:flutter/material.dart';

import 'trip_demo_pricing.dart';
import 'trip_demo_mode_screen.dart';
import 'trip_planner.dart';

class TripDemoCheckoutScreen extends StatefulWidget {
  const TripDemoCheckoutScreen({
    super.key,
    required this.tripLabel,
    required this.estimate,
    required this.destinationName,
    required this.days,
  });

  final String tripLabel;
  final TripDemoEstimate estimate;
  final String destinationName;
  final List<TripPreviewDay> days;

  @override
  State<TripDemoCheckoutScreen> createState() => _TripDemoCheckoutScreenState();
}

class _TripDemoCheckoutScreenState extends State<TripDemoCheckoutScreen> {
  bool _completed = false;
  bool _showTripMode = false;

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
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          if (_completed) ...[
            Text('Demo payment complete', style: textTheme.headlineSmall),
            const SizedBox(height: 8),
          ],
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
          Text('Activities · ${formatDemoEgp(estimate.activitiesTotalEgp)}'),
          const SizedBox(height: 16),
          Text(
            _completed
                ? 'This simulation created no charge or booking.'
                : 'You can try this checkout without payment details. This simulation creates no charge or booking.',
          ),
          const SizedBox(height: 24),
          if (_completed)
            FilledButton(
              onPressed: () => setState(() => _showTripMode = true),
              child: const Text('Preview Trip Mode'),
            ),
          FilledButton(
            onPressed: _completed
                ? () => Navigator.of(context).pop()
                : () => setState(() => _completed = true),
            child: Text(_completed ? 'Back to trip' : 'Simulate payment'),
          ),
        ],
      ),
    );
  }
}
