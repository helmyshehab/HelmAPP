/// Traveler-facing country label.
///
/// The public destination payload carries an ISO code and no country name.
/// This app has no region-name API without a new package, so the visible
/// label is the trimmed code.
String? helmCountryLabel(String? countryCode) {
  final code = countryCode?.trim();
  if (code == null || code.isEmpty) return null;
  return code;
}
