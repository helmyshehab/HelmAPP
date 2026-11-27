import 'package:flutter/material.dart';

import 'trip_planner.dart';

class TripDemoModeScreen extends StatefulWidget {
  const TripDemoModeScreen({
    super.key,
    required this.destinationName,
    required this.days,
    this.onBack,
    this.fromBuildPreview = false,
  });

  final String destinationName;
  final List<TripPreviewDay> days;
  final VoidCallback? onBack;

  /// When true, copy describes a Build itinerary preview and marks Trip alerts /
  /// Travel chat as planned. Checkout and Trips keep the demo presentation.
  final bool fromBuildPreview;

  @override
  State<TripDemoModeScreen> createState() => _TripDemoModeScreenState();
}

class _TripDemoModeScreenState extends State<TripDemoModeScreen> {
  int _dayIndex = 0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final day = widget.days[_dayIndex];
    final dayCount = widget.days.length;
    final fromBuild = widget.fromBuildPreview;
    return PopScope<void>(
      canPop: widget.onBack == null,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) widget.onBack?.call();
      },
      child: Scaffold(
        appBar: AppBar(
          leading: widget.onBack == null
              ? null
              : BackButton(onPressed: widget.onBack),
          title: Text(fromBuild ? 'Trip Mode preview' : 'Demo Trip Mode'),
        ),
        body: ListView(
          key: ValueKey(day.dayNumber),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          children: [
            Card(
              margin: EdgeInsets.zero,
              color: theme.colorScheme.primaryContainer,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.destinationName,
                        style: theme.textTheme.headlineMedium),
                    Text('${day.title} of $dayCount',
                        style: theme.textTheme.titleMedium),
                    const SizedBox(height: 8),
                    Text(
                      fromBuild
                          ? 'Preview of your current Build itinerary. Nothing '
                              'is booked yet.'
                          : 'Sample itinerary from demo checkout',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton(
                  onPressed:
                      _dayIndex == 0 ? null : () => setState(() => _dayIndex--),
                  child: const Text('Previous day'),
                ),
                TextButton(
                  onPressed: _dayIndex == dayCount - 1
                      ? null
                      : () => setState(() => _dayIndex++),
                  child: const Text('Next day'),
                ),
              ],
            ),
            const Divider(),
            if (day.stops.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text('Open time to explore at your pace.'),
              ),
            for (final stop in day.stops)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.place_outlined),
                title: Text(stop.place.nameEn),
                subtitle: Text([
                  if (stop.roleLabel != TripPreviewStop.unscheduledRole)
                    stop.roleLabel,
                  if (stop.place.area case final area?) area,
                  stop.place.shortDescriptionEn,
                ].join(' · ')),
              ),
            if (fromBuild) ...[
              const SizedBox(height: 16),
              Text('Also in Trip Mode', style: theme.textTheme.titleSmall),
              const SizedBox(height: 4),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.notifications_outlined),
                title: const Text('Trip alerts'),
                subtitle: Text(
                  'Planned feature',
                  style: theme.textTheme.bodySmall,
                ),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.chat_bubble_outline),
                title: const Text('Travel chat'),
                subtitle: Text(
                  'Planned feature',
                  style: theme.textTheme.bodySmall,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
