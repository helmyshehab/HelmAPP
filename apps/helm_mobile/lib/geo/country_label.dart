/// Traveler-facing country label.
///
/// Prefers a cached English name from `listGeoCountries` when provided.
/// Falls back to the trimmed ISO-3166 alpha-2 code from the destination
/// payload. Empty or missing codes yield null.
String? helmCountryLabel(
  String? countryCode, {
  Map<String, String>? namesByCode,
}) {
  final code = countryCode?.trim();
  if (code == null || code.isEmpty) return null;
  final named = namesByCode?[code.toUpperCase()]?.trim();
  if (named != null && named.isNotEmpty) return named;
  return code;
}
