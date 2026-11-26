/// Parsed published destination for the Discover list and globe.
class DestinationListItem {
  const DestinationListItem({
    required this.id,
    required this.slug,
    required this.nameEn,
    this.nameAr,
    this.summaryEn,
    this.summaryAr,
    this.countryCode,
    this.latitude,
    this.longitude,
    this.isFeatured = false,
    this.tags = const [],
    this.coverImageUrl,
    this.coverAltEn,
    this.coverAltAr,
  });

  final String id;
  final String slug;
  final String nameEn;
  final String? nameAr;
  final String? summaryEn;
  final String? summaryAr;
  final String? countryCode;
  final double? latitude;
  final double? longitude;
  final bool isFeatured;
  final List<String> tags;

  /// Server-resolved public cover URL from `cover.url` (optional).
  final String? coverImageUrl;

  /// Optional English cover alt from `cover.altTextEn`.
  final String? coverAltEn;

  /// Optional Arabic cover alt from `cover.altTextAr`.
  final String? coverAltAr;

  /// True when both coordinates are finite and within geographic bounds.
  bool get hasPlottableCoordinates {
    final lat = latitude;
    final lon = longitude;
    if (lat == null || lon == null) return false;
    if (!lat.isFinite || !lon.isFinite) return false;
    if (lat < -90 || lat > 90) return false;
    if (lon < -180 || lon > 180) return false;
    return true;
  }

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

  /// Prefer English cover alt; fall back to Arabic.
  String? get availableCoverAlt {
    final en = coverAltEn?.trim();
    if (en != null && en.isNotEmpty) return en;
    final ar = coverAltAr?.trim();
    if (ar != null && ar.isNotEmpty) return ar;
    return null;
  }

  /// Language-aware cover description for accessibility (`ar` prefers Arabic).
  String? coverAltForLanguage(String languageCode) {
    if (languageCode.toLowerCase() == 'ar') {
      final ar = coverAltAr?.trim();
      if (ar != null && ar.isNotEmpty) return ar;
    }
    return availableCoverAlt;
  }

  factory DestinationListItem.fromJson(Map<String, dynamic> json) {
    final cover = _parseCover(json['cover']);
    return DestinationListItem(
      id: json['id'] as String,
      slug: json['slug'] as String,
      nameEn: json['nameEn'] as String,
      nameAr: json['nameAr'] as String?,
      summaryEn: json['summaryEn'] as String?,
      summaryAr: json['summaryAr'] as String?,
      countryCode: json['countryCode'] as String?,
      latitude: _parseCoordinate(json['latitude']),
      longitude: _parseCoordinate(json['longitude']),
      isFeatured: json['isFeatured'] == true,
      tags: _parseTags(json['tags']),
      coverImageUrl: cover.url,
      coverAltEn: cover.altEn,
      coverAltAr: cover.altAr,
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

class _ParsedCover {
  const _ParsedCover({this.url, this.altEn, this.altAr});
  final String? url;
  final String? altEn;
  final String? altAr;
}

_ParsedCover _parseCover(Object? raw) {
  if (raw is! Map) return const _ParsedCover();
  final map = Map<String, dynamic>.from(raw);
  return _ParsedCover(
    url: _optionalNonEmptyString(map['url']),
    altEn: _optionalNonEmptyString(map['altTextEn']),
    altAr: _optionalNonEmptyString(map['altTextAr']),
  );
}

String? _optionalNonEmptyString(Object? raw) {
  if (raw is! String) return null;
  final trimmed = raw.trim();
  return trimmed.isEmpty ? null : trimmed;
}

List<String> _parseTags(Object? raw) {
  if (raw is! List) return const [];
  return raw
      .whereType<String>()
      .map((tag) => tag.trim())
      .where((tag) => tag.isNotEmpty)
      .toList(growable: false);
}

double? _parseCoordinate(Object? raw) {
  if (raw is num) return raw.toDouble();
  if (raw is String) return double.tryParse(raw.trim());
  return null;
}
