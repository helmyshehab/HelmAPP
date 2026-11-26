import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';

import 'trip_demo_pricing.dart';
import 'trip_demo_mode_screen.dart';
import 'trip_planner.dart';

class TripDemoCheckoutScreen extends StatefulWidget {
  const TripDemoCheckoutScreen({
    super.key,
    required this.tripLabel,
    required this.quote,
    required this.destinationName,
    required this.days,
    required this.validateQuote,
  });

  final String tripLabel;
  final TripDraftQuote quote;
  final String destinationName;
  final List<TripPreviewDay> days;
  final Future<bool> Function() validateQuote;

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
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          if (_completed) ...[
            Text('Demo payment complete', style: textTheme.headlineSmall),
            const SizedBox(height: 8),
          ],
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
          Text(
            _completed
                ? 'This simulation created no charge or booking.'
                : 'You can try this checkout without payment details. This simulation creates no charge or booking.',
          ),
          const SizedBox(height: 24),
          if (_quoteError != null)
            Text(_quoteError!, key: const Key('trip-checkout-quote-error')),
          if (_completed)
            FilledButton(
              onPressed: () => setState(() => _showTripMode = true),
              child: const Text('Preview Trip Mode'),
            ),
          FilledButton(
            onPressed: _completed
                ? () => Navigator.of(context).pop()
                : _checkingQuote
                    ? null
                    : _simulatePayment,
            child: Text(_completed
                ? 'Back to trip'
                : _checkingQuote
                    ? 'Checking quote…'
                    : 'Simulate payment'),
          ),
        ],
      ),
    );
  }
}
