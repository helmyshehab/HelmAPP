import 'package:flutter/material.dart';

import '../build/trip_gen/confirmed_demo_trip.dart';

class TripsTab extends StatelessWidget {
  const TripsTab({super.key, this.trip, this.onOpenTrip});

  final ConfirmedDemoTrip? trip;
  final VoidCallback? onOpenTrip;

  @override
  Widget build(BuildContext context) {
    final confirmed = trip;
    if (confirmed == null) {
      return const Center(child: Text('No confirmed trips yet'));
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: ListTile(
            key: const Key('trips-confirmed-demo'),
            leading: const Icon(Icons.map_outlined),
            title: Text(confirmed.label),
            subtitle: const Text('Demo bookings confirmed'),
            trailing: const Icon(Icons.chevron_right),
            onTap: onOpenTrip,
          ),
        ),
      ],
    );
  }
}
