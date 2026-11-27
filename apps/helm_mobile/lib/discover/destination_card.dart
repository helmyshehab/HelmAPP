import 'package:flutter/material.dart';

import '../geo/country_label.dart';
import '../widgets/helm_editorial_row.dart';
import 'destination_list_item.dart';

/// Uniform Explore destination row. The whole surface opens the overview.
class DestinationCard extends StatelessWidget {
  const DestinationCard({
    super.key,
    required this.item,
    required this.onTap,
    this.countryNames = const {},
    this.imageUrl,
    this.imageAlt,
    this.actionLabel,
  });

  final DestinationListItem item;
  final VoidCallback onTap;

  /// Optional cached country names from `listGeoCountries` (ISO → nameEn).
  final Map<String, String> countryNames;

  /// Optional override. Defaults to [DestinationListItem.coverImageUrl].
  final String? imageUrl;

  /// Optional override. Defaults to locale-aware cover alt on [item].
  final String? imageAlt;

  /// Optional override. Defaults to locale-aware Explore label.
  final String? actionLabel;

  @override
  Widget build(BuildContext context) {
    final languageCode = Localizations.localeOf(context).languageCode;
    return HelmEditorialRow(
      rowKey: Key('discover-item-${item.slug}'),
      meta: helmCountryLabel(item.countryCode, namesByCode: countryNames),
      title: item.nameForLanguage(languageCode),
      subtitle: item.alternateNameForLanguage(languageCode),
      body: item.availableSummary,
      imageUrl: imageUrl ?? item.coverImageUrl,
      imageAlt: imageAlt ?? item.coverAltForLanguage(languageCode),
      actionLabel: actionLabel,
      onTap: onTap,
    );
  }
}
