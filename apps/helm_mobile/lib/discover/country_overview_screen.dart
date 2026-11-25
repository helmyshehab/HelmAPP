import 'package:flutter/material.dart';

import 'destination_list_item.dart';

class CountryOverviewScreen extends StatelessWidget {
  const CountryOverviewScreen({
    super.key,
    required this.countryCode,
    required this.countryName,
    required this.destinations,
    required this.onDestinationSelected,
  });

  final String countryCode;
  final String countryName;
  final List<DestinationListItem> destinations;
  final void Function(BuildContext, DestinationListItem) onDestinationSelected;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(countryName)),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          if (countryCode == 'ID') ...[
            const Text(
              'Indonesia spans thousands of islands. In central Bali, Ubud '
              'is a base for exploring rice terraces, temples, and local arts.',
            ),
            const SizedBox(height: 24),
          ],
          Text('Cities', style: Theme.of(context).textTheme.titleLarge),
          for (final destination in destinations)
            ListTile(
              key: Key('discover-item-${destination.slug}'),
              title: Text(destination.nameEn),
              subtitle: destination.availableSummary == null
                  ? null
                  : Text(destination.availableSummary!),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => onDestinationSelected(context, destination),
            ),
        ],
      ),
    );
  }
}
