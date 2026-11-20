/// Runtime API configuration for helm_mobile.
///
/// Override at launch with:
/// `flutter run --dart-define=HELM_API_BASE_URL=https://example.com`
class ApiConfig {
  const ApiConfig._();

  /// Base URL for the Helm حلم backend (no trailing slash required).
  static const String apiBaseUrl = String.fromEnvironment(
    'HELM_API_BASE_URL',
    defaultValue: 'https://helm-staging-api-ujqa.onrender.com',
  );
}
