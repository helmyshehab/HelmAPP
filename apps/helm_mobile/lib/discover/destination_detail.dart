/// Parsed published destination for the Discover overview screen.
class DestinationDetail {
  const DestinationDetail({
    required this.id,
    required this.slug,
    required this.nameEn,
    this.nameAr,
    this.summaryEn,
    this.summaryAr,
    this.descriptionEn,
    this.descriptionAr,
    this.countryCode,
    this.tags = const [],
  });

  final String id;
  final String slug;
  final String nameEn;
  final String? nameAr;
  final String? summaryEn;
  final String? summaryAr;
  final String? descriptionEn;
  final String? descriptionAr;
  final String? countryCode;
  final List<String> tags;

  /// Prefer English summary; fall back to Arabic when English is absent.
  String? get availableSummary {
    final en = summaryEn?.trim();
    if (en != null && en.isNotEmpty) return en;
    final ar = summaryAr?.trim();
    if (ar != null && ar.isNotEmpty) return ar;
    return null;
  }

  /// Prefer English description; fall back to Arabic when English is absent.
  String? get availableDescription {
    final en = descriptionEn?.trim();
    if (en != null && en.isNotEmpty) return en;
    final ar = descriptionAr?.trim();
    if (ar != null && ar.isNotEmpty) return ar;
    return null;
  }

  /// Overview body: summary and description when present and distinct.
  ({String? summary, String? description}) get overviewCopy {
    final summary = availableSummary;
    final description = availableDescription;
    if (description != null && summary != null && description == summary) {
      return (summary: summary, description: null);
    }
    return (summary: summary, description: description);
  }

  factory DestinationDetail.fromJson(Map<String, dynamic> json) {
    final rawTags = json['tags'];
    final tags = rawTags is List
        ? rawTags.whereType<String>().toList(growable: false)
        : const <String>[];

    return DestinationDetail(
      id: json['id'] as String,
      slug: json['slug'] as String,
      nameEn: json['nameEn'] as String,
      nameAr: json['nameAr'] as String?,
      summaryEn: json['summaryEn'] as String?,
      summaryAr: json['summaryAr'] as String?,
      descriptionEn: json['descriptionEn'] as String?,
      descriptionAr: json['descriptionAr'] as String?,
      countryCode: json['countryCode'] as String?,
      tags: tags,
    );
  }
}

/// True when [error] looks like a generated-client 404 from `getDestination`.
bool isDestinationNotFoundError(Object error) {
  return error.toString().contains(' failed: 404');
}
