/// Parsed published destination for the Discover list.
class DestinationListItem {
  const DestinationListItem({
    required this.id,
    required this.slug,
    required this.nameEn,
    this.nameAr,
    this.summaryEn,
    this.summaryAr,
    this.countryCode,
    this.isFeatured = false,
    this.tags = const [],
  });

  final String id;
  final String slug;
  final String nameEn;
  final String? nameAr;
  final String? summaryEn;
  final String? summaryAr;
  final String? countryCode;
  final bool isFeatured;
  final List<String> tags;

  /// Prefer English summary; fall back to Arabic when English is absent.
  String? get availableSummary {
    final en = summaryEn?.trim();
    if (en != null && en.isNotEmpty) return en;
    final ar = summaryAr?.trim();
    if (ar != null && ar.isNotEmpty) return ar;
    return null;
  }

  String? get displayNameAr {
    final ar = nameAr?.trim();
    if (ar == null || ar.isEmpty) return null;
    return ar;
  }

  String? get displayCountryCode {
    final code = countryCode?.trim();
    if (code == null || code.isEmpty) return null;
    return code;
  }

  factory DestinationListItem.fromJson(Map<String, dynamic> json) {
    return DestinationListItem(
      id: json['id'] as String,
      slug: json['slug'] as String,
      nameEn: json['nameEn'] as String,
      nameAr: json['nameAr'] as String?,
      summaryEn: json['summaryEn'] as String?,
      summaryAr: json['summaryAr'] as String?,
      countryCode: json['countryCode'] as String?,
      isFeatured: json['isFeatured'] == true,
      tags: _parseTags(json['tags']),
    );
  }

  static List<DestinationListItem> parseItems(Map<String, dynamic> response) {
    final raw = response['items'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => DestinationListItem.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
}

List<String> _parseTags(Object? raw) {
  if (raw is! List) return const [];
  return raw
      .whereType<String>()
      .map((tag) => tag.trim())
      .where((tag) => tag.isNotEmpty)
      .toList(growable: false);
}
