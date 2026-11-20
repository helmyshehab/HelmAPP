/// Parsed published place for the destination overview Places section.
class PlaceListItem {
  const PlaceListItem({
    required this.id,
    required this.slug,
    required this.nameEn,
    required this.category,
    this.shortDescriptionEn,
    this.shortDescriptionAr,
  });

  final String id;
  final String slug;
  final String nameEn;
  final String category;
  final String? shortDescriptionEn;
  final String? shortDescriptionAr;

  /// Prefer English short description; fall back to Arabic when English is absent.
  String? get availableShortDescription {
    final en = shortDescriptionEn?.trim();
    if (en != null && en.isNotEmpty) return en;
    final ar = shortDescriptionAr?.trim();
    if (ar != null && ar.isNotEmpty) return ar;
    return null;
  }

  /// Human-readable category label (underscores → spaces).
  String get categoryLabel => category.replaceAll('_', ' ');

  factory PlaceListItem.fromJson(Map<String, dynamic> json) {
    return PlaceListItem(
      id: json['id'] as String,
      slug: json['slug'] as String,
      nameEn: json['nameEn'] as String,
      category: json['category'] as String,
      shortDescriptionEn: json['shortDescriptionEn'] as String?,
      shortDescriptionAr: json['shortDescriptionAr'] as String?,
    );
  }
}

/// One page from `listCatalogPlaces` (`PlaceListResponse`).
class PlaceListPage {
  const PlaceListPage({
    required this.items,
    required this.total,
    required this.limit,
    required this.offset,
  });

  final List<PlaceListItem> items;
  final int total;
  final int limit;
  final int offset;

  bool get hasMore => offset + items.length < total;

  factory PlaceListPage.fromJson(Map<String, dynamic> json) {
    final raw = json['items'];
    final items = raw is List
        ? raw
            .whereType<Map>()
            .map((e) => PlaceListItem.fromJson(Map<String, dynamic>.from(e)))
            .toList(growable: false)
        : const <PlaceListItem>[];

    return PlaceListPage(
      items: items,
      total: (json['total'] as num?)?.toInt() ?? 0,
      limit: (json['limit'] as num?)?.toInt() ?? items.length,
      offset: (json['offset'] as num?)?.toInt() ?? 0,
    );
  }
}
