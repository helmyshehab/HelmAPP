import 'package:helm_api_client/helm_api_client.dart';

/// One-shot public country name cache from `listGeoCountries`.
///
/// Fail-soft: network or parse problems yield an empty map so callers can
/// fall back to the ISO country code.
Future<Map<String, String>> loadCountryNameCache(HelmApiClient client) async {
  try {
    final collected = <String, String>{};
    var offset = 0;
    var total = 1 << 30;

    while (offset < total) {
      final response = await client.listGeoCountries(limit: 100, offset: offset);
      final page = parseCountryNames(response);
      collected.addAll(page);

      final rawTotal = response['total'];
      if (rawTotal is int) {
        total = rawTotal;
      } else if (rawTotal is num) {
        total = rawTotal.toInt();
      } else {
        total = collected.length;
      }

      final raw = response['items'];
      final pageCount = raw is List ? raw.length : 0;
      offset += pageCount;
      if (pageCount == 0) break;
    }

    return Map<String, String>.unmodifiable(collected);
  } catch (_) {
    return const {};
  }
}

/// Parses `GeoCountryListResponse`-shaped JSON into uppercased code → nameEn.
Map<String, String> parseCountryNames(Map<String, dynamic> response) {
  final raw = response['items'];
  if (raw is! List) return const {};

  final out = <String, String>{};
  for (final entry in raw) {
    if (entry is! Map) continue;
    final map = Map<String, dynamic>.from(entry);
    final code = (map['code'] as String?)?.trim().toUpperCase();
    final name = (map['nameEn'] as String?)?.trim();
    if (code == null || code.isEmpty) continue;
    if (name == null || name.isEmpty) continue;
    out[code] = name;
  }
  return out;
}
