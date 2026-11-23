import 'package:helm_api_client/helm_api_client.dart';

import 'destination_list_item.dart';

/// Max page size allowed by public `listDestinations`.
const int globePageSize = 100;

/// Keep destinations that can be plotted on the globe.
List<DestinationListItem> withPlottableCoordinates(
  Iterable<DestinationListItem> items,
) {
  return items
      .where((item) => item.hasPlottableCoordinates)
      .toList(growable: false);
}

/// Load every published destination for the globe, independent of Discover list pages.
Future<List<DestinationListItem>> fetchAllGlobeDestinations(
  HelmApiClient client,
) async {
  final collected = <DestinationListItem>[];
  var offset = 0;
  var total = 1 << 30;

  while (offset < total) {
    final response = await client.listDestinations(
      limit: globePageSize,
      offset: offset,
    );
    final page = DestinationListItem.parseItems(response);
    final rawTotal = response['total'];
    if (rawTotal is int) {
      total = rawTotal;
    } else if (rawTotal is num) {
      total = rawTotal.toInt();
    } else {
      total = collected.length + page.length;
    }
    collected.addAll(page);
    offset += page.length;
    if (page.isEmpty) break;
  }

  final seen = <String>{};
  final unique = <DestinationListItem>[];
  for (final item in collected) {
    if (!seen.add(item.id)) continue;
    unique.add(item);
  }
  return withPlottableCoordinates(unique);
}
